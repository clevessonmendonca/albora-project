import { describe, expect, it } from "vitest";
import {
  elegiveisParaRecap,
  idsDoRecap,
  RECAP_MINIMO,
  selecionarRecap,
} from "./recap-select";
import type { MinhaFotoEnviada } from "./my-photos";

const EVENTO = "22222222-2222-2222-2222-222222222222";
const PREFIX = `events/${EVENTO}/`;

function foto(id: string, reacoes: number, criadaEm: string, mime = "image/jpeg"): MinhaFotoEnviada {
  return {
    tipo: "enviada",
    id,
    chaveThumb: `${PREFIX}${id}/thumb`,
    chaveFull: `${PREFIX}${id}/full`,
    mime,
    criadaEm,
    autor: "Ana",
    reacoes,
  };
}

describe("elegiveisParaRecap", () => {
  it("exclui vídeo e chave de outro evento", () => {
    const out = elegiveisParaRecap(
      [
        foto("a", 1, "2025-01-01T00:00:00.000Z"),
        foto("b", 2, "2025-01-02T00:00:00.000Z", "video/mp4"),
        {
          ...foto("c", 3, "2025-01-03T00:00:00.000Z"),
          chaveFull: "events/outro/x/full",
        },
      ],
      EVENTO,
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("a");
  });
});

describe("selecionarRecap", () => {
  it(`retorna vazio abaixo de ${RECAP_MINIMO}`, () => {
    expect(
      selecionarRecap([
        { id: "a", chaveFull: "x", mime: "image/jpeg", criadaEm: "2025-01-01", reacoes: 0 },
        { id: "b", chaveFull: "y", mime: "image/jpeg", criadaEm: "2025-01-02", reacoes: 0 },
      ]),
    ).toEqual([]);
  });

  it("ordena por reações e recência", () => {
    const ids = selecionarRecap([
      { id: "a", chaveFull: "x", mime: "image/jpeg", criadaEm: "2025-01-01", reacoes: 1 },
      { id: "b", chaveFull: "y", mime: "image/jpeg", criadaEm: "2025-01-03", reacoes: 5 },
      { id: "c", chaveFull: "z", mime: "image/jpeg", criadaEm: "2025-01-02", reacoes: 5 },
    ]);
    expect(ids).toEqual(["b", "c", "a"]);
  });
});

describe("idsDoRecap", () => {
  it("compõe elegíveis + seleção", () => {
    expect(
      idsDoRecap(
        [
          foto("a", 0, "2025-01-01T00:00:00.000Z"),
          foto("b", 2, "2025-01-02T00:00:00.000Z"),
          foto("c", 1, "2025-01-03T00:00:00.000Z"),
        ],
        EVENTO,
      ),
    ).toEqual(["b", "c", "a"]);
  });
});
