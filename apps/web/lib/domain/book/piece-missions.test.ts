import { FIFTEEN_YEARS, WEDDING } from "@albora/packs";
import { describe, expect, it } from "vitest";
import {
  highlightedMissions,
  missionCap,
  missionTitlesForPrint,
  PLATE_MISSION_CAP,
  TABLE_CARD_MISSION_CAP,
} from "./piece-missions";

describe("missionTitlesForPrint", () => {
  it("resolve as chaves do editor casamento, na ordem, sem inventar texto", () => {
    expect(
      missionTitlesForPrint(WEDDING, [
        "missao.chegada",
        "missao.mesa",
        "missao.danca",
        "missao.brinde",
      ]),
    ).toEqual([
      "A chegada de quem você não via há tempos",
      "A sua mesa, do jeito que ela está agora",
      "Alguém dançando como se ninguém visse",
      "O brinde, no instante do brinde",
    ]);
  });

  it("recusa texto livre e chave que o pack não tem", () => {
    expect(missionTitlesForPrint(WEDDING, ["A mesa mais cheia"])).toEqual([]);
    expect(missionTitlesForPrint(WEDDING, ["missao.valsa"])).toEqual([]);
    expect(missionTitlesForPrint(WEDDING, ["chegada"])).toEqual([]);
    expect(
      missionTitlesForPrint(WEDDING, ["missao.brinde", "texto inventado", "missao.chegada"]),
    ).toEqual(["O brinde, no instante do brinde", "A chegada de quem você não via há tempos"]);
  });

  it("trocar o pack troca os títulos, sem tocar no gerador", () => {
    expect(missionTitlesForPrint(FIFTEEN_YEARS, ["missao.chegada", "missao.valsa", "missao.pista"])).toEqual(
      ["A entrada, com a música alta", "A valsa, de onde você estiver", "A pista quando ela enche"],
    );
    expect(missionTitlesForPrint(FIFTEEN_YEARS, ["missao.brinde"])).toEqual([]);
  });

  it("sem pack não imprime nada", () => {
    expect(missionTitlesForPrint(undefined, ["missao.chegada"])).toEqual([]);
  });
});

describe("highlightedMissions", () => {
  const oito = ["um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito"];

  it("a placa cabe no máximo 6; o card de mesa, 4; o de missão não lista", () => {
    expect(missionCap("placa-a4")).toBe(PLATE_MISSION_CAP);
    expect(missionCap("card-de-mesa")).toBe(TABLE_CARD_MISSION_CAP);
    expect(missionCap("card-de-missao")).toBe(0);

    expect(highlightedMissions("placa-a4", oito)).toEqual(oito.slice(0, 6));
    expect(highlightedMissions("card-de-mesa", oito)).toEqual(oito.slice(0, 4));
    expect(highlightedMissions("card-de-missao", oito)).toEqual([]);
  });

  it("menos missões do que o teto: imprime as que tem, não completa", () => {
    expect(highlightedMissions("placa-a4", ["só uma"])).toEqual(["só uma"]);
    expect(highlightedMissions("placa-a4", [])).toEqual([]);
  });
});
