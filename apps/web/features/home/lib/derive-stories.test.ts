import { describe, expect, it } from "vitest";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";
import { deriveStories } from "./derive-stories";

function item(overrides: Partial<ItemVisivel> & { id: string; autor: string; chaveThumb: string }): ItemVisivel {
  return {
    chaveFull: "full",
    mime: "image/jpeg",
    legenda: null,
    lugar: null,
    criadaEm: "2026-08-17T23:00:00.000Z",
    ...overrides,
  };
}

describe("deriveStories", () => {
  it("um item por autor, mantendo a ordem de chegada (mais recente primeiro)", () => {
    const itens = [
      item({ id: "1", autor: "Bia", sessaoAutor: "s-bia", chaveThumb: "t1" }),
      item({ id: "2", autor: "João", sessaoAutor: "s-joao", chaveThumb: "t2" }),
      item({ id: "3", autor: "Bia", sessaoAutor: "s-bia", chaveThumb: "t3" }),
    ];

    expect(deriveStories(itens)).toEqual([
      { id: "s-bia", nome: "Bia", chaveThumb: "t1" },
      { id: "s-joao", nome: "João", chaveThumb: "t2" },
    ]);
  });

  it("antes do gate, sem sessaoAutor, agrupa pelo nome do autor", () => {
    const itens = [
      item({ id: "1", autor: "Bia", chaveThumb: "t1" }),
      item({ id: "2", autor: "Bia", chaveThumb: "t2" }),
    ];

    expect(deriveStories(itens)).toEqual([{ id: "Bia", nome: "Bia", chaveThumb: "t1" }]);
  });

  it("respeita o limite de doze pessoas", () => {
    const itens = Array.from({ length: 20 }, (_, i) =>
      item({ id: String(i), autor: `Pessoa ${i}`, sessaoAutor: `s-${i}`, chaveThumb: `t${i}` }),
    );

    expect(deriveStories(itens)).toHaveLength(12);
  });

  it("feed vazio devolve lista vazia", () => {
    expect(deriveStories([])).toEqual([]);
  });
});
