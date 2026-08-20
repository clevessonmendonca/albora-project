import { withAccount, withEvent, listChallenges, recordProductEvent } from "@albora/db";
import { PACKS } from "@albora/packs";
import {
  ALBORA_BRAND,
  resolveTokens,
  type TokenLayer,
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
import { packPrintPieces, PRINT_FORMATS } from "@/lib/pack-print-pieces";
import { parsePiecesQuery, PIECE_TYPES } from "@/lib/parse-pieces-query";
import { missionTitlesForPrint } from "@/lib/piece-missions";
import { identityToFrame } from "@/lib/frame-identity";
import { eventEntryUrl } from "@/lib/qr";
import { consume } from "@/lib/rate-limit-store";

async function tokensDoEvento(
  accountId: string,
  eventId: string,
): Promise<{
  slug: string;
  packId: string;
  comecaEm: Date;
  identityTokens: Record<string, unknown>;
} | null> {
  return withAccount(getPool(), accountId, async (c) => {
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

function pieceFile(
  body: BodyInit,
  contentType: string,
  filename: string,
  avisos: string[],
): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="${filename}"`,
      "x-albora-avisos": encodeURIComponent(JSON.stringify(avisos)),
    },
  });
}

function invalidPiece(problemas: string[], avisos: string[]): Response {
  return errorResponse(422, "peca.invalida", "Esta peça não passa na validação", {
    problemas,
    avisos,
  });
}

/**
 * Gera peça impressa (SVG, PDF ou ZIP das três) com sangria, QR nível H e URL
 * legível. `tipo=pdf` é vetorial no request — dezenas de KB, não raster 300 dpi.
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
  const pedido = parsePiecesQuery(url.searchParams);
  if (!pedido.ok) {
    return errorResponse(422, "validation_error", pedido.campo === "tipo" ? "Tipo inválido" : "Formato inválido", {
      campo: pedido.campo,
      aceitos: pedido.campo === "tipo" ? PIECE_TYPES : PRINT_FORMATS,
    });
  }

  try {
    const [dados, desafios] = await Promise.all([
      tokensDoEvento(auth.host.accountId, eventId),
      withEvent(getPool(), eventId, (c) => listChallenges(c, eventId, null)),
    ]);
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
    const base = {
      urlQr: eventEntryUrl(origem, dados.slug, "qr"),
      urlLegivel: `${url.host}/e/${dados.slug}`,
      monograma: identidade.monograma,
      titulo: identidade.titulo,
      data: identidade.data,
      cores: tokens.cores,
      missoes: missionTitlesForPrint(
        pack,
        desafios.map((d) => d.chaveTitulo),
      ),
    };

    if (pedido.kind === "zip") {
      const resultado = await packPrintPieces(base, {
        slug: dados.slug,
        includeSvg: pedido.includeSvg,
      });
      if (resultado.problemas.length > 0) return invalidPiece(resultado.problemas, resultado.avisos);
      
      void recordProductEvent(getPool(), "qr_downloaded");
      
      console.log("admin.pecas_zip", {
        accountId: auth.host.accountId,
        eventId,
        arquivos: resultado.arquivos,
      });
      return pieceFile(
        Buffer.from(resultado.zip),
        "application/zip",
        `albora-${dados.slug}-pecas.zip`,
        resultado.avisos,
      );
    }

    const entrada = { ...base, formato: pedido.formato };

    if (pedido.tipo === "pdf") {
      const resultado = await generatePiecePdf(entrada);
      if (resultado.problemas.length > 0) return invalidPiece(resultado.problemas, resultado.avisos);
      
      void recordProductEvent(getPool(), "qr_downloaded");
      
      console.log("admin.peca_gerada", {
        accountId: auth.host.accountId,
        eventId,
        formato: pedido.formato,
        tipo: pedido.tipo,
      });
      return pieceFile(
        Buffer.from(resultado.pdf),
        "application/pdf",
        `albora-${dados.slug}-${pedido.formato}.pdf`,
        resultado.avisos,
      );
    }

    const resultado = await generatePieceSvg(entrada);
    if (resultado.problemas.length > 0) return invalidPiece(resultado.problemas, resultado.avisos);
    console.log("admin.peca_gerada", {
      accountId: auth.host.accountId,
      eventId,
      formato: pedido.formato,
      tipo: pedido.tipo,
    });
    return pieceFile(
      resultado.svg,
      "image/svg+xml; charset=utf-8",
      `albora-${dados.slug}-${pedido.formato}.svg`,
      resultado.avisos,
    );
  } catch (e) {
    return unexpectedError("admin.pecas", e);
  }
}
