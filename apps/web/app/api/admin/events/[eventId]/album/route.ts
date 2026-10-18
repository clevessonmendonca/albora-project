import { capituloDe } from "@albora/core";
import { PACKS } from "@albora/packs";
import {
  withEvent,
  eventPack,
  eventTokens,
  janelaDoAlbum,
  destacarMidiaDoHost,
  definirCapsulaDeMemoria,
  listarMidiaDoAlbum,
  marcarAlbumVisto,
  ocultarMidiaDoHost,
  reexibirMidiaDoHost,
  removerMidiaDoHost,
} from "@albora/db";
import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { assinarGet } from "@/lib/r2";
import { chapterIdsFromPack, planAlbumChapters } from "@/lib/album-chapters";
import { momentosDoPackEvento } from "@/lib/momentos-do-evento";

export const dynamic = "force-dynamic";

const VALIDADE_GET_SEGUNDOS = 900;

type Corpo = { midiaId?: unknown; acao?: unknown; ligada?: unknown };

/**
 * Ocultar é reversível; remover não. São verbos diferentes de propósito — a
 * tela precisa conseguir oferecer "Desfazer" para um e confirmação para o
 * outro. Sem `acao` é ocultar, que é o que os chamadores antigos mandavam.
 */
const ACOES = {
  ocultar: ocultarMidiaDoHost,
  reexibir: reexibirMidiaDoHost,
  remover: removerMidiaDoHost,
} as const;

type Acao = keyof typeof ACOES | "destacar" | "desdestacar" | "visto" | "capsula";

function ehAcao(v: unknown): v is Acao {
  return (
    v === "ocultar" ||
    v === "reexibir" ||
    v === "remover" ||
    v === "destacar" ||
    v === "desdestacar" ||
    v === "visto" ||
    v === "capsula"
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false, mediaOrigin: true });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_album:${auth.host.accountId}`, 60, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const owned = await requireHostEvent(auth.host.accountId, eventId);
    if (owned instanceof Response) return owned;

    const busca = new URL(req.url).searchParams;
    const somenteDestaques = busca.get("aba") === "destaques";
    const sessaoId = busca.get("sessaoId") ?? undefined;
    const dados = await withEvent(getPool(), eventId, async (c) => {
      const midias = await listarMidiaDoAlbum(c, eventId, 120, {
        somenteDestaques,
        ...(sessaoId ? { sessaoId } : {}),
      });
      const janela = await janelaDoAlbum(c, eventId);
      const packId = await eventPack(c, eventId);
      const tokens = await eventTokens(c, eventId);
      const ids = [...new Set(midias.map((m) => m.sessaoId))];
      const { rows } = ids.length
        ? await c.query<{ id: string; display_name: string }>(
            "SELECT id, display_name FROM guest_sessions WHERE event_id = $1 AND id = ANY($2::uuid[])",
            [eventId, ids],
          )
        : { rows: [] as { id: string; display_name: string }[] };
      return { midias, janela, packId, tokens, nomes: new Map(rows.map((r) => [r.id, r.display_name])) };
    });
    const { midias } = dados;

    const pack = dados.packId ? PACKS[dados.packId] : undefined;
    const momentos = momentosDoPackEvento(pack, dados.tokens);
    const capitulos = dados.janela
      ? planAlbumChapters(
          {
            comecaEm: dados.janela.comecaEm,
            terminaEm: dados.janela.terminaEm,
            offsetMinutos: dados.janela.offsetMinutos,
          },
          pack,
          dados.tokens,
        )
      : [];
    const idsDosMomentos = new Set(chapterIdsFromPack(pack, dados.tokens));

    const itens = await Promise.all(
      midias.map(async (m) => {
        const capitulo = capitulos.length > 0 ? capituloDe(m.capturadaEm ?? m.recebidaEm, capitulos) : null;
        return {
          id: m.id,
          sessaoId: m.sessaoId,
          missaoId: m.missaoId,
          lugarId: m.lugarId,
          momentoId: capitulo !== null && idsDosMomentos.has(capitulo) ? capitulo : null,
          reacoes: m.reacoes,
          destacada: m.destacadaEm !== null,
          criadaEm: m.recebidaEm.toISOString(),
          thumb: await assinarGet(m.chaveThumb, VALIDADE_GET_SEGUNDOS),
        };
      }),
    );

    const contagemPorPessoa = new Map<string, number>();
    for (const m of midias) contagemPorPessoa.set(m.sessaoId, (contagemPorPessoa.get(m.sessaoId) ?? 0) + 1);
    const pessoas = [...contagemPorPessoa.entries()]
      .map(([id, fotos]) => ({ id, nome: dados.nomes.get(id) ?? "Convidado", fotos }))
      .sort((a, b) => b.fotos - a.fotos || a.nome.localeCompare(b.nome, "pt-BR"));

    return jsonOk({ itens, total: itens.length, momentos, pessoas });
  } catch (e) {
    return unexpectedError("admin.album", e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;
  const corpo = parsed.data;

  const acaoPedida: Acao = ehAcao(corpo.acao) ? corpo.acao : "ocultar";

  // "capsula" e "visto" são sobre o evento, não sobre uma foto.
  if (acaoPedida === "capsula") {
    try {
      const mudou = await definirCapsulaDeMemoria(
        getPool(),
        auth.host.accountId,
        eventId,
        corpo.ligada === true,
      );
      if (!mudou) return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
      return jsonOk({ capsula: corpo.ligada === true });
    } catch (e) {
      return unexpectedError("admin.album", e);
    }
  }

  // "visto" é sobre o evento, não sobre uma foto — não exige `midiaId`.
  if (acaoPedida === "visto") {
    try {
      const marcou = await marcarAlbumVisto(getPool(), auth.host.accountId, eventId);
      if (!marcou) return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
      return jsonOk({ visto: true });
    } catch (e) {
      return unexpectedError("admin.album", e);
    }
  }

  const midiaId = typeof corpo.midiaId === "string" ? corpo.midiaId : "";
  if (!midiaId) {
    return errorResponse(422, "validation_error", "midiaId obrigatório", { campos: ["midiaId"] });
  }

  const acao = acaoPedida;

  try {
    if (acao === "destacar" || acao === "desdestacar") {
      const mudou = await destacarMidiaDoHost(
        getPool(),
        auth.host.accountId,
        eventId,
        midiaId,
        acao === "destacar",
      );
      if (!mudou) return errorResponse(404, "midia.nao_encontrada", "Foto não encontrada");
      return jsonOk({ destacada: acao === "destacar" });
    }

    const mudou = await ACOES[acao as keyof typeof ACOES](
      getPool(),
      auth.host.accountId,
      eventId,
      midiaId,
    );
    if (!mudou) return errorResponse(404, "midia.nao_encontrada", "Foto não encontrada");
    return jsonOk({ acao, oculta: acao === "ocultar" });
  } catch (e) {
    return unexpectedError("admin.album", e);
  }
}
