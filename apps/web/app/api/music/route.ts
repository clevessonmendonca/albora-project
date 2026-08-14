import {
  exibirMusica,
  lerLinkDeMusica,
  ordenarSugestoes,
  registrarSugestao,
  votos,
} from "@albora/core";
import {
  adicionarSugestao,
  comEvento,
  gateDoEvento,
  listarSugestoes,
  musicaDoCasal,
} from "@albora/db";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

type Corpo = { url?: unknown; evento?: unknown };

export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const eventoPedido = new URL(req.url).searchParams.get("evento");
  if (eventoPedido !== null && eventoPedido !== auth.session.eventoId) {
    console.warn("musica.evento_divergente", { eventoId: auth.session.eventoId, sessaoId: auth.session.sessaoId });
    return errorResponse(403, "musica.evento_divergente", "Esta sessão não pertence a este evento");
  }

  try {
    const corpo = await comEvento(getPool(), auth.session.eventoId, async (c) => {
      const escolhida = await musicaDoCasal(c, auth.session.eventoId);
      const fila = ordenarSugestoes(await listarSugestoes(c, auth.session.eventoId));
      return { escolhida, fila };
    });

    const musica = corpo.escolhida
      ? { provedor: corpo.escolhida.link.provedor, ...exibirMusica(corpo.escolhida.link, corpo.escolhida.metadado) }
      : null;

    const sugestoes = corpo.fila.map((f) => ({
      provedor: f.link.provedor,
      tipo: f.link.tipo,
      url: f.link.url,
      votos: votos(f),
    }));

    return jsonOk({ musica, sugestoes });
  } catch (e) {
    return unexpectedError("musica.get", e);
  }
}

export async function POST(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { max: 30 });
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  if (parsed.data.evento !== undefined && parsed.data.evento !== auth.session.eventoId) {
    console.warn("musica.evento_divergente", { eventoId: auth.session.eventoId, sessaoId: auth.session.sessaoId });
    return errorResponse(403, "musica.evento_divergente", "Esta sessão não pertence a este evento");
  }

  if (typeof parsed.data.url !== "string") {
    return errorResponse(422, "validation_error", "Dados incompletos", { campos: ["url"] });
  }

  const lido = lerLinkDeMusica(parsed.data.url);
  if (!lido.ok) {
    console.warn("musica.link_recusado", { eventoId: auth.session.eventoId, code: lido.erro.code });
    return errorResponse(422, lido.erro.code, "Link não aceito", lido.erro.details);
  }
  const link = lido.link;

  try {
    const resultado = await comEvento(getPool(), auth.session.eventoId, async (c) => {
      const gate = await gateDoEvento(c, auth.session.eventoId);
      if (!gate) return { tipo: "fechado" as const };

      const fila = await listarSugestoes(c, auth.session.eventoId);
      const decisao = registrarSugestao(fila, { sessaoId: auth.session.sessaoId, link }, gate, new Date());
      if (!decisao.ok) return { tipo: "recusada" as const, erro: decisao.erro };

      await adicionarSugestao(c, { eventoId: auth.session.eventoId, sessaoId: auth.session.sessaoId, link });
      const atual = ordenarSugestoes(await listarSugestoes(c, auth.session.eventoId));
      return { tipo: "aceita" as const, fila: atual };
    });

    if (resultado.tipo === "fechado") {
      return errorResponse(403, "musica.interacao_fechada", "A interação ainda não abriu");
    }

    if (resultado.tipo === "recusada") {
      const status = resultado.erro.code === "musica.interacao_fechada" ? 403 : 422;
      return errorResponse(status, resultado.erro.code, "Sugestão recusada", resultado.erro.details);
    }

    console.log("musica.sugestao", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      provedor: link.provedor,
    });

    const sugestoes = resultado.fila.map((f) => ({
      provedor: f.link.provedor,
      tipo: f.link.tipo,
      url: f.link.url,
      votos: votos(f),
    }));

    return jsonOk({ aceita: true, sugestoes });
  } catch (e) {
    return unexpectedError("musica.post", e);
  }
}
