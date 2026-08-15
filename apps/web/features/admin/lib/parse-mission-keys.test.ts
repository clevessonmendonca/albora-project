import { FIFTEEN_YEARS, WEDDING } from "@albora/packs";
import { describe, expect, it } from "vitest";
import { parseMissionKeys } from "./parse-mission-keys";

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
