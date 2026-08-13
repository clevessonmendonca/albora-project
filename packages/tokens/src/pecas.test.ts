import { describe, expect, it } from "vitest";
import { MARCA_ALBORA } from "./marca";
import {
  BLEED_MM,
  colorWarning,
  cutBox,
  pieceMeasures,
  pieceProblems,
  qrInk,
  QR_MIN_MM,
  SAFE_AREA_MM,
  type PieceFormat,
} from "./pieces";

const FORMATOS: PieceFormat[] = ["placa-a4", "card-de-mesa", "card-de-missao"];

const bom = {
  formato: "placa-a4" as const,
  qr: 90,
  url: "albora.app/e/ana-e-joao",
  margem: 12,
};

describe("a peça recusa antes da gráfica", () => {
  it("aprova o layout íntegro", () => {
    expect(pieceProblems(bom, MARCA_ALBORA.cores)).toEqual([]);
  });

  it("recusa QR abaixo do mínimo", () => {
    // O defeito que este teste impede é o mais caro do produto: QR que
    // escaneia na tela do designer e falha no papel, na festa, sem volta.
    const problemas = pieceProblems({ ...bom, qr: QR_MIN_MM - 1 }, MARCA_ALBORA.cores);

    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain("mínimo");
  });

  it("aceita exatamente o mínimo", () => {
    expect(pieceProblems({ ...bom, qr: QR_MIN_MM }, MARCA_ALBORA.cores)).toEqual([]);
  });

  it("recusa QR que estoura a área de segurança", () => {
    const problemas = pieceProblems(
      { ...bom, formato: "card-de-missao", qr: 54 },
      MARCA_ALBORA.cores,
    );

    expect(problemas.join(" ")).toContain("área de segurança");
  });

  it("recusa margem menor que a área de segurança", () => {
    const problemas = pieceProblems(
      { ...bom, margem: SAFE_AREA_MM - 1 },
      MARCA_ALBORA.cores,
    );

    expect(problemas.join(" ")).toContain("o corte come o conteúdo");
  });

  it("recusa peça sem a URL sob o código", () => {
    // Câmera velha, permissão negada, código riscado: a URL é o que sobra.
    for (const url of ["", "   "]) {
      expect(pieceProblems({ ...bom, url }, MARCA_ALBORA.cores).join(" ")).toContain("URL");
    }
  });

  it("acumula os defeitos em vez de parar no primeiro", () => {
    const problemas = pieceProblems({ ...bom, qr: 10, url: "", margem: 0 }, MARCA_ALBORA.cores);

    expect(problemas.length).toBeGreaterThanOrEqual(3);
  });
});

describe("a identidade colore a peça, nunca o código", () => {
  it("veste o QR com a cor do evento quando ela alcança", () => {
    const tinta = qrInk(MARCA_ALBORA.cores);

    expect(tinta.recuouParaAbsoluto).toBe(false);
    expect(tinta.fundo).toBe(MARCA_ALBORA.cores.papel);
    expect([MARCA_ALBORA.cores.tinta, MARCA_ALBORA.cores.noite]).toContain(tinta.modulo);
  });

  it("recua para preto sobre branco quando a identidade não alcança", () => {
    // Âmbar sobre creme é lindo no preview e não escaneia em luz baixa.
    const tinta = qrInk({
      ...MARCA_ALBORA.cores,
      tinta: "#D9793C",
      noite: "#E0A46F",
      papel: "#F4F0E9",
    });

    expect(tinta.recuouParaAbsoluto).toBe(true);
    expect(tinta.modulo).toBe("#000000");
    expect(tinta.fundo).toBe("#FFFFFF");
  });

  it("o recuo vira defeito declarado, não silêncio", () => {
    const cores = { ...MARCA_ALBORA.cores, tinta: "#D9793C", noite: "#E0A46F" };

    expect(pieceProblems(bom, cores).join(" ")).toContain("preto sobre branco");
  });

  it("hex malformado não gera peça sem contraste", () => {
    const tinta = qrInk({ ...MARCA_ALBORA.cores, tinta: "o azul", noite: "também azul" });

    expect(tinta.recuouParaAbsoluto).toBe(true);
    expect(tinta.modulo).toBe("#000000");
  });

  it("escolhe a mais escura, não a que se chama noite", () => {
    // Um evento pode trocar as duas, e a decisão não pode depender do nome.
    const tinta = qrInk({ ...MARCA_ALBORA.cores, tinta: "#000000", noite: "#777777" });

    expect(tinta.modulo).toBe("#000000");
  });
});

describe("as medidas", () => {
  it.each(FORMATOS)("%s nasce com QR acima do mínimo", (formato) => {
    // O padrão do produto nunca pode ser um layout que o próprio gerador
    // reprovaria.
    const medidas = pieceMeasures(formato);

    expect(medidas.qr).toBeGreaterThanOrEqual(QR_MIN_MM);
    expect(
      pieceProblems(
        { formato, qr: medidas.qr, url: "albora.app/e/x", margem: SAFE_AREA_MM },
        MARCA_ALBORA.cores,
      ),
    ).toEqual([]);
  });

  it("a caixa de corte soma a sangria dos quatro lados", () => {
    const peca = pieceMeasures("placa-a4");
    const caixa = cutBox(peca);

    expect(caixa.largura).toBe(peca.largura + BLEED_MM * 2);
    expect(caixa.altura).toBe(peca.altura + BLEED_MM * 2);
  });

  it("a placa é A4 de verdade", () => {
    expect(pieceMeasures("placa-a4")).toMatchObject({ largura: 210, altura: 297 });
  });
});

describe("o aviso de cor", () => {
  it("nomeia o acento do evento e sai antes do download", () => {
    const aviso = colorWarning(MARCA_ALBORA.cores);

    expect(aviso).toContain(MARCA_ALBORA.cores.acento);
    expect(aviso.toLowerCase()).toContain("cmyk");
    expect(aviso.toLowerCase()).toContain("prova impressa");
  });
});
