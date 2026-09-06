import { hammingDistance } from "./hash-perceptual";

/**
 * Curadoria propõe, casal decide (spec §5): esta função nunca remove mídia. Ela só calcula uma
 * ordem sugerida e marca com `flags` — o slot do livro só é preenchido quando o casal arrasta a
 * foto, então tudo que existe aqui é candidato, nunca corte.
 */

export type MediaScores = {
  uploadId: string;
  /** Hash perceptual (hex, ver `hash-perceptual.ts`). `null` = sinal ausente, nunca "ruim". */
  hash: string | null;
  /** Variância do laplaciano (ver `nitidez.ts`). `null` = sinal ausente. */
  sharpness: number | null;
  /** Fração de pixels saturados (ver `exposicao.ts`). `null` = sinal ausente. */
  exposure: number | null;
};

export type Flag = "duplicata" | "desfocada" | "exposicao";

export type Suggestion = {
  uploadId: string;
  /** Posição sugerida, 1-based. Ordem, nunca corte. */
  rank: number;
  flags: readonly Flag[];
};

export type RankOptions = {
  /** Distância de Hamming (de 64 bits) abaixo da qual duas mídias entram no mesmo grupo de duplicata. */
  hammingThreshold?: number;
  /** Sharpness abaixo deste valor marca `desfocada`. */
  sharpnessThreshold?: number;
  /** Exposure acima deste valor (fração de pixels saturados) marca `exposicao`. */
  exposureThreshold?: number;
};

// 10 de 64 bits: limiar comum de aHash para "quase-duplicata" (rajada, mesmo ângulo) sem confundir
// duas fotos de cenas parecidas mas diferentes.
const DEFAULT_HAMMING_THRESHOLD = 10;
// Variância do laplaciano abaixo disto tende a indicar tremido/desfoque no thumb (valor de referência,
// recalibrável por evento sem tocar no algoritmo).
const DEFAULT_SHARPNESS_THRESHOLD = 50;
// Metade dos pixels do thumb saturados nos extremos já é estouro perceptível de luz ou sombra.
const DEFAULT_EXPOSURE_THRESHOLD = 0.5;
// Os percentis de prioridade vivem em [-1, 1] (ver `computePriority`); 10 garante que uma mídia
// marcada `duplicata` nunca ultrapassa uma não-duplicada, não importa quão boa seja seu próprio score.
const DUPLICATE_PENALTY = 10;

export function rankForBook(
  scores: readonly MediaScores[],
  opts: RankOptions = {},
): readonly Suggestion[] {
  const hammingThreshold = opts.hammingThreshold ?? DEFAULT_HAMMING_THRESHOLD;
  const sharpnessThreshold = opts.sharpnessThreshold ?? DEFAULT_SHARPNESS_THRESHOLD;
  const exposureThreshold = opts.exposureThreshold ?? DEFAULT_EXPOSURE_THRESHOLD;

  const scoresByUploadId = new Map(scores.map((s) => [s.uploadId, s]));
  const groupsByUploadId = groupDuplicates(scores, hammingThreshold);
  const canonicalByUploadId = pickCanonicals(groupsByUploadId, scoresByUploadId);

  const sharpnessPercentile = percentileByUploadId(
    scores.map((s) => ({ uploadId: s.uploadId, value: s.sharpness })),
  );
  const exposurePercentile = percentileByUploadId(
    scores.map((s) => ({ uploadId: s.uploadId, value: s.exposure })),
  );

  const withPriority = scores.map((item) => {
    const group = groupsByUploadId.get(item.uploadId) ?? [item.uploadId];
    const isDuplicateNonCanonical =
      group.length > 1 && canonicalByUploadId.get(item.uploadId) !== item.uploadId;

    const flags: Flag[] = [];
    if (isDuplicateNonCanonical) flags.push("duplicata");
    // Sinal ausente (`null`) nunca vira flag — ausência de sinal não é sinal ruim.
    if (item.sharpness !== null && item.sharpness < sharpnessThreshold) flags.push("desfocada");
    if (item.exposure !== null && item.exposure > exposureThreshold) flags.push("exposicao");

    const priority = computePriority({
      sharpnessPercentile: sharpnessPercentile.get(item.uploadId) ?? 0.5,
      exposurePercentile: exposurePercentile.get(item.uploadId) ?? 0.5,
      isDuplicateNonCanonical,
    });

    return { uploadId: item.uploadId, flags, priority };
  });

  // Desempate sempre por uploadId — nunca pela ordem em que a entrada chegou, senão o livro
  // "muda de ordem" a cada recálculo e o casal acha que o sistema está quebrado.
  const ordered = [...withPriority].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.uploadId < b.uploadId ? -1 : a.uploadId > b.uploadId ? 1 : 0;
  });

  return ordered.map((item, index) => ({
    uploadId: item.uploadId,
    rank: index + 1,
    flags: item.flags,
  }));
}

