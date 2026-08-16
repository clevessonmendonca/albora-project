import {
  chaveDaFaixa,
  displayMusic,
  interactionMode,
  ordenarSugestoes,
  parseMusicLink,
  registrarSugestao,
  type MetadadoDaMusica,
} from "@albora/core";
import {
  adicionarSugestao,
  comEvento,
  gateDoEvento,
  listarSugestoes,
  musicaDoCasal,
} from "@albora/db";
import { queueForScreen } from "@/features/music/lib/queue-for-screen";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  rejectGuestEventMismatch,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { buscarMetadadoDaMusica } from "@/lib/music-metadata";

type Corpo = { url?: unknown; evento?: unknown };

export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const mismatch = rejectGuestEventQueryMismatch(req, auth.session, "musica.evento_divergente");
  if (mismatch) return mismatch;

  try {
    const corpo = await comEvento(getPool(), auth.session.eventoId, async (c) => {
      const gate = await gateDoEvento(c, auth.session.eventoId);
      const escolhida = await musicaDoCasal(c, auth.session.eventoId);
      const fila = ordenarSugestoes(await listarSugestoes(c, auth.session.eventoId));
      return {
        escolhida,
        fila,
        interacao: gate ? interactionMode(gate, new Date()) : ("espelho" as const),
      };
    });

    const musica = corpo.escolhida
      ? { provedor: corpo.escolhida.link.provedor, ...displayMusic(corpo.escolhida.link, corpo.escolhida.metadado) }
      : null;

    return jsonOk({
      musica,
      sugestoes: queueForScreen(corpo.fila),
      interacao: corpo.interacao,
    });
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

  const mismatch = rejectGuestEventMismatch(
    parsed.data.evento,
    auth.session,
    "musica.evento_divergente",
  );
  if (mismatch) return mismatch;

  if (typeof parsed.data.url !== "string") {
    return errorResponse(422, "validation_error", "Dados incompletos", { campos: ["url"] });
  }

  const lido = parseMusicLink(parsed.data.url);
  if (!lido.ok) {
    console.warn("musica.link_recusado", { eventoId: auth.session.eventoId, code: lido.erro.code });
    return errorResponse(422, lido.erro.code, "Link não aceito", lido.erro.details);
  }
  const link = lido.link;
  const chave = chaveDaFaixa(link);

  let metadado: MetadadoDaMusica | null = null;
  try {
    const filaAtual = await comEvento(getPool(), auth.session.eventoId, (c) =>
      listarSugestoes(c, auth.session.eventoId),
    );
    const existente = filaAtual.find((f) => f.chave === chave);
    metadado = existente?.metadado?.titulo
      ? (existente.metadado ?? null)
      : await buscarMetadadoDaMusica(link);
  } catch {
    metadado = null;
  }

  try {
    const resultado = await comEvento(getPool(), auth.session.eventoId, async (c) => {
      const gate = await gateDoEvento(c, auth.session.eventoId);
      if (!gate) return { tipo: "fechado" as const };

      const fila = await listarSugestoes(c, auth.session.eventoId);
      const decisao = registrarSugestao(fila, { sessaoId: auth.session.sessaoId, link }, gate, new Date());
      if (!decisao.ok) return { tipo: "recusada" as const, erro: decisao.erro };

      await adicionarSugestao(c, {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
        link,
        metadado,
      });
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

    return jsonOk({ aceita: true, sugestoes: queueForScreen(resultado.fila) });
  } catch (e) {
    return unexpectedError("musica.post", e);
  }
}
