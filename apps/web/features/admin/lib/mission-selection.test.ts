import { describe, expect, it } from "vitest";
import { moveMissionKey, reorderMissionKeys, toggleMissionKey } from "./mission-selection";

const PACK = ["missao.chegada", "missao.mesa", "missao.danca"] as const;

describe("toggleMissionKey", () => {
  it("liga no fim e desliga sem reordenar o resto", () => {
    expect(toggleMissionKey(["missao.chegada"], "missao.danca", PACK)).toEqual([
      "missao.chegada",
      "missao.danca",
    ]);
    expect(toggleMissionKey(["missao.chegada", "missao.danca"], "missao.chegada", PACK)).toEqual([
      "missao.danca",
    ]);
  });

  it("ignora chave que o pack não tem", () => {
    expect(toggleMissionKey(["missao.mesa"], "missao.valsa", PACK)).toEqual(["missao.mesa"]);
  });
});

describe("moveMissionKey", () => {
  it("sobe e desce dentro da lista ativa", () => {
    expect(moveMissionKey(["a", "b", "c"], "c", -1)).toEqual(["a", "c", "b"]);
    expect(moveMissionKey(["a", "b", "c"], "a", -1)).toEqual(["a", "b", "c"]);
    expect(moveMissionKey(["a", "b", "c"], "c", 1)).toEqual(["a", "b", "c"]);
  });
});

describe("reorderMissionKeys", () => {
  it("solta a missão no lugar do alvo", () => {
    expect(reorderMissionKeys(["a", "b", "c"], "a", "c")).toEqual(["b", "c", "a"]);
    expect(reorderMissionKeys(["a", "b", "c"], "x", "b")).toEqual(["a", "b", "c"]);
  });
});
