import { eventPrefix } from "@albora/core";

/** Teto do lote (página de feed = 24 × 2 variantes) — sem teto, uma requisição pede dez mil chaves e custa dez mil assinaturas. */
export const KEY_CAP = 60;

/** URL curta o bastante para não valer a noite se vazar; longa o bastante para o feed não expirar no meio da rolagem (cliente renova com 60s de folga). */
export const GET_TTL_SECONDS = 900;

/** Conjunto fechado de variantes (full|thumb) — prefixo do evento sozinho deixaria passar export e artefatos de job, virando chave-mestra do que vai ser escrito depois. */
const KEY_FORMAT =
  /^events\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(full|thumb)$/i;

export type AcceptedBatch = { chaves: string[] };

export type RejectedBatch = {
  status: number;
  code: string;
  message: string;
  details: Record<string, unknown>;
};

export function isRejected(batch: AcceptedBatch | RejectedBatch): batch is RejectedBatch {
  return "code" in batch;
}

/** Chave de outro evento e malformada retornam a mesma resposta — distinguir revelaria se aquele id existe em outra festa. */
export function validateBatch(raw: unknown, eventId: string): AcceptedBatch | RejectedBatch {
  if (!Array.isArray(raw)) {
    return {
      status: 422,
      code: "validation_error",
      message: "Dados incompletos",
      details: { campos: ["chaves"] },
    };
  }

  if (raw.length > KEY_CAP) {
    return {
      status: 422,
      code: "midia.lote_excedido",
      message: "Pedido grande demais",
      details: { teto: KEY_CAP, recebido: raw.length },
    };
  }

  const prefix = eventPrefix(eventId);
  const accepted = new Set<string>();

  for (const key of raw) {
    if (typeof key !== "string") {
      return {
        status: 422,
        code: "validation_error",
        message: "Dados incompletos",
        details: { campos: ["chaves"] },
      };
    }

    // 🔴 A chave pertence a este evento, ou não existe para nós. Sem esta
    // checagem, pedir a chave do casamento do vizinho é ler o casamento do
    // vizinho.
    if (!key.startsWith(prefix) || !KEY_FORMAT.test(key)) {
      return {
        status: 403,
        code: "midia.chave_invalida",
        message: "Chave não pertence a este evento",
        details: { campos: ["chaves"] },
      };
    }

    accepted.add(key);
  }

  return { chaves: [...accepted] };
}
