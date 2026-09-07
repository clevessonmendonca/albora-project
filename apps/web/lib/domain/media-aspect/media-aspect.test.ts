import { describe, expect, it } from "vitest";
import { cssAspectRatio, persistedSize } from "./media-aspect";

describe("cssAspectRatio", () => {
  it("paisagem de vídeo vira o aspecto real", () => {
    expect(cssAspectRatio(1920, 1080)).toBe("1920 / 1080");
  });

  it("sem par, o quadro da tela decide o fallback", () => {
    expect(cssAspectRatio(undefined, undefined)).toBeUndefined();
    expect(cssAspectRatio(1920, undefined)).toBeUndefined();
    expect(cssAspectRatio(0, 1080)).toBeUndefined();
  });
});

describe("persistedSize", () => {
  it("aceita o par do confirm", () => {
    expect(persistedSize(1920, 1080)).toEqual({ largura: 1920, altura: 1080 });
  });

  it("recusa um lado só", () => {
    expect(persistedSize(1920, undefined)).toBeNull();
  });
});
