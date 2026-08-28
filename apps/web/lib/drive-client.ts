/** DriveClient: toda chamada à API do Google aqui — mock no boundary nos testes; escopo mínimo `drive.file`; nunca loga token, e-mail ou código de autorização. */

export type DriveTokens = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
};

export type DriveAccessToken = {
  accessToken: string;
  expiresInSeconds: number;
};

export type DriveQuota = {
  /** `null` quando a conta não relata teto (raro, drive.file não costuma cair aqui). */
  limitBytes: number | null;
  usageBytes: number;
};

export type DriveAbout = {
  email: string | null;
  quota: DriveQuota;
};

export class ErroDriveApi extends Error {
  readonly code: string;
  constructor(
    /** Código do Google (`invalid_grant`, `storageQuotaExceeded`, `insufficientPermissions`...) — nunca o corpo cru da resposta. */
    code: string,
    readonly status: number,
  ) {
    super(`Drive API: ${code} (HTTP ${status})`);
    this.code = code;
  }
}

export interface DriveClient {
  /** Troca `code` por tokens — server-to-server, nunca do cliente (spec §1.3). */
  exchangeCode(code: string, redirectUri: string): Promise<DriveTokens>;
  /** Access token dura ~1h e nunca é guardado — recalculado por request (spec §1.5). */
  refreshAccessToken(refreshToken: string): Promise<DriveAccessToken>;
  createFolder(accessToken: string, name: string): Promise<{ folderId: string }>;
  getAbout(accessToken: string): Promise<DriveAbout>;
  /** Sessão resumível (spec §7) — inicia e envia o conteúdo inteiro numa chamada; o encadeamento por lote fica na fila (fase seguinte). */
  uploadFile(
    accessToken: string,
    folderId: string,
    filename: string,
    mime: string,
    bytes: Uint8Array,
  ): Promise<{ fileId: string }>;
  /** Variante streaming — envia sem bufferizar o arquivo inteiro na memória. */
  uploadFileStream?(
    accessToken: string,
    folderId: string,
    filename: string,
    mime: string,
    size: number,
    body: ReadableStream<Uint8Array>,
  ): Promise<{ fileId: string }>;
  revoke(refreshToken: string): Promise<void>;
}

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

async function codigoDeErro(res: Response): Promise<string> {
  try {
    const corpo = (await res.json()) as { error?: { errors?: { reason?: string }[] } | string };
    if (typeof corpo.error === "string") return corpo.error;
    return corpo.error?.errors?.[0]?.reason ?? `http_${res.status}`;
  } catch {
    return `http_${res.status}`;
  }
}

export function googleDriveClient(clientId: string, clientSecret: string): DriveClient {
  return {
    async exchangeCode(code, redirectUri) {
      const res = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      if (!res.ok) throw new ErroDriveApi(await codigoDeErro(res), res.status);
      const corpo = (await res.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
      };
      if (!corpo.refresh_token) {
        // Sem `prompt=consent` o Google só reemite refresh_token na primeira
        // autorização — a rota de connect sempre manda `prompt=consent`
        // exatamente para nunca cair aqui.
        throw new ErroDriveApi("refresh_token_ausente", res.status);
      }
      return {
        accessToken: corpo.access_token,
        refreshToken: corpo.refresh_token,
        expiresInSeconds: corpo.expires_in,
      };
    },

    async refreshAccessToken(refreshToken) {
      const res = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
        }),
      });
      if (!res.ok) throw new ErroDriveApi(await codigoDeErro(res), res.status);
      const corpo = (await res.json()) as { access_token: string; expires_in: number };
      return { accessToken: corpo.access_token, expiresInSeconds: corpo.expires_in };
    },

    async createFolder(accessToken, name) {
      const res = await fetch(`${DRIVE_API}/files?fields=id`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" }),
      });
      if (!res.ok) throw new ErroDriveApi(await codigoDeErro(res), res.status);
      const corpo = (await res.json()) as { id: string };
      return { folderId: corpo.id };
    },

    async getAbout(accessToken) {
      const res = await fetch(
        `${DRIVE_API}/about?fields=${encodeURIComponent("storageQuota,user(emailAddress)")}`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new ErroDriveApi(await codigoDeErro(res), res.status);
      const corpo = (await res.json()) as {
        storageQuota?: { limit?: string; usage?: string };
        user?: { emailAddress?: string };
      };
      return {
        email: corpo.user?.emailAddress ?? null,
        quota: {
          limitBytes: corpo.storageQuota?.limit ? Number(corpo.storageQuota.limit) : null,
          usageBytes: Number(corpo.storageQuota?.usage ?? 0),
        },
      };
    },

    async uploadFile(accessToken, folderId, filename, mime, bytes) {
      const iniciar = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=resumable&fields=id`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json; charset=UTF-8",
          "x-upload-content-type": mime,
          "x-upload-content-length": String(bytes.byteLength),
        },
        body: JSON.stringify({ name: filename, parents: [folderId] }),
      });
      if (!iniciar.ok) throw new ErroDriveApi(await codigoDeErro(iniciar), iniciar.status);

      const sessionUrl = iniciar.headers.get("location");
      if (!sessionUrl) throw new ErroDriveApi("sessao_resumivel_sem_location", iniciar.status);

      const envio = await fetch(sessionUrl, {
        method: "PUT",
        headers: { "content-type": mime, "content-length": String(bytes.byteLength) },
        body: Buffer.from(bytes),
      });
      if (!envio.ok) throw new ErroDriveApi(await codigoDeErro(envio), envio.status);
      const corpo = (await envio.json()) as { id: string };
      return { fileId: corpo.id };
    },

    async uploadFileStream(accessToken, folderId, filename, mime, size, body) {
      const iniciar = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=resumable&fields=id`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json; charset=UTF-8",
          "x-upload-content-type": mime,
          "x-upload-content-length": String(size),
        },
        body: JSON.stringify({ name: filename, parents: [folderId] }),
      });
      if (!iniciar.ok) throw new ErroDriveApi(await codigoDeErro(iniciar), iniciar.status);

      const sessionUrl = iniciar.headers.get("location");
      if (!sessionUrl) throw new ErroDriveApi("sessao_resumivel_sem_location", iniciar.status);

      const envio = await fetch(sessionUrl, {
        method: "PUT",
        headers: { "content-type": mime, "content-length": String(size) },
        body,
        // @ts-expect-error -- Node 22+ / undici aceita ReadableStream; a tipagem do DOM ainda não reflete
        duplex: "half",
      });
      if (!envio.ok) throw new ErroDriveApi(await codigoDeErro(envio), envio.status);
      const corpo = (await envio.json()) as { id: string };
      return { fileId: corpo.id };
    },

    async revoke(refreshToken) {
      // Corpo, nunca querystring: evita o token em log de acesso/proxy, e o
      // endpoint do Google aceita as duas formas igualmente.
      const res = await fetch(REVOKE_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: refreshToken }),
      });
      // Google devolve 200 mesmo se o token já não valia — idempotente por
      // desenho. Só um erro de rede/5xx é reportado; nunca derruba a
      // desconexão do admin por causa disso.
      if (!res.ok && res.status < 500) throw new ErroDriveApi(await codigoDeErro(res), res.status);
    },
  };
}
