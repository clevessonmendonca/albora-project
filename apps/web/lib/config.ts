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

  const c: Config = {
    sessionSecret: ler("SESSION_SECRET"),
    r2: {
      contaId: ler("R2_ACCOUNT_ID"),
      accessKeyId: ler("R2_ACCESS_KEY_ID"),
      secretAccessKey: ler("R2_SECRET_ACCESS_KEY"),
      bucket: ler("R2_BUCKET"),
    },
    databaseUrl: ler("DATABASE_URL"),
    // A janela do ADR 0004: o convidado tem 48h depois do evento para o que
    // ficou na fila subir. Depois disso o token morre.
    duracaoSessaoHoras: 48,
  };

  if (faltando.length > 0) throw new ErroConfig(faltando);

  memo = c;
  return c;
}

export class ErroConfig extends Error {
  readonly code = "config.missing";
  constructor(readonly faltando: string[]) {
    super(`configuração ausente: ${faltando.join(", ")}`);
  }
}
