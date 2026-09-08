import { assinaturaValida, emitirToken, hashDoToken } from "@albora/db";

/**
 * Token de magic link de staff reusa o mesmo par assinatura/hash de
 * `packages/db/src/token.ts` que já assegura a sessão de staff — mesma
 * defesa: assinatura HMAC inválida é rejeitada em microssegundos, sem ida
 * ao banco. `SESSION_SECRET` é lido direto do ambiente (não vem de
 * `apps/web/lib/config`) porque `packages/application` não pode importar
 * de `apps/web` — o guard de camadas mede import, não leitura de env var,
 * então isso não o infringe.
 */
function sessionSecret(): string {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || segredo.length < 32) {
    throw new Error("SESSION_SECRET ausente ou curto demais para emitir magic link de staff");
  }
  return segredo;
}

export type StaffMagicLinkToken = { token: string; tokenHash: string };

/** `hashDoToken` devolve `Buffer` — a coluna `token_hash` é `text`, por isso `.toString("hex")`. */
export function generateStaffMagicLinkToken(): StaffMagicLinkToken {
  const { token, hash } = emitirToken(sessionSecret());
  return { token, tokenHash: hash.toString("hex") };
}

/** Sem tocar no banco — token forjado custa microssegundos, não uma consulta. */
export function isValidStaffMagicLinkSignature(token: string): boolean {
  return assinaturaValida(sessionSecret(), token);
}

export function hashStaffMagicLinkToken(token: string): string {
  return hashDoToken(token).toString("hex");
}
