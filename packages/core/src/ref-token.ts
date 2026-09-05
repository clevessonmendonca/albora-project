/**
 * Formato público do ref de compartilhamento: exatamente 24 chars [A-Za-z0-9]
 * (o alfabeto de 62 e o tamanho vivem em `@albora/db` share-attribution, que
 * gera o token). Puro e sem dependência: vale em client, edge e server.
 */
export const REF_TOKEN_RE = /^[A-Za-z0-9]{24}$/;

export function isRefToken(v: unknown): v is string {
  return typeof v === "string" && REF_TOKEN_RE.test(v);
}
