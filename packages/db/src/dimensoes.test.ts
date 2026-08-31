import { describe, expect, it } from "vitest";
import { ALTURA_PADRAO, LARGURA_PADRAO, dimensoesDaColuna, dimensoesDoAlbum } from "./dimensoes";

describe("dimensoesDaColuna", () => {
  it("aceita o par persistido", () => {
    expect(dimensoesDaColuna(1920, 1080)).toEqual({ largura: 1920, altura: 1080 });
  });

  it("um lado só não serve", () => {
    expect(dimensoesDaColuna(1920, null)).toBeNull();
    expect(dimensoesDaColuna(null, 1080)).toBeNull();
    expect(dimensoesDaColuna(0, 1080)).toBeNull();
    expect(dimensoesDaColuna(1920, Number.NaN)).toBeNull();
  });
});

describe("dimensoesDoAlbum", () => {
  it("assume retrato quando o confirm não gravou o par", () => {
    expect(dimensoesDoAlbum(null, null)).toEqual({
      largura: LARGURA_PADRAO,
      altura: ALTURA_PADRAO,
    });
  });

  it("paisagem de vídeo não vira 1080×1920", () => {
    expect(dimensoesDoAlbum(1920, 1080)).toEqual({ largura: 1920, altura: 1080 });
  });
});
