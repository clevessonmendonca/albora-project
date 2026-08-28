import { describe, expect, it } from "vitest";
import {
  DEFAULT_WALL_MODELS,
  parseWallModels,
  wallModelsChoiceError,
  wallModelsFromTokens,
} from "./wall-models";

describe("parseWallModels", () => {
  it("aceita o recorte conhecido, na ordem", () => {
    expect(parseWallModels(["polaroide", "dump"])).toEqual(["polaroide", "dump"]);
  });

  it("lista vazia é escolha ainda sem modelo", () => {
    expect(parseWallModels([])).toEqual([]);
  });

  it("recusa desconhecido, duplicata e formato errado", () => {
    expect(parseWallModels(["modelo-inexistente"])).toBeNull();
    expect(parseWallModels(["polaroide", "polaroide"])).toBeNull();
    expect(parseWallModels("polaroide")).toBeNull();
    expect(parseWallModels([1])).toBeNull();
  });
});

describe("wallModelsFromTokens", () => {
  it("lê telaoModelos gravado", () => {
    expect(wallModelsFromTokens({ telaoModelos: ["cheio", "mural"] })).toEqual([
      "cheio",
      "mural",
    ]);
  });

  it("cai no recorte do wizard quando falta ou é inválido", () => {
    expect(wallModelsFromTokens({})).toEqual([...DEFAULT_WALL_MODELS]);
    expect(wallModelsFromTokens({ telaoModelos: ["modelo-inexistente"] })).toEqual([
      ...DEFAULT_WALL_MODELS,
    ]);
  });
});

describe("wallModelsChoiceError", () => {
  it("vazio quando a escolha pode ir para a parede", () => {
    expect(wallModelsChoiceError(["polaroide"])).toBeNull();
    expect(wallModelsChoiceError(["cheio", "dump"])).toBeNull();
  });

  it("recusa só Cheio — três de cada quatro fotos nunca apareceriam", () => {
    const erro = wallModelsChoiceError(["cheio"]);
    expect(erro).not.toBeNull();
    expect(erro![0]).toContain("em pé");
  });

  it("recusa lista vazia e valor inválido", () => {
    expect(wallModelsChoiceError([])).toEqual(["nenhum modelo escolhido"]);
    expect(wallModelsChoiceError(["modelo-inexistente"])).toEqual(["modelos da parede inválidos"]);
  });
});
