import { randomUUID } from "node:crypto";
import {
  type CodigoDeComentario,
  modoInteracao,
  montarThread,
  publicarComentario,
  validarTexto,
} from "@albora/core";
import {
  type ComentarioComAutor,
  type ComentarioGravado,
  comEvento,
  ErroComentarioDeOutroEvento,
  gateDoEvento,
  gravarComentario,
  listarComentariosVisiveisDaFoto,
  removerComentario,
} from "@albora/db";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireGuestSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { classifyCommentAfter } from "@/lib/classify-comment";
import { getPool } from "@/lib/db";

type Corpo = {
  uploadId?: unknown;
  texto?: unknown;
  respostaA?: unknown;
  id?: unknown;
};

type Saida =
  | { ok: true; comentario: ComentarioGravado }
  | { ok: false; status: number; code: string; message: string };

function mapearFalha(codigo: CodigoDeComentario): Saida {
  switch (codigo) {
    case "comentario.gate_fechado":
    case "comentario.outro_evento":
      return { ok: false, status: 403, code: codigo, message: "Comentário recusado" };
    case "comentario.texto_vazio":
    case "comentario.texto_longo":
    case "comentario.resposta_ausente":
      return { ok: false, status: 422, code: codigo, message: "Comentário inválido" };
  }
}

function paraJson(c: ComentarioComAutor, sessaoAtual: string) {
  return {
    id: c.id,
    autor: c.autor,
    texto: c.texto,
    respostaA: c.respostaA,
    criadaEm: c.criadoEm.toISOString(),
    meu: c.sessaoId === sessaoAtual,
    sessaoAutor: c.sessaoId,
  };
}

function eventoDivergente(req: Request, eventoId: string, sessaoId: string) {
  const eventoPedido = new URL(req.url).searchParams.get("evento");
  if (eventoPedido !== null && eventoPedido !== eventoId) {
    console.warn("comentarios.evento_divergente", { eventoId, sessaoId });
    return errorResponse(403, "comentarios.evento_divergente", "Esta sessão não pertence a este evento");
  }
  return null;
}

export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const divergente = eventoDivergente(req, auth.session.eventoId, auth.session.sessaoId);
  if (divergente) return divergente;

  const uploadId = new URL(req.url).searchParams.get("upload_id");
  if (uploadId === null || !UUID_RE.test(uploadId)) {
    return errorResponse(422, "validation_error", "Foto inválida", { campos: ["upload_id"] });
  }

  try {
    const threads = await comEvento(getPool(), auth.session.eventoId, async (c) => {
      const gate = await gateDoEvento(c, auth.session.eventoId);
      if (!gate || modoInteracao(gate, new Date()) !== "completo") return [];

      const comentarios = await listarComentariosVisiveisDaFoto(
        c,
        auth.session.eventoId,
        uploadId,
        auth.session.sessaoId,
      );
      const porId = new Map(comentarios.map((k) => [k.id, k]));

      return montarThread(comentarios, uploadId).map((t) => ({
        ...paraJson(porId.get(t.raiz.id)!, auth.session.sessaoId),
        respostas: t.respostas.map((r) => paraJson(porId.get(r.id)!, auth.session.sessaoId)),
      }));
    });

    console.log("comentarios.lista", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      threads: threads.length,
    });

    return jsonOk({ threads });
  } catch (e) {
    return unexpectedError("comentarios", e);
  }
}

