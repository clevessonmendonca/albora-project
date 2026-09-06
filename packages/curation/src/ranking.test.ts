import { describe, expect, it } from "vitest";
import { rankForBook, type MediaScores } from "./ranking";

const HASH_A = "0000000000000000";
const HASH_A_NEAR = "0000000000000001"; // distância de Hamming 1 de HASH_A — quase-duplicata (rajada)
const HASH_B = "ffffffffffffffff"; // distância de Hamming 64 de HASH_A — estrutura totalmente diferente

function media(overrides: Partial<MediaScores> & { uploadId: string }): MediaScores {
  return { hash: null, sharpness: null, exposure: null, ...overrides };
}

describe("rankForBook", () => {
  it("nunca remove mídia: a saída contém todas as entradas, mesmo com duplicatas e sinais ausentes", () => {
    const entrada: MediaScores[] = [
      media({ uploadId: "foto-1", hash: HASH_A, sharpness: 100, exposure: 0.1 }),
      media({ uploadId: "foto-2", hash: HASH_A_NEAR, sharpness: 40, exposure: 0.1 }),
      media({ uploadId: "foto-3" }), // sinal totalmente ausente
      media({ uploadId: "foto-4", hash: HASH_B, sharpness: 200, exposure: 0.9 }),
      media({ uploadId: "foto-5", sharpness: 5 }), // sem hash — nunca pode virar duplicata
      media({ uploadId: "foto-6", hash: HASH_B, sharpness: null, exposure: null }),
    ];

    const saida = rankForBook(entrada);

    expect(saida).toHaveLength(entrada.length);
    expect(new Set(saida.map((s) => s.uploadId))).toEqual(new Set(entrada.map((s) => s.uploadId)));
  });

  it("um filtro disfarçado de ranking falharia aqui: item com as três flags simultâneas continua na saída", () => {
    const entrada: MediaScores[] = [
      media({ uploadId: "pior-de-todas", hash: HASH_A, sharpness: 1, exposure: 0.99 }),
      media({ uploadId: "duplicata-mais-nitida", hash: HASH_A_NEAR, sharpness: 500, exposure: 0.01 }),
    ];

    const saida = rankForBook(entrada);

    expect(saida.map((s) => s.uploadId).sort()).toEqual(["duplicata-mais-nitida", "pior-de-todas"]);
    const pior = saida.find((s) => s.uploadId === "pior-de-todas");
    expect(pior?.flags).toEqual(expect.arrayContaining(["duplicata", "desfocada", "exposicao"]));
  });

  it("sinal ausente não vira flag e não empurra a mídia para o fim — fica em posição neutra", () => {
    const entrada: MediaScores[] = [
      media({ uploadId: "boa", sharpness: 500, exposure: 0.01 }),
      media({ uploadId: "sem-sinal" }),
      media({ uploadId: "ruim", sharpness: 1, exposure: 0.99 }),
    ];

    const saida = rankForBook(entrada);
    const semSinal = saida.find((s) => s.uploadId === "sem-sinal");
    const boa = saida.find((s) => s.uploadId === "boa");
    const ruim = saida.find((s) => s.uploadId === "ruim");

    expect(semSinal?.flags).toEqual([]);
    expect(boa?.rank).toBeLessThan(semSinal!.rank);
    expect(semSinal!.rank).toBeLessThan(ruim!.rank);
  });

  it("duplicatas ficam agrupadas: a mais nítida do grupo não leva flag, as outras levam `duplicata`, e nenhuma some", () => {
    const entrada: MediaScores[] = [
      media({ uploadId: "rajada-1", hash: HASH_A, sharpness: 80 }),
      media({ uploadId: "rajada-2", hash: HASH_A_NEAR, sharpness: 150 }), // mais nítida do grupo
      media({ uploadId: "rajada-3", hash: HASH_A, sharpness: 10 }),
      media({ uploadId: "unica", hash: HASH_B, sharpness: 90 }),
    ];

    const saida = rankForBook(entrada);
    const porId = new Map(saida.map((s) => [s.uploadId, s]));

    expect(saida).toHaveLength(4);
    expect(porId.get("rajada-2")?.flags).toEqual([]);
    expect(porId.get("rajada-1")?.flags).toContain("duplicata");
    expect(porId.get("rajada-3")?.flags).toContain("duplicata");
    expect(porId.get("unica")?.flags).toEqual([]);
  });

  it("grupo de duplicatas sem sharpness em nenhum dos dois lados ainda desempata por uploadId, sem penalizar por sinal ausente", () => {
    const entrada: MediaScores[] = [
      media({ uploadId: "z-sem-nitidez", hash: HASH_A }),
      media({ uploadId: "a-sem-nitidez", hash: HASH_A_NEAR }),
    ];

    const saida = rankForBook(entrada);
    const porId = new Map(saida.map((s) => [s.uploadId, s]));

    // "a-sem-nitidez" vence o desempate alfabético e vira a canônica do grupo.
    expect(porId.get("a-sem-nitidez")?.flags).toEqual([]);
    expect(porId.get("z-sem-nitidez")?.flags).toEqual(["duplicata"]);
  });

  it("determinístico: mesma entrada em ordem embaralhada dá a mesma saída, empate resolvido por uploadId", () => {
    const entrada: MediaScores[] = [
      media({ uploadId: "b", sharpness: 100, exposure: 0.1 }),
      media({ uploadId: "a", sharpness: 100, exposure: 0.1 }),
      media({ uploadId: "c", sharpness: 100, exposure: 0.1 }),
    ];

    const saidaOriginal = rankForBook(entrada);
    const saidaEmbaralhada = rankForBook([...entrada].reverse());

    expect(saidaEmbaralhada).toEqual(saidaOriginal);
    expect(saidaOriginal.map((s) => s.uploadId)).toEqual(["a", "b", "c"]);
  });

  it("penalidade de duplicata domina: item flagueado fica atrás de um item não-duplicado de qualidade inferior", () => {
    const entrada: MediaScores[] = [
      media({ uploadId: "duplicata-boa", hash: HASH_A, sharpness: 500, exposure: 0.0 }),
      media({ uploadId: "canonica", hash: HASH_A_NEAR, sharpness: 501, exposure: 0.0 }),
      media({ uploadId: "unica-mediocre", hash: HASH_B, sharpness: 50, exposure: 0.3 }),
    ];

    const saida = rankForBook(entrada);
    const porId = new Map(saida.map((s) => [s.uploadId, s]));

    expect(porId.get("duplicata-boa")?.flags).toContain("duplicata");
    expect(porId.get("unica-mediocre")!.rank).toBeLessThan(porId.get("duplicata-boa")!.rank);
  });

  it("limiares são configuráveis via opts, sem mudar o comportamento padrão de quem não os passa", () => {
    const entrada: MediaScores[] = [media({ uploadId: "foto-1", sharpness: 60, exposure: 0.4 })];

    const semFlagsNoPadrao = rankForBook(entrada);
    expect(semFlagsNoPadrao[0]?.flags).toEqual([]);

    const comLimiarMaisRigoroso = rankForBook(entrada, {
      sharpnessThreshold: 70,
      exposureThreshold: 0.3,
    });
    expect(comLimiarMaisRigoroso[0]?.flags).toEqual(
      expect.arrayContaining(["desfocada", "exposicao"]),
    );
  });
});
