import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, type QueueItem } from "@albora/core";
import { linhasDaFila, rotuloEstadoFila, tipoMidiaFila } from "./queue-status";

function item(over: Partial<QueueItem> = {}): QueueItem {
  return {
    id: "a",
    eventoId: "e",
    corpo: { tipo: "arquivo", caminho: "/tmp/a.jpg", bytes: 1 },
    mime: "image/jpeg",
    criadoEm: 1000,
    tentativas: 0,
    ...over,
  };
}

describe("tipoMidiaFila", () => {
  it("vídeo", () => {
    expect(tipoMidiaFila("video/mp4")).toBe("Vídeo");
  });

  it("foto", () => {
    expect(tipoMidiaFila("image/jpeg")).toBe("Foto");
  });
});

describe("rotuloEstadoFila", () => {
  it("falhou após MAX_ATTEMPTS", () => {
    expect(rotuloEstadoFila(item({ tentativas: MAX_ATTEMPTS }), {})).toEqual({
      estado: "Falhou · tentar de novo",
      falhou: true,
    });
  });

  it("enviando no topo", () => {
    expect(rotuloEstadoFila(item(), { enviandoAgora: true }).estado).toBe("Enviando…");
  });

  it("sem sinal após retry", () => {
    expect(rotuloEstadoFila(item({ tentativas: 2 }), {}).estado).toBe("Na fila · sem sinal");
  });
});

describe("linhasDaFila", () => {
  it("ordena por criadoEm desc", () => {
    const linhas = linhasDaFila(
      [item({ id: "1", criadoEm: 1 }), item({ id: "2", criadoEm: 99 })],
      {},
    );
    expect(linhas.map((l) => l.id)).toEqual(["2", "1"]);
  });
});
