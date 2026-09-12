import { describe, expect, it } from "vitest";
import type { WallDisplayModel } from "@albora/core";
import { MODEL_NAMES, profileText } from "./wall-utils";

describe("MODEL_NAMES", () => {
  it("mapeia todos os modelos de telão", () => {
    const modelos: WallDisplayModel[] = [
      "polaroide", "mural", "colagem", "ambiente", "cheio",
      "carrossel", "dump", "tbt", "grade", "destaque", "mosaico",
    ];
    for (const m of modelos) {
      expect(MODEL_NAMES[m]).toBeTruthy();
    }
  });
});

describe("profileText", () => {
  it("singular quando 1 foto", () => {
    const texto = profileText("polaroide");
    expect(texto).toMatch(/^1 foto/);
  });

  it("plural quando > 1 foto", () => {
    const texto = profileText("colagem");
    expect(texto).toMatch(/^\d+ fotos/);
  });

  it("indica orientação aceita (em pé / só deitada)", () => {
    const texto = profileText("polaroide");
    expect(texto).toMatch(/em pé|só deitada/);
  });

  it("todos os modelos geram texto válido", () => {
    const modelos = Object.keys(MODEL_NAMES) as WallDisplayModel[];
    for (const m of modelos) {
      const texto = profileText(m);
      expect(texto).toMatch(/·/);
    }
  });
});
