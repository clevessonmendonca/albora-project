import { describe, expect, it } from "vitest";
import type { MidiaNaParede } from "@albora/db";
import { paraVitrinePublica } from "./strip-pii";

function midia(overrides: Partial<MidiaNaParede> = {}): MidiaNaParede {
  return {
    id: "midia-1",
    chaveFull: "events/evt/full/midia-1.jpg",
    chaveThumb: "events/evt/thumb/midia-1.jpg",
    mime: "image/jpeg",
    autor: "Fulana",
    criadaEm: new Date("2026-08-15T22:00:00.000Z"),
    reacoes: 4,
    ...overrides,
  };
}

describe("paraVitrinePublica", () => {
  it("nunca leva o nome de quem enviou", () => {
    const [foto] = paraVitrinePublica([midia({ autor: "Fulana da Silva" })]);

    expect(foto).not.toHaveProperty("autor");
    expect(JSON.stringify(foto)).not.toContain("Fulana");
  });

  it("nunca leva a chave da mídia original, o mime nem a contagem de reações", () => {
    const [foto] = paraVitrinePublica([midia()]);

    expect(foto).not.toHaveProperty("chaveFull");
    expect(foto).not.toHaveProperty("mime");
    expect(foto).not.toHaveProperty("reacoes");
    expect(foto).not.toHaveProperty("criadaEm");
  });

  it("preserva id e chave da thumb, únicos campos que a vitrine precisa", () => {
    const [foto] = paraVitrinePublica([midia({ id: "midia-9", chaveThumb: "events/evt/thumb/9.jpg" })]);

    expect(foto).toEqual({ id: "midia-9", chaveThumb: "events/evt/thumb/9.jpg" });
  });

  it("preserva largura/altura só quando as duas existem", () => {
    const [comDimensao] = paraVitrinePublica([midia({ largura: 1080, altura: 1350 })]);
    expect(comDimensao).toMatchObject({ largura: 1080, altura: 1350 });

    const [semDimensao] = paraVitrinePublica([midia()]);
    expect(semDimensao).not.toHaveProperty("largura");
    expect(semDimensao).not.toHaveProperty("altura");
  });

  it("lista vazia devolve lista vazia", () => {
    expect(paraVitrinePublica([])).toEqual([]);
  });
});
