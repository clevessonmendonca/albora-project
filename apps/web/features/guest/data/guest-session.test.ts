import { parseEntryVia } from "@albora/core";
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

/**
 * A3 (código de resgate): `/scan?codigo=` redireciona para `/e/[slug]?via=code`
 * — a MESMA rota que `qr`/`wa`/`link` já usam, nunca um caminho de sessão
 * paralelo. `isSameEventSession` não recebe `via` na assinatura: a decisão de
 * pular o `EntryFlow` e cair direto na Home olha só para `eventoId` da sessão
 * existente, então reentrar por código digitado não repete nome/consentimento
 * — de graça, sem código novo em `/e/[slug]`.
 */
describe("reentrada por /scan?codigo= não pergunta nome/consentimento de novo", () => {
  it("'code' é um via válido, não cai em 'link' por engano", () => {
    expect(parseEntryVia("code")).toBe("code");
  });

  it("sessão existente do mesmo evento continua reconhecida entrando por código", () => {
    expect(isSameEventSession({ eventoId: EVENTO_A, sessaoId: "s-1" }, EVENTO_A)).toBe(true);
  });
});
