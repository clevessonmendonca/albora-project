import { comConta } from "@albora/db";
import { PACKS } from "@albora/packs";
import {
  ALBORA_BRAND,
  resolveTokens,
  type TokenLayer,
  type PieceFormat,
} from "@albora/tokens";
import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { generatePiecePdf } from "@/lib/generate-piece-pdf";
import { generatePieceSvg } from "@/lib/generate-piece-svg";
import { identityToFrame } from "@/lib/frame-identity";
import { eventEntryUrl } from "@/lib/qr";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FORMATOS: PieceFormat[] = ["placa-a4", "card-de-mesa", "card-de-missao"];
const TIPOS = ["svg", "pdf"] as const;

type TipoPeca = (typeof TIPOS)[number];

function comoFormato(valor: string | null): PieceFormat | null {
  if (!valor) return null;
  return FORMATOS.includes(valor as PieceFormat) ? (valor as PieceFormat) : null;
}

function comoTipo(valor: string | null): TipoPeca | null {
  if (!valor) return "svg";
  return TIPOS.includes(valor as TipoPeca) ? (valor as TipoPeca) : null;
}

async function tokensDoEvento(
  accountId: string,
  eventId: string,
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
    }>("SELECT slug, pack_id, starts_at, identity_tokens FROM events WHERE id = $1", [eventId]);
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
 * Gera peça impressa (SVG ou PDF) com sangria, QR nível H e URL legível.
 *
 * `tipo=pdf` é vetorial no request — dezenas de KB, não raster 300 dpi.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;
  const owned = await requireHostEvent(auth.host.accountId, eventId);
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

  const tipo = comoTipo(url.searchParams.get("tipo"));
  if (!tipo) {
    return errorResponse(422, "validation_error", "Tipo inválido", {
      campo: "tipo",
      aceitos: TIPOS,
    });
  }

  try {
    const dados = await tokensDoEvento(auth.host.accountId, eventId);
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
    const entrada = {
      formato,
      urlQr: eventEntryUrl(origem, dados.slug, "qr"),
      urlLegivel: `${url.host}/e/${dados.slug}`,
      monograma: identidade.monograma,
      titulo: identidade.titulo,
      data: identidade.data,
      cores: tokens.cores,
    };

    if (tipo === "pdf") {
      const resultado = await generatePiecePdf(entrada);
      if (resultado.problemas.length > 0) {
        return errorResponse(422, "peca.invalida", "Esta peça não passa na validação", {
          problemas: resultado.problemas,
          avisos: resultado.avisos,
        });
      }
      console.log("admin.peca_gerada", {
        accountId: auth.host.accountId,
        eventId,
        formato,
        tipo,
      });
      return new Response(Buffer.from(resultado.pdf), {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "cache-control": "no-store",
          "content-disposition": `attachment; filename="albora-${dados.slug}-${formato}.pdf"`,
          "x-albora-avisos": encodeURIComponent(JSON.stringify(resultado.avisos)),
        },
      });
    }

    const resultado = await generatePieceSvg(entrada);
    if (resultado.problemas.length > 0) {
      return errorResponse(422, "peca.invalida", "Esta peça não passa na validação", {
        problemas: resultado.problemas,
        avisos: resultado.avisos,
      });
    }

    console.log("admin.peca_gerada", {
      accountId: auth.host.accountId,
      eventId,
      formato,
      tipo,
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
