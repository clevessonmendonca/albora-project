import {
  apagarPostDaComunidade,
  apagarResposta,
  comConta,
  criarPostDaComunidade,
  ehTopicoDaComunidade,
  lerPostDaComunidade,
  responderPost,
} from "@albora/db";
import {
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

const LIMITE_TITULO = 160;
const LIMITE_CORPO = 4000;

type CorpoDePost = { topico?: unknown; titulo?: unknown; corpo?: unknown };
type CorpoDeResposta = { corpo?: unknown };

function texto(valor: unknown, maximo: number): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  if (limpo.length === 0 || limpo.length > maximo) return null;
  return limpo;
}

/**
 * Comunidade é dado de **conta**, não de evento (ADR 0017): todo caminho aqui
 * roda sob `comConta`, e o `accountId` vem sempre da sessão de host resolvida,
 * nunca do corpo da requisição.
 */
export async function POST(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, {
    code: "admin.sem_sessao",
    message: "Entre no painel para publicar na comunidade",
  });
  if (auth instanceof Response) return auth;

  const limite = consume(`comunidade_post:${auth.host.accountId}`, 10, 300, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante antes de publicar de novo", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<CorpoDePost>(req);
  if (parsed instanceof Response) return parsed;
  const body = parsed.data;

  if (!ehTopicoDaComunidade(body.topico)) {
    return errorResponse(422, "comunidade.topico_invalido", "Escolha um assunto para a conversa");
  }

  const titulo = texto(body.titulo, LIMITE_TITULO);
  if (!titulo) {
    return errorResponse(422, "comunidade.titulo_invalido", "Dê um título à conversa");
  }

  const corpo = texto(body.corpo, LIMITE_CORPO);
  if (!corpo) {
    return errorResponse(422, "comunidade.corpo_invalido", "Escreva a mensagem");
  }

  try {
    const id = await comConta(getPool(), auth.host.accountId, (c) =>
      criarPostDaComunidade(c, {
        contaId: auth.host.accountId,
        topico: body.topico as Parameters<typeof criarPostDaComunidade>[1]["topico"],
        titulo,
        corpo,
      }),
    );

    return jsonOk({ id }, { status: 201 });
  } catch (erro) {
    return unexpectedError("admin.comunidade.criar", erro);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ postId: string }> }) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, {
    code: "admin.sem_sessao",
    message: "Entre no painel para apagar a conversa",
  });
  if (auth instanceof Response) return auth;

  const { postId } = await ctx.params;
  if (!UUID_RE.test(postId)) {
    return errorResponse(422, "comunidade.post_invalido", "Conversa não encontrada");
  }

  try {
    const apagou = await comConta(getPool(), auth.host.accountId, (c) =>
      apagarPostDaComunidade(c, auth.host.accountId, postId),
    );

    // Mesma resposta para "não existe" e "não é seu": a política já recusou, e
    // distinguir os dois casos revelaria que a conversa existe.
    if (!apagou) {
      return errorResponse(404, "comunidade.post_ausente", "Conversa não encontrada");
    }

    return jsonOk({ ok: true });
  } catch (erro) {
    return unexpectedError("admin.comunidade.apagar", erro);
  }
}

export async function RESPONDER(req: Request, ctx: { params: Promise<{ postId: string }> }) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, {
    code: "admin.sem_sessao",
    message: "Entre no painel para responder",
  });
  if (auth instanceof Response) return auth;

  const { postId } = await ctx.params;
  if (!UUID_RE.test(postId)) {
    return errorResponse(422, "comunidade.post_invalido", "Conversa não encontrada");
  }

  const limite = consume(`comunidade_resposta:${auth.host.accountId}`, 30, 300, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante antes de responder de novo", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<CorpoDeResposta>(req);
  if (parsed instanceof Response) return parsed;

  const corpo = texto(parsed.data.corpo, LIMITE_CORPO);
  if (!corpo) {
    return errorResponse(422, "comunidade.corpo_invalido", "Escreva a resposta");
  }

  try {
    const id = await comConta(getPool(), auth.host.accountId, async (c) => {
      const post = await lerPostDaComunidade(c, auth.host.accountId, postId);
      if (!post) return null;
      return responderPost(c, { contaId: auth.host.accountId, postId, corpo });
    });

    if (!id) {
      return errorResponse(404, "comunidade.post_ausente", "Conversa não encontrada");
    }

    return jsonOk({ id }, { status: 201 });
  } catch (erro) {
    return unexpectedError("admin.comunidade.responder", erro);
  }
}

export async function APAGAR_RESPOSTA(
  req: Request,
  ctx: { params: Promise<{ respostaId: string }> },
) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, {
    code: "admin.sem_sessao",
    message: "Entre no painel para apagar a resposta",
  });
  if (auth instanceof Response) return auth;

  const { respostaId } = await ctx.params;
  if (!UUID_RE.test(respostaId)) {
    return errorResponse(422, "comunidade.resposta_invalida", "Resposta não encontrada");
  }

  try {
    const apagou = await comConta(getPool(), auth.host.accountId, (c) =>
      apagarResposta(c, auth.host.accountId, respostaId),
    );

    if (!apagou) {
      return errorResponse(404, "comunidade.resposta_ausente", "Resposta não encontrada");
    }

    return jsonOk({ ok: true });
  } catch (erro) {
    return unexpectedError("admin.comunidade.apagar_resposta", erro);
  }
}
