import { describe, expect, it } from "vitest";
import { interacaoAberta, modoInteracao } from "./interacao";

const em = (iso: string) => new Date(iso);

describe("gate de interação", () => {
  it("sem horário marcado, fica fechado para sempre", () => {
    // NULL é o padrão da coluna. Um gate que abrisse sozinho por ausência de
    // configuração abriria durante a cerimônia — que é o único momento em que
    // o ADR 0009 garante que ele está fechado.
    expect(interacaoAberta({ interacaoAbreEm: null }, em("2030-01-01T00:00:00Z"))).toBe(false);
    expect(modoInteracao({ interacaoAbreEm: null }, em("2030-01-01T00:00:00Z"))).toBe("espelho");
  });

  it("antes do horário, espelho", () => {
    const evento = { interacaoAbreEm: em("2026-06-01T22:00:00Z") };

    expect(interacaoAberta(evento, em("2026-06-01T21:59:59Z"))).toBe(false);
    expect(modoInteracao(evento, em("2026-06-01T21:59:59Z"))).toBe("espelho");
  });

  it("no instante exato já está aberto", () => {
    const evento = { interacaoAbreEm: em("2026-06-01T22:00:00Z") };

    expect(interacaoAberta(evento, em("2026-06-01T22:00:00Z"))).toBe(true);
    expect(modoInteracao(evento, em("2026-06-01T22:00:00Z"))).toBe("completo");
  });

  it("depois do horário, completo", () => {
    const evento = { interacaoAbreEm: em("2026-06-01T22:00:00Z") };

    expect(modoInteracao(evento, em("2026-06-02T03:00:00Z"))).toBe("completo");
  });
});
