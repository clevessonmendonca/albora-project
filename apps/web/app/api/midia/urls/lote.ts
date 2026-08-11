import { prefixoDoEvento } from "@albora/core";

/**
 * Teto do lote. Uma página de feed são 24 itens e duas variantes cada, e é
 * essa a conta: 48 com folga. Sem teto, a lista vira caminho de enumeração e
 * de esgotamento — uma requisição pedindo dez mil chaves custa dez mil
 * assinaturas.
 */
export const TETO_DE_CHAVES = 60;

/**
 * Validade da URL de leitura.
 *
 * Curta o bastante para uma URL que vazou no grupo do WhatsApp não valer a
 * noite; longa o bastante para uma rolagem de feed não expirar no meio dela —
 * o cliente renova com 60s de folga (`FOLGA_DE_RENOVACAO_MS`).
 */
export const VALIDADE_GET_SEGUNDOS = 900;

/**
 * A forma exata que `derivarChaveMidia` produz.
 *
 * Conferir só o prefixo do evento deixaria de fora tudo que **mais tarde**
 * more debaixo de `events/{id}/` e não seja foto de convidado — export do
 * acervo, artefato de job. Conjunto fechado de variantes é o que impede que a
 * rota de leitura do feed vire chave-mestra do que ainda vai ser escrito ali.
 */
const FORMATO_DE_CHAVE =
  /^events\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(full|thumb)$/i;

export type LoteAceito = { chaves: string[] };

export type LoteRecusado = {
  status: number;
  code: string;
  message: string;
  details: Record<string, unknown>;
};

export function recusado(lote: LoteAceito | LoteRecusado): lote is LoteRecusado {
  return "code" in lote;
}

/**
 * Confere o lote pedido contra o evento da sessão, antes de qualquer
 * assinatura.
 *
 * Chave de outro evento e chave malformada saem com a **mesma** resposta de
 * propósito: distinguir contaria ao pedinte se aquele id existe em outra
 * festa, que é exatamente o que ele queria descobrir.
 */
export function validarLote(bruto: unknown, eventoId: string): LoteAceito | LoteRecusado {
  if (!Array.isArray(bruto)) {
    return {
      status: 422,
      code: "validation_error",
      message: "Dados incompletos",
      details: { campos: ["chaves"] },
    };
  }

  if (bruto.length > TETO_DE_CHAVES) {
    return {
      status: 422,
      code: "midia.lote_excedido",
      message: "Pedido grande demais",
      details: { teto: TETO_DE_CHAVES, recebido: bruto.length },
    };
  }

  const prefixo = prefixoDoEvento(eventoId);
  const aceitas = new Set<string>();

  for (const chave of bruto) {
    if (typeof chave !== "string") {
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
    if (!chave.startsWith(prefixo) || !FORMATO_DE_CHAVE.test(chave)) {
      return {
        status: 403,
        code: "midia.chave_invalida",
        message: "Chave não pertence a este evento",
        details: { campos: ["chaves"] },
      };
    }

    aceitas.add(chave);
  }

  return { chaves: [...aceitas] };
}
