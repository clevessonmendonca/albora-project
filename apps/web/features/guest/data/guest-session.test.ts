import { describe, expect, it } from "vitest";
import { isSameEventSession } from "./guest-session";

const EVENTO_A = "11111111-1111-1111-1111-111111111111";
const EVENTO_B = "22222222-2222-2222-2222-222222222222";

/**
 * `isSameEventSession` é a decisão que a raiz `/e/[slug]` usa para escolher
 * entre a Home (stories + feed) e o `EntryFlow` — a mesma escolha que o ADR
 * 0008/CLAUDE.md trata como invariante: sem sessão do mesmo evento, o
 * consentimento continua antes de qualquer captura.
 */
describe("isSameEventSession", () => {
  it("sem sessão, não é a mesma sessão — cai no EntryFlow", () => {
    expect(isSameEventSession(null, EVENTO_A)).toBe(false);
  });

  it("sessão de outro evento — o crachá não é transferível entre festas", () => {
    expect(isSameEventSession({ eventoId: EVENTO_B, sessaoId: "s-1" }, EVENTO_A)).toBe(false);
  });

  it("sessão do mesmo evento — é a Home", () => {
    expect(isSameEventSession({ eventoId: EVENTO_A, sessaoId: "s-1" }, EVENTO_A)).toBe(true);
  });
});