function computePriority(input: {
  sharpnessPercentile: number;
  exposurePercentile: number;
  isDuplicateNonCanonical: boolean;
}): number {
  let priority = input.sharpnessPercentile - input.exposurePercentile;
  if (input.isDuplicateNonCanonical) priority -= DUPLICATE_PENALTY;
  return priority;
}

/**
 * Agrupa por proximidade de hash (união por distância de Hamming abaixo do limiar). Mídia sem
 * hash nunca entra em grupo com ninguém — sinal ausente não pode virar acusação de duplicata.
 * Devolve um mapa por `uploadId`; membros do mesmo grupo compartilham a mesma referência de array,
 * o que permite ao chamador (`pickCanonicals`) deduplicar por identidade sem recomputar nada.
 */
function groupDuplicates(
  scores: readonly MediaScores[],
  hammingThreshold: number,
): Map<string, string[]> {
  const parent = new Map<string, string>();
  for (const s of scores) parent.set(s.uploadId, s.uploadId);

  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) {
      root = parent.get(root) as string;
    }
    return root;
  };
  const union = (a: string, b: string): void => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  };

  const withHash = scores.filter(
    (s): s is MediaScores & { hash: string } => s.hash !== null,
  );
  for (let i = 0; i < withHash.length; i += 1) {
    for (let j = i + 1; j < withHash.length; j += 1) {
      const a = withHash[i];
      const b = withHash[j];
      if (a === undefined || b === undefined) continue;
      if (hammingDistance(a.hash, b.hash) < hammingThreshold) union(a.uploadId, b.uploadId);
    }
  }

  const groupsByRoot = new Map<string, string[]>();
  for (const s of scores) {
    const root = find(s.uploadId);
    const group = groupsByRoot.get(root) ?? [];
    group.push(s.uploadId);
    groupsByRoot.set(root, group);
  }

  const groupsByUploadId = new Map<string, string[]>();
  for (const group of groupsByRoot.values()) {
    for (const id of group) groupsByUploadId.set(id, group);
  }
  return groupsByUploadId;
}

/**
 * Dentro de cada grupo, a mídia canônica é a mais nítida — as outras recebem `duplicata`, nunca
 * são removidas. Empate (ou sharpness ausente nos dois lados) é resolvido pelo `uploadId` menor,
 * nunca pela ordem de chegada.
 */
function pickCanonicals(
  groupsByUploadId: Map<string, string[]>,
  scoresByUploadId: Map<string, MediaScores>,
): Map<string, string> {
  const canonicalByUploadId = new Map<string, string>();
  const processedGroups = new Set<string[]>();

  for (const group of groupsByUploadId.values()) {
    if (processedGroups.has(group)) continue;
    processedGroups.add(group);

    let canonical: string | null = null;
    let canonicalSharpness = Number.NEGATIVE_INFINITY;

    for (const id of [...group].sort()) {
      const sharpness = scoresByUploadId.get(id)?.sharpness ?? Number.NEGATIVE_INFINITY;
      if (canonical === null || sharpness > canonicalSharpness) {
        canonical = id;
        canonicalSharpness = sharpness;
      }
    }

    for (const id of group) canonicalByUploadId.set(id, canonical as string);
  }

  return canonicalByUploadId;
}

/**
 * Percentil (0 = pior conhecido, 1 = melhor conhecido) entre os valores não-nulos. Sinal ausente
 * recebe exatamente 0.5 — o meio da distribuição conhecida, nem o topo nem o fim. Com menos de dois
 * valores conhecidos não há distribuição para comparar, então todo mundo fica neutro.
 */
function percentileByUploadId(
  entries: readonly { uploadId: string; value: number | null }[],
): Map<string, number> {
  const NEUTRAL = 0.5;
  const result = new Map<string, number>();
  for (const e of entries) result.set(e.uploadId, NEUTRAL);

  const known = entries.filter(
    (e): e is { uploadId: string; value: number } => e.value !== null,
  );
  if (known.length <= 1) return result;

  const sorted = [...known].sort((a, b) => {
    if (a.value !== b.value) return a.value - b.value;
    return a.uploadId < b.uploadId ? -1 : a.uploadId > b.uploadId ? 1 : 0;
  });

  sorted.forEach((e, index) => {
    result.set(e.uploadId, index / (sorted.length - 1));
  });

  return result;
}
