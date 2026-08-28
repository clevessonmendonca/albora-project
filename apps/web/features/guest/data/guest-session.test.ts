import { parseEntryVia } from "@albora/core";
import { describe, expect, it } from "vitest";
import { isSameEventSession } from "./guest-session";

const EVENTO_A = "11111111-1111-1111-1111-111111111111";
const EVENTO_B = "22222222-2222-2222-2222-222222222222";

/** `isSameEventSession`: sem sessão do mesmo evento a raiz cai no `EntryFlow` — consentimento antes de qualquer captura (ADR 0008). */
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

/** A3: `/scan?codigo=` redireciona para a mesma rota `qr`/`wa`/`link`; `isSameEventSession` olha só o `eventoId`, então reentrar por código não repede nome/consentimento. */
describe("reentrada por /scan?codigo= não pergunta nome/consentimento de novo", () => {
  it("'code' é um via válido, não cai em 'link' por engano", () => {
    expect(parseEntryVia("code")).toBe("code");
  });

  it("sessão existente do mesmo evento continua reconhecida entrando por código", () => {
    expect(isSameEventSession({ eventoId: EVENTO_A, sessaoId: "s-1" }, EVENTO_A)).toBe(true);
  });
});
