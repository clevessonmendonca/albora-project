import { describe, expect, it } from "vitest";
import { abrirEstadoOAuthDrive, emitirEstadoOAuthDrive, ErroSegredoDoEstadoOAuthDrive } from "./drive-oauth-state";

const SEGREDO = "um-segredo-de-teste-com-mais-de-32-caracteres";
const OUTRO_SEGREDO = "um-outro-segredo-tambem-com-32-ou-mais-caracteres";

describe("emitirEstadoOAuthDrive / abrirEstadoOAuthDrive", () => {
  it("round-trip: o que foi emitido abre com o mesmo eventId/accountId", () => {
    const estado = emitirEstadoOAuthDrive(SEGREDO, { eventId: "evento-1", accountId: "conta-1" });
    const aberto = abrirEstadoOAuthDrive(SEGREDO, estado);
    expect(aberto).toMatchObject({ eventId: "evento-1", accountId: "conta-1" });
    expect(aberto?.nonce).toBeTruthy();
  });

  it("dois states para o mesmo par (eventId, accountId) têm nonces diferentes", () => {
    const a = emitirEstadoOAuthDrive(SEGREDO, { eventId: "evento-1", accountId: "conta-1" });
    const b = emitirEstadoOAuthDrive(SEGREDO, { eventId: "evento-1", accountId: "conta-1" });
    expect(a).not.toBe(b);
  });

  it("segredo errado nunca abre — a verificação é só HMAC, sem tocar banco", () => {
    const estado = emitirEstadoOAuthDrive(SEGREDO, { eventId: "evento-1", accountId: "conta-1" });
    expect(abrirEstadoOAuthDrive(OUTRO_SEGREDO, estado)).toBeNull();
  });

  it("state adulterado (um caractere trocado no corpo) é recusado", () => {
    const estado = emitirEstadoOAuthDrive(SEGREDO, { eventId: "evento-1", accountId: "conta-1" });
    const [corpo, assinatura] = estado.split(".");
    const corpoAdulterado = corpo!.slice(0, -1) + (corpo!.at(-1) === "a" ? "b" : "a");
    expect(abrirEstadoOAuthDrive(SEGREDO, `${corpoAdulterado}.${assinatura}`)).toBeNull();
  });

  it("formato errado (sem ponto, ou mais de um) é recusado sem estourar", () => {
    expect(abrirEstadoOAuthDrive(SEGREDO, "nao-e-um-state")).toBeNull();
    expect(abrirEstadoOAuthDrive(SEGREDO, "a.b.c")).toBeNull();
    expect(abrirEstadoOAuthDrive(SEGREDO, "")).toBeNull();
  });

  it("TTL de 10 minutos: expira exatamente depois disso", () => {
    const emitidoEm = new Date("2026-08-10T12:00:00Z");
    const estado = emitirEstadoOAuthDrive(SEGREDO, { eventId: "evento-1", accountId: "conta-1" }, emitidoEm);

    const dentroDoTtl = new Date(emitidoEm.getTime() + 10 * 60 * 1000);
    expect(abrirEstadoOAuthDrive(SEGREDO, estado, dentroDoTtl)).not.toBeNull();

    const depoisDoTtl = new Date(emitidoEm.getTime() + 10 * 60 * 1000 + 1);
    expect(abrirEstadoOAuthDrive(SEGREDO, estado, depoisDoTtl)).toBeNull();
  });

  it("um state 'do futuro' (emitidoEm > agora) é recusado — não há como isso ser legítimo", () => {
    const emitidoEm = new Date("2026-08-10T12:00:00Z");
    const estado = emitirEstadoOAuthDrive(SEGREDO, { eventId: "evento-1", accountId: "conta-1" }, emitidoEm);
    const antes = new Date(emitidoEm.getTime() - 1000);
    expect(abrirEstadoOAuthDrive(SEGREDO, estado, antes)).toBeNull();
  });

  it("segredo curto demais falha alto ao emitir e ao abrir", () => {
    expect(() => emitirEstadoOAuthDrive("curto", { eventId: "e", accountId: "c" })).toThrow(
      ErroSegredoDoEstadoOAuthDrive,
    );
    const estado = emitirEstadoOAuthDrive(SEGREDO, { eventId: "e", accountId: "c" });
    expect(() => abrirEstadoOAuthDrive("curto", estado)).toThrow(ErroSegredoDoEstadoOAuthDrive);
  });
});
