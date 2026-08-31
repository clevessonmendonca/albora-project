import { FIFTEEN_YEARS, WEDDING } from "@albora/packs";
import { describe, expect, it } from "vitest";
import {
  moveMissionKey,
  parseMissionKeys,
  reorderMissionKeys,
  toggleMissionKey,
} from "./mission-keys";

const PACK = ["missao.chegada", "missao.mesa", "missao.danca"] as const;

describe("parseMissionKeys", () => {
  it("aceita o recorte do pack, na ordem", () => {
    expect(parseMissionKeys(WEDDING, ["missao.brinde", "missao.chegada"])).toEqual([
      "missao.brinde",
      "missao.chegada",
    ]);
  });

  it("lista vazia é modo livre", () => {
    expect(parseMissionKeys(WEDDING, [])).toEqual([]);
  });

  it("recusa texto livre, id interno, duplicata e missão de outro pack", () => {
    expect(parseMissionKeys(WEDDING, ["A mesa mais cheia"])).toBeNull();
    expect(parseMissionKeys(WEDDING, ["chegada"])).toBeNull();
    expect(parseMissionKeys(WEDDING, ["missao.mesa", "missao.mesa"])).toBeNull();
    expect(parseMissionKeys(WEDDING, ["missao.valsa"])).toBeNull();
    expect(parseMissionKeys(FIFTEEN_YEARS, ["missao.valsa"])).toEqual(["missao.valsa"]);
    expect(parseMissionKeys(WEDDING, "missao.mesa")).toBeNull();
  });
});

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
