import { describe, expect, it } from "vitest";
import { hammingDistance } from "./hash-perceptual";
import { rankForBook, type MediaScores } from "./ranking";

const HASH_A = "0000000000000000";
const HASH_A_NEAR = "0000000000000001"; // distância de Hamming 1 de HASH_A — quase-duplicata (rajada)
const HASH_B = "ffffffffffffffff"; // distância de Hamming 64 de HASH_A — estrutura totalmente diferente

function media(overrides: Partial<MediaScores> & { uploadId: string }): MediaScores {
  return { hash: null, sharpness: null, exposure: null, ...overrides };
}

/** PRNG determinístico (mulberry32) — mesma semente sempre gera a mesma sequência, sem depender de `Math.random()`. */
function mulberry32(semente: number): () => number {
  let s = semente;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashAleatorio(rand: () => number): string {
  let hex = "";
  for (let i = 0; i < 16; i += 1) hex += Math.floor(rand() * 16).toString(16);
  return hex;
}

/** Distância de Hamming bit a bit em BigInt — deliberadamente simples e lenta, só para o oráculo abaixo. */
function hammingDistanceReferencia(a: string, b: string): number {
  let xored = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let distancia = 0;
  while (xored > 0n) {
    distancia += Number(xored & 1n);
    xored >>= 1n;
  }
  return distancia;
}

/**
 * Oráculo de referência (achado 6): reimplementação deliberadamente O(n²), todos-contra-todos —
 * o algoritmo que `ranking.ts` tinha antes do agrupamento por bucket. Usado só neste teste, para
 * provar que o agrupamento por bucket dá exatamente o mesmo conjunto de `duplicata`, nunca no
 * código de produção.
 */
function duplicatasEsperadasPorForcaBruta(
  scores: readonly MediaScores[],
  hammingThreshold: number,
): Set<string> {
  const parent = new Map<string, string>();
  for (const s of scores) parent.set(s.uploadId, s.uploadId);
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    return root;
  };
  const union = (a: string, b: string): void => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  };

  const withHash = scores.filter((s): s is MediaScores & { hash: string } => s.hash !== null);
  for (let i = 0; i < withHash.length; i += 1) {
    for (let j = i + 1; j < withHash.length; j += 1) {
      const a = withHash[i]!;
      const b = withHash[j]!;
      if (hammingDistanceReferencia(a.hash, b.hash) < hammingThreshold) union(a.uploadId, b.uploadId);
    }
  }

  const groupsByRoot = new Map<string, string[]>();
  for (const s of scores) {
    const root = find(s.uploadId);
    const group = groupsByRoot.get(root) ?? [];
    group.push(s.uploadId);
    groupsByRoot.set(root, group);
  }

  const scoresById = new Map(scores.map((s) => [s.uploadId, s]));
  const duplicatas = new Set<string>();
  for (const group of groupsByRoot.values()) {
    if (group.length <= 1) continue;
    let canonical: string | null = null;
    let canonicalSharpness = Number.NEGATIVE_INFINITY;
    for (const id of [...group].sort()) {
      const sharpness = scoresById.get(id)?.sharpness ?? Number.NEGATIVE_INFINITY;
      if (canonical === null || sharpness > canonicalSharpness) {
        canonical = id;
        canonicalSharpness = sharpness;
      }
    }
    for (const id of group) if (id !== canonical) duplicatas.add(id);
  }
  return duplicatas;
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

  it("agrupamento por bucket (achado 6) dá exatamente o mesmo resultado que comparar todo mundo contra todo mundo", () => {
    const rand = mulberry32(20260905);
    const LIMIARES = [1, 3, 10, 16, 20, 40, 65, 100];

    for (let caso = 0; caso < 300; caso += 1) {
      const n = 1 + Math.floor(rand() * 40);
      const hammingThreshold = LIMIARES[Math.floor(rand() * LIMIARES.length)]!;
      const scores: MediaScores[] = [];
      for (let i = 0; i < n; i += 1) {
        scores.push({
          uploadId: `foto-${caso}-${i}`,
          hash: rand() > 0.2 ? hashAleatorio(rand) : null,
          sharpness: rand() > 0.15 ? rand() * 500 : null,
          exposure: rand() > 0.15 ? rand() : null,
        });
      }

      const esperado = duplicatasEsperadasPorForcaBruta(scores, hammingThreshold);
      const saida = rankForBook(scores, { hammingThreshold });
      const obtido = new Set(saida.filter((s) => s.flags.includes("duplicata")).map((s) => s.uploadId));

      expect(obtido).toEqual(esperado);
    }
  });

  /**
   * Escala, não relógio.
   *
   * A versão anterior media 1.500 fotos e exigia `< 1000ms`. Isso reprovava
   * quando a máquina estava ocupada (medi 2.028ms numa rodada com a suíte
   * inteira em paralelo) e passava 10/10 isolado — um teto absoluto mede a
   * carga do CI junto com o algoritmo.
   *
   * Dobrar a entrada separa os dois: quem é ~linear dobra o tempo, quem é
   * O(n²) quadruplica. A razão sobrevive a máquina lenta, porque a lentidão
   * afeta as duas medições igualmente. `min` de três repetições porque, em
   * medição de tempo, o menor valor é o menos contaminado por ruído — média
   * incorpora cada pausa de GC.
   */
  function gerarScores(n: number, semente: number): MediaScores[] {
    const rand = mulberry32(semente);
    const scores: MediaScores[] = [];
    for (let i = 0; i < n; i += 1) {
      scores.push({
        uploadId: `foto-${String(i).padStart(5, "0")}`,
        hash: hashAleatorio(rand),
        sharpness: rand() * 500,
        exposure: rand(),
      });
    }
    return scores;
  }

  /** `min` de várias rodadas: em medição de tempo o menor valor é o menos contaminado — média incorpora cada pausa de GC. */
  function menorDuracaoDe(executar: () => unknown, repeticoes = 3): number {
    let melhor = Number.POSITIVE_INFINITY;
    for (let i = 0; i < repeticoes; i += 1) {
      const inicio = performance.now();
      executar();
      melhor = Math.min(melhor, performance.now() - inicio);
    }
    return melhor;
  }

  /**
   * Linha de base, não relógio de parede.
   *
   * A versão anterior media 1.500 fotos e exigia `< 1000ms`. Reprovava com a
   * máquina ocupada (2.028ms numa rodada com a suíte inteira em paralelo) e
   * passava 10/10 isolado: um teto absoluto mede a carga do CI junto com o
   * algoritmo.
   *
   * Aqui as duas pontas são medidas na mesma máquina, na mesma rodada — a
   * lentidão afeta as duas e a razão sobrevive. A base é o piso do algoritmo
   * antigo: `C(n,2)` chamadas de `hammingDistance`, sem a união nem as
   * alocações que ele também fazia.
   *
   * O que este teste prova: a partição por faixa está no lugar. O que ele
   * NÃO prova: complexidade sub-quadrática — porque não é. `bands` é
   * `min(hammingThreshold, 64)` = 10 faixas de 7 bits, ou seja **128 baldes
   * fixos**, independentes de `n`. O balde cresce linear com a entrada e os
   * pares dentro dele crescem ao quadrado. Dobrar a entrada ainda
   * quadruplica o tempo (medido: razão 4,05 entre 1.000 e 2.000). A
   * otimização do achado 6 derrubou a constante, não a curva.
   */
  it(
    "não compara todos contra todos — custo fica abaixo do piso do algoritmo antigo",
    () => {
      const scores = gerarScores(1200, 150020260905);
      const hashes = scores.map((x) => x.hash!);

      const pisoDeTodosContraTodos = () => {
        let acc = 0;
        for (let a = 0; a < hashes.length; a += 1) {
          for (let b = a + 1; b < hashes.length; b += 1) acc += hammingDistance(hashes[a]!, hashes[b]!);
        }
        return acc;
      };

      const tBase = menorDuracaoDe(pisoDeTodosContraTodos);
      const tReal = menorDuracaoDe(() => rankForBook(scores));
      const ganho = tBase / Math.max(tReal, 1);

      // Medido em 1,72 com a partição por faixa; sem ela, `rankForBook` faz o
      // trabalho do piso MAIS percentis e ordenação, e a razão cai abaixo de 1.
      expect(ganho, `ganho ${ganho.toFixed(2)} (piso ${tBase.toFixed(1)}ms, real ${tReal.toFixed(1)}ms)`).toBeGreaterThan(
        1.3,
      );
    },
    60_000,
  );

  it("em escala, continua sem cortar nenhuma foto", () => {
    const scores = gerarScores(1500, 150020260905);
    const saida = rankForBook(scores);

    expect(saida).toHaveLength(1500);
    expect(new Set(saida.map((s) => s.uploadId))).toEqual(new Set(scores.map((s) => s.uploadId)));
  });
});
