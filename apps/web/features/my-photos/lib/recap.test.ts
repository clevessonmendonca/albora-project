import { describe, expect, it } from "vitest";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";
import {
  RECAP_MAXIMO,
  RECAP_MINIMO,
  elegiveisParaRecap,
  idsDoRecap,
  pertenceAoEvento,
  selecionarRecap,
  type CandidataRecap,
} from "./recap";

const EVENTO_A = "11111111-1111-1111-1111-111111111111";
const EVENTO_B = "22222222-2222-2222-2222-222222222222";

function item(sobrescritas: Partial<ItemVisivel> & { id: string }): ItemVisivel {
  return {
    chaveThumb: `events/${EVENTO_A}/thumb`,
    chaveFull: `events/${EVENTO_A}/full`,
    mime: "image/jpeg",
    autor: "Marina",
    legenda: null,
    lugar: null,
    criadaEm: "2026-08-15T20:00:00.000Z",
    ...sobrescritas,
  };
}

function candidata(sobrescritas: Partial<CandidataRecap> & { id: string }): CandidataRecap {
  return {
    chaveFull: `events/${EVENTO_A}/full`,
    mime: "image/jpeg",
    criadaEm: "2026-08-15T20:00:00.000Z",
    reacoes: 0,
    ...sobrescritas,
  };
}

describe("pertenceAoEvento", () => {
  it("aceita chave com o prefixo do evento", () => {
    expect(pertenceAoEvento(`events/${EVENTO_A}/2026/08/x/full`, EVENTO_A)).toBe(true);
  });

  it("recusa chave de outro evento — o gate de isolamento", () => {
    expect(pertenceAoEvento(`events/${EVENTO_B}/2026/08/x/full`, EVENTO_A)).toBe(false);
  });

  it("recusa prefixo parcial (evento A9 não deve casar com A)", () => {
    const eventoQuaseIgual = `${EVENTO_A}9`;
    expect(pertenceAoEvento(`events/${eventoQuaseIgual}/full`, EVENTO_A)).toBe(false);
  });
});

describe("elegiveisParaRecap", () => {
  it("exclui vídeo — o recap é imagem para o story", () => {
    const itens = [
      item({ id: "foto" }),
      item({ id: "video", mime: "video/mp4" }),
    ];
    expect(elegiveisParaRecap(itens, EVENTO_A).map((c) => c.id)).toEqual(["foto"]);
  });

  it("exclui item sem chaveFull (ainda subindo, ou o servidor não confirmou)", () => {
    const itens = [item({ id: "ok" }), item({ id: "sem-chave", chaveFull: "" })];
    expect(elegiveisParaRecap(itens, EVENTO_A).map((c) => c.id)).toEqual(["ok"]);
  });

  it("nunca cruza evento: item com chave de outro evento nunca entra na lista de candidatas", () => {
    const itens = [
      item({ id: "deste-evento" }),
      item({ id: "de-outro-evento", chaveFull: `events/${EVENTO_B}/full` }),
    ];
    expect(elegiveisParaRecap(itens, EVENTO_A).map((c) => c.id)).toEqual(["deste-evento"]);
  });

  it("reacoes ausente conta como zero, não desqualifica a foto", () => {
    const itens = [item({ id: "sem-reacao" })];
    expect(elegiveisParaRecap(itens, EVENTO_A)).toEqual([
      expect.objectContaining({ id: "sem-reacao", reacoes: 0 }),
    ]);
  });
});

describe("selecionarRecap", () => {
  it("abaixo do mínimo, não oferece recap", () => {
    const candidatas = Array.from({ length: RECAP_MINIMO - 1 }, (_, i) =>
      candidata({ id: `f${i}` }),
    );
    expect(selecionarRecap(candidatas)).toEqual([]);
  });

  it("no mínimo, já oferece — com todas as elegíveis", () => {
    const candidatas = Array.from({ length: RECAP_MINIMO }, (_, i) => candidata({ id: `f${i}` }));
    expect(selecionarRecap(candidatas)).toHaveLength(RECAP_MINIMO);
  });

  it("ordena por reação, mais curtida primeiro", () => {
    const candidatas = [
      candidata({ id: "pouca", reacoes: 1 }),
      candidata({ id: "muita", reacoes: 9 }),
      candidata({ id: "media", reacoes: 4 }),
    ];
    expect(selecionarRecap(candidatas)).toEqual(["muita", "media", "pouca"]);
  });

  it("empate em reação desempata pela mais recente", () => {
    const candidatas = [
      candidata({ id: "antiga", reacoes: 2, criadaEm: "2026-08-15T18:00:00.000Z" }),
      candidata({ id: "nova", reacoes: 2, criadaEm: "2026-08-15T22:00:00.000Z" }),
      candidata({ id: "preenche-o-minimo", reacoes: 0 }),
    ];
    expect(selecionarRecap(candidatas)).toEqual(["nova", "antiga", "preenche-o-minimo"]);
  });

  it("corta em RECAP_MAXIMO mesmo com muito mais candidatas", () => {
    const candidatas = Array.from({ length: RECAP_MAXIMO + 5 }, (_, i) =>
      candidata({ id: `f${i}`, reacoes: i }),
    );
    const selecionadas = selecionarRecap(candidatas);
    expect(selecionadas).toHaveLength(RECAP_MAXIMO);
    // as de maior reação (índices mais altos) são as que ficam
    expect(selecionadas).toContain(`f${RECAP_MAXIMO + 4}`);
    expect(selecionadas).not.toContain("f0");
  });
});

describe("idsDoRecap — a composição que as telas chamam", () => {
  it("nunca mistura fotos de dois eventos, mesmo com sinal suficiente dos dois", () => {
    const itens: ItemVisivel[] = [
      ...Array.from({ length: RECAP_MINIMO }, (_, i) => item({ id: `a${i}` })),
      ...Array.from({ length: RECAP_MINIMO }, (_, i) =>
        item({ id: `b${i}`, chaveFull: `events/${EVENTO_B}/full` }),
      ),
    ];

    const doEventoA = idsDoRecap(itens, EVENTO_A);
    expect(doEventoA.every((id) => id.startsWith("a"))).toBe(true);
    expect(doEventoA).toHaveLength(RECAP_MINIMO);
  });

  it("sem fotos suficientes deste evento, não oferece recap mesmo tendo fotos de outro", () => {
    const itens: ItemVisivel[] = [
      item({ id: "unica-deste-evento" }),
      ...Array.from({ length: RECAP_MINIMO + 2 }, (_, i) =>
        item({ id: `outro${i}`, chaveFull: `events/${EVENTO_B}/full` }),
      ),
    ];

    expect(idsDoRecap(itens, EVENTO_A)).toEqual([]);
  });
});
