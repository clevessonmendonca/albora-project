import { comConta } from "@albora/db";
import { PACKS } from "@albora/packs";
import {
  ALBORA_BRAND,
  resolveTokens,
  type TokenLayer,
  type PieceFormat,
} from "@albora/tokens";
import {
  errorResponse,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { generatePieceSvg } from "@/lib/generate-piece-svg";
import { identityToFrame } from "@/lib/frame-identity";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

const FORMATOS: PieceFormat[] = ["placa-a4", "card-de-mesa", "card-de-missao"];

const ADMIN_SESSAO = {
  code: "admin.sem_sessao",
  message: "Entre no painel para continuar",
} as const;

function comoFormato(valor: string | null): PieceFormat | null {
  if (!valor) return null;
  return FORMATOS.includes(valor as PieceFormat) ? (valor as PieceFormat) : null;
}

async function tokensDoEvento(
  accountId: string,
  eventoId: string,
): Promise<{
  slug: string;
  packId: string;
  comecaEm: Date;
  identityTokens: Record<string, unknown>;
} | null> {
  return comConta(getPool(), accountId, async (c) => {
    const { rows } = await c.query<{
      slug: string;
      pack_id: string;
      starts_at: Date;
      identity_tokens: unknown;
    }>("SELECT slug, pack_id, starts_at, identity_tokens FROM events WHERE id = $1", [eventoId]);
    const linha = rows[0];
    if (!linha) return null;
    return {
      slug: linha.slug,
      packId: linha.pack_id,
      comecaEm: linha.starts_at,
      identityTokens: (linha.identity_tokens ?? {}) as Record<string, unknown>,
    };
  });
}

/**
 * Gera SVG de peça impressa para download (spec 009, MVP).
 *
 * PDF em fila fica para depois; o SVG já leva sangria, QR nível H e URL legível.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventoId: string }> },
) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSAO);
  if (auth instanceof Response) return auth;

  const { eventoId } = await params;
  const owned = await requireHostEvent(auth.host.accountId, eventoId);
  if (owned instanceof Response) return owned;

  const limite = consume(`admin_pecas:${auth.host.accountId}`, 30, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const url = new URL(req.url);
  const formato = comoFormato(url.searchParams.get("formato"));
  if (!formato) {
    return errorResponse(422, "validation_error", "Formato inválido", {
      campo: "formato",
      aceitos: FORMATOS,
    });
  }

  try {
    const dados = await tokensDoEvento(auth.host.accountId, eventoId);
    if (!dados) return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");

    const pack = PACKS[dados.packId];
    const tokens = resolveTokens({
      marca: ALBORA_BRAND,
      ...(pack ? { pack: pack.tokens } : {}),
      evento: dados.identityTokens as TokenLayer,
    });

    const identidade = identityToFrame(
      dados.slug,
      dados.comecaEm,
      dados.identityTokens,
      pack,
    );

    const origem = url.origin;
    const urlQr = `${origem}/e/${encodeURIComponent(dados.slug)}`;
    const urlLegivel = `${url.host}/e/${dados.slug}`;

    const resultado = await generatePieceSvg({
      formato,
      urlQr,
      urlLegivel,
      monograma: identidade.monograma,
      titulo: identidade.titulo,
      data: identidade.data,
      cores: tokens.cores,
    });

    if (resultado.problemas.length > 0) {
      return errorResponse(422, "peca.invalida", "Esta peça não passa na validação", {
        problemas: resultado.problemas,
        avisos: resultado.avisos,
      });
    }

    console.log("admin.peca_gerada", {
      accountId: auth.host.accountId,
      eventoId,
      formato,
    });

    return new Response(resultado.svg, {
      status: 200,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="albora-${dados.slug}-${formato}.svg"`,
        "x-albora-avisos": encodeURIComponent(JSON.stringify(resultado.avisos)),
      },
    });
  } catch (e) {
    return unexpectedError("admin.pecas", e);
  }
}
