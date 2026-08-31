import { afterEach, describe, expect, it, vi } from "vitest";
import { ErroDriveApi, googleDriveClient } from "./drive-client";

const client = googleDriveClient("client-id", "client-secret");

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init)),
  );
}

describe("googleDriveClient — mock no boundary, nunca chamada de rede real", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exchangeCode troca o code por tokens, server-to-server", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("https://oauth2.googleapis.com/token");
      const body = new URLSearchParams(String(init?.body));
      expect(body.get("code")).toBe("auth-code");
      expect(body.get("grant_type")).toBe("authorization_code");
      expect(body.get("redirect_uri")).toBe("https://albora.app/callback");
      return Response.json({ access_token: "at-1", refresh_token: "rt-1", expires_in: 3600 });
    });

    const tokens = await client.exchangeCode("auth-code", "https://albora.app/callback");
    expect(tokens).toEqual({ accessToken: "at-1", refreshToken: "rt-1", expiresInSeconds: 3600 });
  });

  it("exchangeCode sem refresh_token na resposta estoura — nunca aceita conexão incompleta", async () => {
    mockFetch(() => Response.json({ access_token: "at-1", expires_in: 3600 }));
    await expect(client.exchangeCode("auth-code", "https://albora.app/callback")).rejects.toBeInstanceOf(
      ErroDriveApi,
    );
  });

  it("exchangeCode com erro do Google propaga o código, nunca o corpo cru", async () => {
    mockFetch(() =>
      Response.json({ error: "invalid_grant" }, { status: 400 }),
    );
    const erro = await client.exchangeCode("codigo-usado-duas-vezes", "https://a.b/callback").catch((e) => e);
    expect(erro).toBeInstanceOf(ErroDriveApi);
    expect((erro as ErroDriveApi).code).toBe("invalid_grant");
  });

  it("refreshAccessToken nunca guarda o access token — só devolve pra uso imediato", async () => {
    mockFetch((url, init) => {
      const body = new URLSearchParams(String(init?.body));
      expect(body.get("grant_type")).toBe("refresh_token");
      expect(body.get("refresh_token")).toBe("rt-1");
      expect(url).toBe("https://oauth2.googleapis.com/token");
      return Response.json({ access_token: "at-novo", expires_in: 3599 });
    });

    const r = await client.refreshAccessToken("rt-1");
    expect(r).toEqual({ accessToken: "at-novo", expiresInSeconds: 3599 });
  });

  it("createFolder pede mimeType de pasta e devolve o id", async () => {
    mockFetch((url, init) => {
      expect(url).toContain("https://www.googleapis.com/drive/v3/files");
      expect(JSON.parse(String(init?.body))).toEqual({
        name: "Álbum — Ana & Bruno — Albora",
        mimeType: "application/vnd.google-apps.folder",
      });
      return Response.json({ id: "folder-123" });
    });

    expect(await client.createFolder("at", "Álbum — Ana & Bruno — Albora")).toEqual({
      folderId: "folder-123",
    });
  });

  it("getAbout devolve quota e e-mail — nunca faz nada além de ler", async () => {
    mockFetch((url) => {
      expect(url).toContain("/about?fields=");
      return Response.json({
        storageQuota: { limit: "16106127360", usage: "1000000" },
        user: { emailAddress: "casal@exemplo.test" },
      });
    });

    const about = await client.getAbout("at");
    expect(about).toEqual({
      email: "casal@exemplo.test",
      quota: { limitBytes: 16106127360, usageBytes: 1000000 },
    });
  });

  it("uploadFile inicia sessão resumível e envia os bytes na location devolvida", async () => {
    let chamadas = 0;
    mockFetch((url, init) => {
      chamadas += 1;
      if (chamadas === 1) {
        expect(url).toContain("uploadType=resumable");
        expect(init?.headers).toMatchObject({ "x-upload-content-type": "image/jpeg" });
        return new Response(null, {
          status: 200,
          headers: { location: "https://upload.example/session-xyz" },
        });
      }
      expect(url).toBe("https://upload.example/session-xyz");
      expect(init?.method).toBe("PUT");
      return Response.json({ id: "file-1" });
    });

    const bytes = new Uint8Array([1, 2, 3]);
    expect(await client.uploadFile("at", "folder-1", "foto.jpg", "image/jpeg", bytes)).toEqual({
      fileId: "file-1",
    });
    expect(chamadas).toBe(2);
  });

  it("uploadFile sem header location na resposta de início estoura, nunca segue com upload cego", async () => {
    mockFetch(() => new Response(null, { status: 200 }));
    await expect(
      client.uploadFile("at", "folder-1", "foto.jpg", "image/jpeg", new Uint8Array([1])),
    ).rejects.toBeInstanceOf(ErroDriveApi);
  });

  it("quota esgotada no meio do upload propaga storageQuotaExceeded", async () => {
    let chamadas = 0;
    mockFetch((_url) => {
      chamadas += 1;
      if (chamadas === 1) {
        return new Response(null, { status: 200, headers: { location: "https://upload.example/s" } });
      }
      return Response.json(
        { error: { errors: [{ reason: "storageQuotaExceeded" }] } },
        { status: 403 },
      );
    });

    const erro = await client
      .uploadFile("at", "folder-1", "foto.jpg", "image/jpeg", new Uint8Array([1]))
      .catch((e) => e);
    expect(erro).toBeInstanceOf(ErroDriveApi);
    expect((erro as ErroDriveApi).code).toBe("storageQuotaExceeded");
  });

  it("revoke manda o token no corpo, nunca na querystring (não vaza em log de acesso)", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("https://oauth2.googleapis.com/revoke");
      const body = new URLSearchParams(String(init?.body));
      expect(body.get("token")).toBe("rt-ja-revogado");
      return new Response(null, { status: 200 });
    });
    await expect(client.revoke("rt-ja-revogado")).resolves.toBeUndefined();
  });

  it("revoke propaga erro 4xx, mas nunca deriva de 5xx do Google (rede instável)", async () => {
    mockFetch(() => Response.json({ error: "invalid_token" }, { status: 400 }));
    await expect(client.revoke("rt")).rejects.toBeInstanceOf(ErroDriveApi);

    mockFetch(() => new Response(null, { status: 500 }));
    await expect(client.revoke("rt")).resolves.toBeUndefined();
  });
});
