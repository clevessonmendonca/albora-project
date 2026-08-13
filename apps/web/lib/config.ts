/**
 * Config validada na entrada, não no primeiro uso.
 *
 * Falta de segredo tem de quebrar onde se lê o log de deploy, não no meio de
 * um upload de sábado às 20h. E `SESSION_SECRET` ausente é pior que erro: o
 * token passaria a ser forjável e nada no comportamento denunciaria.
 */

export type Config = {
  sessionSecret: string;
  r2: { contaId: string; accessKeyId: string; secretAccessKey: string; bucket: string };
  databaseUrl: string;
  sessionDurationHours: number;
  /** Host de onde os bytes de mídia saem. Nunca o da aplicação (§4.3 de `docs/security.md`). */
  mediaOrigin: string;
  /** @deprecated use sessionDurationHours */
  duracaoSessaoHoras: number;
  /** @deprecated use mediaOrigin */
  origemDaMidia: string;
};

let memo: Config | null = null;

export function config(): Config {
  if (memo) return memo;

  const missing: string[] = [];
  const readEnv = (name: string): string => {
    const value = process.env[name];
    if (!value) missing.push(name);
    return value ?? "";
  };

  const sessionSecret = readEnv("SESSION_SECRET");
  const r2 = {
    contaId: readEnv("R2_ACCOUNT_ID"),
    accessKeyId: readEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: readEnv("R2_SECRET_ACCESS_KEY"),
    bucket: readEnv("R2_BUCKET"),
  };

  const sessionDurationHours = 48;
  const mediaOrigin = `${r2.contaId}.r2.cloudflarestorage.com`;

  const c: Config = {
    sessionSecret,
    r2,
    databaseUrl: readEnv("DATABASE_URL"),
    // A janela do ADR 0004: o convidado tem 48h depois do evento para o que
    // ficou na fila subir. Depois disso o token morre.
    sessionDurationHours,
    mediaOrigin,
    duracaoSessaoHoras: sessionDurationHours,
    origemDaMidia: mediaOrigin,
  };

  if (missing.length > 0) throw new ConfigError(missing);

  checkOriginSeparation(c.mediaOrigin);

  memo = c;
  return c;
}

/**
 * Recusa subir se a mídia puder sair da origem da aplicação.
 *
 * Arquivo de convidado servido da origem do app roda com os cookies do app:
 * é XSS armazenado com alcance de festa inteira (§4.3 de `docs/security.md`).
 * Subdomínio do domínio raiz conta como a mesma coisa, porque cada evento é um
 * `<slug>.<raiz>` — um domínio de mídia ali colide com o slug de mesmo nome e
 * **se torna** a origem do app.
 *
 * `MEDIA_DOMAIN` ainda não assina nada nesta fase, e é conferido de todo jeito:
 * o guard tem de existir antes do dia em que alguém ligar o knob, não depois.
 */
function checkOriginSeparation(mediaOrigin: string): void {
  const root = parseHost(process.env.APP_ROOT_DOMAIN ?? "");
  const declared = parseHost(process.env.MEDIA_DOMAIN ?? "");

  if (declared !== "" && root === "") {
    throw new MediaOriginError(declared, "MEDIA_DOMAIN definido sem APP_ROOT_DOMAIN");
  }
  if (root === "") return;

  for (const host of [mediaOrigin, declared]) {
    if (host === "") continue;
    if (host === root || host.endsWith(`.${root}`)) {
      throw new MediaOriginError(host, "é a origem da aplicação, ou um subdomínio dela");
    }
  }
}

/**
 * Só o host, em minúsculas e sem porta: cookie não é escopado por porta, então
 * mesma máquina em porta diferente é a mesma origem para o que interessa aqui.
 */
function parseHost(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export class ConfigError extends Error {
  readonly code = "config.missing";
  readonly missing: string[];
  /** @deprecated use missing */
  readonly faltando: string[];
  constructor(missing: string[]) {
    super(`configuração ausente: ${missing.join(", ")}`);
    this.missing = missing;
    this.faltando = missing;
  }
}

export class MediaOriginError extends Error {
  readonly code = "config.midia_na_origem_do_app";
  readonly host: string;
  readonly reason: string;
  /** @deprecated use reason */
  readonly motivo: string;
  constructor(host: string, reason: string) {
    super(`domínio de mídia inválido (${host}): ${reason}`);
    this.host = host;
    this.reason = reason;
    this.motivo = reason;
  }
}

/** @deprecated use ConfigError */
export const ErroConfig = ConfigError;

/** @deprecated use MediaOriginError */
export const ErroOrigemDeMidia = MediaOriginError;
