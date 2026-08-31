import type { QueueItem } from "@albora/core";
import { MAX_ATTEMPTS } from "@albora/core";
import { describe, expect, it } from "vitest";
import { rotuloEstadoFila } from "./queue-status";

const item = (tentativas = 0): Pick<QueueItem, "tentativas"> => ({ tentativas });

describe("rotuloEstadoFila", () => {
  it("item esgotado mostra falha calma", () => {
    expect(rotuloEstadoFila(item(MAX_ATTEMPTS), {})).toEqual({
      estado: "Guardamos no celular. Vamos tentar de novo.",
      falhou: true,
    });
  });

  it("enviando agora", () => {
    expect(rotuloEstadoFila(item(), { enviandoAgora: true }).estado).toBe("Enviando…");
  });

  it("offline com tentativas", () => {
    expect(rotuloEstadoFila(item(2), { online: false }).estado).toBe("Na fila · sem sinal");
  });

  it("offline na fila", () => {
    expect(rotuloEstadoFila(item(), { online: false }).estado).toBe("Na fila · offline");
  });
});
