import {
  ADMIN_SESSION_REQUIRED,
  COUPLE_HOST_ROLES,
  errorResponse,
  requireConfig,
  requireHostEventRole,
  requireHostSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { generateBookPdfUseCase } from "@/lib/application/use-cases/admin";

export const dynamic = "force-dynamic";

const AVISO_SRGB =
  "sRGB: o PDF foi gerado em perfil sRGB prepress. A cor do acento pode sair um pouco mais apagada na impressão CMYK. Peça uma prova impressa antes da tiragem inteira.";

/** PDF sRGB do livro curado: thumbs do R2 embutidas — CMYK (Ghostscript) fica para a fatia seguinte. */
export async function getAdminBookPdf(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  const cfgErr = requireConfig("admin.book", { mediaOrigin: true });
  if (cfgErr) return cfgErr;

  if (!UUID_RE.test(eventId)) {
    return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
  }

  const url = new URL(req.url);
  if (url.searchParams.get("perfil") === "cmyk") {
    return errorResponse(
      422,
      "book.cmyk_indisponivel",
      "Conversão CMYK não está disponível neste ambiente. O PDF é gerado em perfil sRGB prepress — peça uma prova impressa antes da tiragem. Para impressão profissional CMYK, use Ghostscript em um job offline fora do Worker (consulte docs/runbooks/cmyk-ghostscript.md).",
    );
  }

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const owned = await requireHostEventRole(auth.host.accountId, eventId, COUPLE_HOST_ROLES);
  if (owned instanceof Response) return owned;

  try {
    const resultado = await generateBookPdfUseCase(
      { eventId, eventSlug: owned.evento.slug },
      getPool(),
    );

    if (!resultado.ok) {
      const statusCode = resultado.code === "plano.insuficiente" ? 403 : 422;
      return errorResponse(statusCode, resultado.code, resultado.message);
    }

    return new Response(Buffer.from(resultado.pdf), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="livro-${resultado.slug}.pdf"`,
        "cache-control": "private, no-store",
        "x-albora-book-pages": String(resultado.paginas),
        "x-albora-book-photos": String(resultado.comFotos),
        "x-albora-avisos": AVISO_SRGB,
      },
    });
  } catch (e) {
    return unexpectedError("admin.book_pdf", e);
  }
}
