import { podeReagir } from "@albora/core";
import {
  apagarReacao,
  comEvento,
  gateDoEvento,
  gravarReacao,
  midiaPublicadaDoEvento,
  packDoEvento,
  reacaoDaSessao,
} from "@albora/db";
import { PACKS, reacaoValida } from "@albora/packs";
import { banco } from "@/lib/banco";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";
import { identidadeParaLimite, sessaoDaRequisicao } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPO_PADRAO = "estrela";

type Corpo = { uploadId?: unknown; tipo?: unknown };

async function validarSessao(req: Request) {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return { erro: erro(401, "sessao.invalida", "Sessão inválida") };

  const eventoPedido = new URL(req.url).searchParams.get("evento");
  if (eventoPedido !== null && eventoPedido !== sessao.eventoId) {
    return { erro: erro(403, "reacao.evento_divergente", "Esta sessão não pertence a este evento") };
  }

  return { sessao };
}

function parseUploadId(corpo: Corpo): string | null {
  return typeof corpo.uploadId === "string" && UUID.test(corpo.uploadId) ? corpo.uploadId : null;
}

/**
 * Reagir a uma foto (spec 008). Idempotente por (sessao, upload).
 */
export async function PUT(req: Request) {
  const validacao = await validarSessao(req);
  if ("erro" in validacao) return validacao.erro;
  const { sessao } = validacao;

  const limite = consumir(identidadeParaLimite(req, sessao), 120, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const uploadId = parseUploadId(corpo);
  if (!uploadId) return erro(422, "validation_error", "Foto inválida", { campos: ["uploadId"] });

  const tipo = typeof corpo.tipo === "string" ? corpo.tipo : TIPO_PADRAO;

  try {
    const resultado = await comEvento(banco(), sessao.eventoId, async (c) => {
      const gate = await gateDoEvento(c, sessao.eventoId);
      if (!gate || !podeReagir(gate, new Date())) {
        return { ok: false as const, code: "reacao.gate_fechado" };
      }

      if (!(await midiaPublicadaDoEvento(c, sessao.eventoId, uploadId))) {
        return { ok: false as const, code: "reacao.midia_ausente" };
      }

      const packId = await packDoEvento(c, sessao.eventoId);
      const pack = packId ? PACKS[packId] : undefined;
      if (!pack || !reacaoValida(pack, tipo)) {
        return { ok: false as const, code: "reacao.tipo_invalido" };
      }

      const reacoes = await gravarReacao(c, sessao.eventoId, uploadId, sessao.sessaoId, tipo);
      return { ok: true as const, reacoes, minha: tipo };
    });

    if (!resultado.ok) {
      const status = resultado.code === "reacao.gate_fechado" ? 403 : 422;
      return erro(status, resultado.code, "Reação recusada");
    }

    return ok({ reacoes: resultado.reacoes, minha: resultado.minha });
  } catch (e) {
    return erroInesperado("reacao.put", e);
  }
}

/** Remove a reacao da sessao nesta foto. */
export async function DELETE(req: Request) {
  const validacao = await validarSessao(req);
  if ("erro" in validacao) return validacao.erro;
  const { sessao } = validacao;

  const limite = consumir(identidadeParaLimite(req, sessao), 120, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const uploadId = parseUploadId(corpo);
  if (!uploadId) return erro(422, "validation_error", "Foto inválida", { campos: ["uploadId"] });

  try {
    const resultado = await comEvento(banco(), sessao.eventoId, async (c) => {
      const gate = await gateDoEvento(c, sessao.eventoId);
      if (!gate || !podeReagir(gate, new Date())) {
        return { ok: false as const, code: "reacao.gate_fechado" };
      }

      const tinha = await reacaoDaSessao(c, uploadId, sessao.sessaoId);
      if (!tinha) {
        const { rows } = await c.query<{ total: number }>(
          "SELECT count(*)::int AS total FROM reactions WHERE upload_id = $1",
          [uploadId],
        );
        return { ok: true as const, reacoes: rows[0]?.total ?? 0, minha: null };
      }

      const reacoes = await apagarReacao(c, uploadId, sessao.sessaoId);
      return { ok: true as const, reacoes, minha: null };
    });

    if (!resultado.ok) return erro(403, resultado.code, "Reação recusada");

    return ok({ reacoes: resultado.reacoes, minha: resultado.minha });
  } catch (e) {
    return erroInesperado("reacao.delete", e);
  }
}
