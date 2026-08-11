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
  duracaoSessaoHoras: number;
  /** Host de onde os bytes de mídia saem. Nunca o da aplicação (§4.3 de `docs/security.md`). */
  origemDaMidia: string;
};

let memo: Config | null = null;

export function config(): Config {
  if (memo) return memo;

  const faltando: string[] = [];
  const ler = (nome: string): string => {
    const v = process.env[nome];
    if (!v) faltando.push(nome);
    return v ?? "";
  };

  const sessionSecret = ler("SESSION_SECRET");
  const r2 = {
    contaId: ler("R2_ACCOUNT_ID"),
    accessKeyId: ler("R2_ACCESS_KEY_ID"),
    secretAccessKey: ler("R2_SECRET_ACCESS_KEY"),
    bucket: ler("R2_BUCKET"),
  };

  const c: Config = {
    sessionSecret,
    r2,
    databaseUrl: ler("DATABASE_URL"),
    // A janela do ADR 0004: o convidado tem 48h depois do evento para o que
    // ficou na fila subir. Depois disso o token morre.
    duracaoSessaoHoras: 48,
    origemDaMidia: `${r2.contaId}.r2.cloudflarestorage.com`,
  };

  if (faltando.length > 0) throw new ErroConfig(faltando);

  conferirSeparacaoDeOrigem(c.origemDaMidia);

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
function conferirSeparacaoDeOrigem(origemDaMidia: string): void {
  const raiz = hospedeiro(process.env.APP_ROOT_DOMAIN ?? "");
  const declarado = hospedeiro(process.env.MEDIA_DOMAIN ?? "");

  if (declarado !== "" && raiz === "") {
    throw new ErroOrigemDeMidia(declarado, "MEDIA_DOMAIN definido sem APP_ROOT_DOMAIN");
  }
  if (raiz === "") return;

  for (const host of [origemDaMidia, declarado]) {
    if (host === "") continue;
    if (host === raiz || host.endsWith(`.${raiz}`)) {
      throw new ErroOrigemDeMidia(host, "é a origem da aplicação, ou um subdomínio dela");
    }
  }
}

/**
 * Só o host, em minúsculas e sem porta: cookie não é escopado por porta, então
 * mesma máquina em porta diferente é a mesma origem para o que interessa aqui.
 */
function hospedeiro(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

export class ErroConfig extends Error {
  readonly code = "config.missing";
  constructor(readonly faltando: string[]) {
    super(`configuração ausente: ${faltando.join(", ")}`);
  }
}

export class ErroOrigemDeMidia extends Error {
  readonly code = "config.midia_na_origem_do_app";
  constructor(
    readonly host: string,
    readonly motivo: string,
  ) {
    super(`domínio de mídia inválido (${host}): ${motivo}`);
  }
}
