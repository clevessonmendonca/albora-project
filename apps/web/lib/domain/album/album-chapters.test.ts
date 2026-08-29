import { describe, expect, it } from "vitest";
import {
  CAPITULO_CONFESSIONARIO,
  CAPITULO_SEM_HORA,
  CAPITULO_UNICO,
  OFFSET_PADRAO_MINUTOS,
  capituloDe,
  type JanelaDoEvento,
} from "@albora/core";
import { CASAMENTO, QUINZE_ANOS } from "@albora/packs";
import {
  chapterHeadingVisible,
  chapterIdsFromPack,
  chapterTitle,
  planAlbumChapters,
} from "./album-chapters";

const JANELA: JanelaDoEvento = {
  comecaEm: new Date("2026-08-08T22:00:00Z"),
  terminaEm: new Date("2026-08-09T09:00:00Z"),
  offsetMinutos: OFFSET_PADRAO_MINUTOS,
};

describe("os capítulos do álbum saem do pack e da janela", () => {
  it("casamento usa os momentos da noite, e o último começa no amanhecer", () => {
    const ids = chapterIdsFromPack(CASAMENTO);
    expect(ids).toEqual([
      "antes",
      "cerimonia",
      "recepcao",
      "coquetel",
      "jantar",
      "pista",
      "depois",
    ]);

    const plano = planAlbumChapters(JANELA, CASAMENTO);
    expect(plano.map((c) => c.id)).toEqual(ids);
    expect(plano[0]?.comecaEm.toISOString()).toBe(JANELA.comecaEm.toISOString());
    expect(plano.at(-1)?.comecaEm.toISOString()).toBe("2026-08-09T08:00:00.000Z");
  });

  it("trocar o pack troca os capítulos, sem string de casamento no quinze anos", () => {
    const ids = chapterIdsFromPack(QUINZE_ANOS);
    expect(ids).toEqual(["antes", "entrada", "valsa", "jantar", "pista", "depois"]);
    expect(ids).not.toContain("cerimonia");

    const plano = planAlbumChapters(JANELA, QUINZE_ANOS);
    expect(capituloDe(new Date("2026-08-08T22:10:00Z"), plano)).toBe("antes");
    expect(capituloDe(new Date("2026-08-09T08:10:00Z"), plano)).toBe("depois");
  });

  it("pack sem momentos não inventa capítulo — a montagem cai na noite inteira", () => {
    expect(chapterIdsFromPack(undefined)).toEqual([]);
    expect(planAlbumChapters(JANELA, undefined)).toEqual([]);
  });

  it("confessionário não entra na fatia por hora — é virtual no núcleo", () => {
    expect(chapterIdsFromPack(CASAMENTO)).not.toContain(CAPITULO_CONFESSIONARIO);
    expect(planAlbumChapters(JANELA, CASAMENTO).map((c) => c.id)).not.toContain(
      CAPITULO_CONFESSIONARIO,
    );
  });
});

describe("o título que o convidado lê", () => {
  it("resolve o momento pelo vocabulário do pack", () => {
    expect(chapterTitle(CASAMENTO, "cerimonia")).toBe("A cerimônia");
    expect(chapterTitle(CASAMENTO, "antes")).toBe("Antes de tudo");
    expect(chapterTitle(QUINZE_ANOS, "entrada")).toBe("A entrada");
    expect(chapterTitle(QUINZE_ANOS, "valsa")).toBe("A valsa");
  });

  it("a noite inteira e a faixa sem hora têm copy do álbum, não do vertical", () => {
    expect(chapterTitle(CASAMENTO, CAPITULO_UNICO)).toBe("A noite");
    expect(chapterTitle(CASAMENTO, CAPITULO_SEM_HORA)).toBe("Durante a festa");
    expect(chapterHeadingVisible(CAPITULO_UNICO)).toBe(false);
    expect(chapterHeadingVisible(CAPITULO_SEM_HORA)).toBe(false);
    expect(chapterHeadingVisible("cerimonia")).toBe(true);
  });

  it("confessionário resolve pelo vocabulário do pack, nunca texto livre da chave", () => {
    expect(chapterTitle(CASAMENTO, CAPITULO_CONFESSIONARIO)).toBe("Confessionário");
    expect(chapterTitle(QUINZE_ANOS, CAPITULO_CONFESSIONARIO)).toBe("Confessionário");
    expect(chapterTitle(undefined, CAPITULO_CONFESSIONARIO)).toBe(CAPITULO_CONFESSIONARIO);
    expect(chapterHeadingVisible(CAPITULO_CONFESSIONARIO)).toBe(true);
  });
});
