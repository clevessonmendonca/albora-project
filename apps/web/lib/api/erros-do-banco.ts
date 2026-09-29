/** `23503` — foreign_key_violation. O Postgres usa o mesmo código para toda FK recusada. */
const CHAVE_ESTRANGEIRA = "23503";

export function violacaoDeChaveEstrangeira(erro: unknown): boolean {
  return typeof erro === "object" && erro !== null && (erro as { code?: unknown }).code === CHAVE_ESTRANGEIRA;
}
