import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { parsePiecesQuery, PIECE_TYPES } from "@/lib/parse-pieces-query";
import { PRINT_FORMATS } from "@/lib/pack-print-pieces";
import { consume } from "@/lib/rate-limit-store";
import { generatePrintPieces, type PrintPieceRequest } from "@/lib/application/use-cases/admin";

/** Gera peça impressa (SVG, PDF ou ZIP) com sangria, QR nível H e URL legível — `tipo=pdf` é vetorial, dezenas de KB, não raster 300dpi. */
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
    const request: PrintPieceRequest = 
      pedido.kind === "zip"
        ? { kind: "zip", includeSvg: pedido.includeSvg }
        : { kind: "single", tipo: pedido.tipo, formato: pedido.formato };

    const resultado = await generatePrintPieces(
      {
        accountId: auth.host.accountId,
        eventId,
        pedido: request,
        origin: url.origin,
        host: url.host,
      },
      getPool(),
    );

    if (!resultado.ok) {
      return errorResponse(
        422,
        resultado.code,
        resultado.message,
        resultado.details,
      );
    }

    const body = 
      resultado.kind === "zip" ? Buffer.from(resultado.zip) :
      resultado.kind === "pdf" ? Buffer.from(resultado.pdf) :
      resultado.svg;

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": resultado.contentType,
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="${resultado.filename}"`,
        "x-albora-avisos": encodeURIComponent(JSON.stringify(resultado.avisos)),
      },
    });
  } catch (e) {
    return unexpectedError("admin.pecas", e);
  }
}
