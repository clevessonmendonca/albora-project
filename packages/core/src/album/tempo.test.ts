import { describe, expect, it } from "vitest";
import {
  instanteDe,
  horaNoEvento,
  inicioDaHoraNoEvento,
  ehAmanhecer,
  instanteDaParede,
  capituloDe,
  CAPITULO_UNICO,
} from "./tempo";
import type { JanelaDoEvento, MidiaDoAlbum, CapituloPlanejado } from "./types";

const janela: JanelaDoEvento = {
  comecaEm: new Date("2026-09-01T21:00:00Z"),
  terminaEm: new Date("2026-09-02T05:00:00Z"),
};

function midia(overrides: Partial<MidiaDoAlbum> = {}): MidiaDoAlbum {
  return {
    id: "m1",
    capturadaEm: new Date("2026-09-01T23:00:00Z"),
    recebidaEm: new Date("2026-09-01T23:01:00Z"),
    ...overrides,
  } as MidiaDoAlbum;
}

describe("instanteDe", () => {
  it("usa capturadaEm quando dentro da janela", () => {
    const resultado = instanteDe(midia(), janela);
    expect(resultado.em.toISOString()).toBe("2026-09-01T23:00:00.000Z");
    expect(resultado.confiavel).toBe(true);
  });

  it("fallback para recebidaEm quando capturadaEm fora da janela", () => {
    const resultado = instanteDe(
      midia({ capturadaEm: new Date("2025-01-01T00:00:00Z") }),
      janela,
    );
    expect(resultado.em.toISOString()).toBe("2026-09-01T23:01:00.000Z");
    expect(resultado.confiavel).toBe(true);
  });

  it("não confiável quando nenhuma data está na janela", () => {
    const resultado = instanteDe(
      midia({
        capturadaEm: new Date("2020-01-01T00:00:00Z"),
        recebidaEm: new Date("2020-01-01T00:00:00Z"),
      }),
      janela,
    );
    expect(resultado.confiavel).toBe(false);
  });

  it("capturadaEm null usa recebidaEm", () => {
    const resultado = instanteDe(midia({ capturadaEm: null }), janela);
    expect(resultado.confiavel).toBe(true);
  });
});

describe("horaNoEvento", () => {
  it("converte UTC para hora local com offset", () => {
    expect(horaNoEvento(new Date("2026-09-01T23:00:00Z"), -180)).toBe(20);
  });

  it("UTC+0 retorna hora UTC", () => {
    expect(horaNoEvento(new Date("2026-09-01T23:00:00Z"), 0)).toBe(23);
  });
});

describe("inicioDaHoraNoEvento", () => {
  it("trunca para início da hora no fuso", () => {
    const inicio = inicioDaHoraNoEvento(new Date("2026-09-01T23:45:00Z"), -180);
    expect(inicio.getUTCMinutes()).toBe(0);
    expect(inicio.getUTCSeconds()).toBe(0);
  });
});

describe("ehAmanhecer", () => {
  it("identifica horas de amanhecer", () => {
    expect(ehAmanhecer(new Date("2026-09-02T08:00:00Z"), -180)).toBe(true);
  });

  it("horas de noite não são amanhecer", () => {
    expect(ehAmanhecer(new Date("2026-09-01T23:00:00Z"), -180)).toBe(false);
  });
});

describe("instanteDaParede", () => {
  it("subtrai offset para converter parede → instante", () => {
    const parede = new Date("2026-09-01T20:00:00.000Z");
    const instante = instanteDaParede(parede, -180);
    expect(instante.toISOString()).toBe("2026-09-01T23:00:00.000Z");
  });
});

describe("capituloDe", () => {
  it("retorna CAPITULO_UNICO sem capítulos", () => {
    expect(capituloDe(new Date(), [])).toBe(CAPITULO_UNICO);
  });

  it("retorna o capítulo correto por tempo", () => {
    const capitulos: CapituloPlanejado[] = [
      { id: "cerimonia", comecaEm: new Date("2026-09-01T20:00:00Z") },
      { id: "festa", comecaEm: new Date("2026-09-01T22:00:00Z") },
    ];
    expect(capituloDe(new Date("2026-09-01T21:00:00Z"), capitulos)).toBe("cerimonia");
    expect(capituloDe(new Date("2026-09-01T23:00:00Z"), capitulos)).toBe("festa");
  });

  it("retorna primeiro capítulo quando antes de todos", () => {
    const capitulos: CapituloPlanejado[] = [
      { id: "cerimonia", comecaEm: new Date("2026-09-01T20:00:00Z") },
    ];
    expect(capituloDe(new Date("2026-09-01T18:00:00Z"), capitulos)).toBe("cerimonia");
  });
});