export async function POST(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { max: 60 });
  if (limited) return limited;

  const divergente = eventoDivergente(req, auth.session.eventoId, auth.session.sessaoId);
  if (divergente) return divergente;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const { uploadId, texto, respostaA } = parsed.data;
  if (typeof uploadId !== "string" || !UUID_RE.test(uploadId)) {
    return errorResponse(422, "validation_error", "Foto inválida", { campos: ["uploadId"] });
  }

  if (typeof texto !== "string") {
    return errorResponse(422, "validation_error", "Texto inválido", { campos: ["texto"] });
  }

  const validado = validarTexto(texto);
  if (!validado.ok) {
    return errorResponse(422, validado.codigo, "Comentário inválido", { campos: ["texto"] });
  }

  let respostaAlvo: string | null = null;
  if (respostaA !== undefined && respostaA !== null) {
    if (typeof respostaA !== "string" || !UUID_RE.test(respostaA)) {
      return errorResponse(422, "validation_error", "Resposta inválida", { campos: ["respostaA"] });
    }
    respostaAlvo = respostaA;
  }

  try {
    const resultado = await comEvento(getPool(), auth.session.eventoId, async (c): Promise<Saida> => {
      const gate = await gateDoEvento(c, auth.session.eventoId);
      if (!gate || modoInteracao(gate, new Date()) !== "completo") {
        return {
          ok: false,
          status: 403,
          code: "comentario.gate_fechado",
          message: "A interação ainda não abriu",
        };
      }

      const existentes = await listarComentariosVisiveisDaFoto(
        c,
        auth.session.eventoId,
        uploadId,
        auth.session.sessaoId,
      );

      const idCliente =
        typeof parsed.data.id === "string" && UUID_RE.test(parsed.data.id)
          ? parsed.data.id
          : randomUUID();

      const publicado = publicarComentario(
        {
          id: idCliente,
          eventoId: auth.session.eventoId,
          midiaId: uploadId,
          sessaoId: auth.session.sessaoId,
          texto: validado.texto,
          respostaA: respostaAlvo,
        },
        { id: auth.session.eventoId, interacaoAbreEm: gate.interacaoAbreEm },
        existentes,
        new Date(),
      );

      if (!publicado.ok) return mapearFalha(publicado.codigo);

      const gravado = await gravarComentario(c, {
        id: publicado.comentario.id,
        eventoId: publicado.comentario.eventoId,
        midiaId: publicado.comentario.midiaId,
        sessaoId: publicado.comentario.sessaoId,
        respostaA: publicado.comentario.respostaA,
        texto: publicado.comentario.texto,
      });

      return { ok: true, comentario: gravado };
    });

    if (!resultado.ok) return errorResponse(resultado.status, resultado.code, resultado.message);

    console.log("comentarios.publicado", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      comentarioId: resultado.comentario.id,
      resposta: resultado.comentario.respostaA !== null,
    });

    classifyCommentAfter(
      auth.session.eventoId,
      resultado.comentario.id,
      resultado.comentario.texto,
    );

    return jsonOk(
      {
        id: resultado.comentario.id,
        texto: resultado.comentario.texto,
        respostaA: resultado.comentario.respostaA,
        criadaEm: resultado.comentario.criadoEm.toISOString(),
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof ErroComentarioDeOutroEvento) {
      return errorResponse(403, "comentario.outro_evento", "Comentário recusado");
    }
    return unexpectedError("comentarios", e);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { max: 60 });
  if (limited) return limited;

  const eventoPedido = new URL(req.url).searchParams.get("evento");
  if (eventoPedido !== null && eventoPedido !== auth.session.eventoId) {
    return errorResponse(403, "comentarios.evento_divergente", "Esta sessão não pertence a este evento");
  }

  const parsed = await parseJsonBody<{ comentarioId?: unknown }>(req);
  if (parsed instanceof Response) return parsed;

  const comentarioId =
    typeof parsed.data.comentarioId === "string" && UUID_RE.test(parsed.data.comentarioId)
      ? parsed.data.comentarioId
      : null;
  if (!comentarioId) {
    return errorResponse(422, "validation_error", "Comentário inválido", { campos: ["comentarioId"] });
  }

  try {
    const removido = await comEvento(getPool(), auth.session.eventoId, async (c) => {
      const gate = await gateDoEvento(c, auth.session.eventoId);
      if (!gate || modoInteracao(gate, new Date()) !== "completo") return false;
      return removerComentario(c, { comentarioId, sessaoId: auth.session.sessaoId });
    });

    if (!removido) return errorResponse(403, "comentario.remover_negado", "Não foi possível remover");

    return jsonOk({ comentarioId, removido: true });
  } catch (e) {
    return unexpectedError("comentarios.remover", e);
  }
}
