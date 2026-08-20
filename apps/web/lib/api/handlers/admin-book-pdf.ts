import {
  montarAlbum,
  podeBaixarZip,
  TETO_DE_PAGINAS_PADRAO,
} from "@albora/core";
import {
  eventPack,
  janelaDoAlbum,
  listarMidiaDoAlbum,
  planoDoEvento,
  withEvent,
} from "@albora/db";
import { PACKS } from "@albora/packs";
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
import { chapterTitle, planAlbumChapters } from "@/lib/album-chapters";
import { getPool } from "@/lib/db";
import { generateBookPdf } from "@/lib/generate-book-pdf";

export const dynamic = "force-dynamic";

/**
 * PDF sRGB do livro curado (slots do núcleo). v1: placeholders sem embutir
 * JPEGs — preview print-ready da diagramação. Imagens + CMYK na fatia seguinte.
 */
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

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const owned = await requireHostEventRole(auth.host.accountId, eventId, COUPLE_HOST_ROLES);
  if (owned instanceof Response) return owned;

  try {
    const pool = getPool();
    const data = await withEvent(pool, eventId, async (c) => {
      const plano = await planoDoEvento(c, eventId);
      const midias = await listarMidiaDoAlbum(c, eventId);
      const janela = await janelaDoAlbum(c, eventId);
      const packId = await eventPack(c, eventId);
      return { plano, midias, janela, packId };
    });

    if (!podeBaixarZip(data.plano)) {
      return errorResponse(403, "plano.insuficiente", "O livro PDF entra nos planos pagos");
    }

    if (!data.janela) {
      return errorResponse(422, "evento.sem_janela", "Evento sem datas para montar o livro");
    }

    const pack = data.packId ? PACKS[data.packId] : undefined;
    const janela = {
      comecaEm: data.janela.comecaEm,
      terminaEm: data.janela.terminaEm,
      offsetMinutos: data.janela.offsetMinutos,
    };
    const album = montarAlbum(data.midias, {
      janela,
      capitulos: planAlbumChapters(janela, pack),
      tetoDePaginas: TETO_DE_PAGINAS_PADRAO,
    });

    const result = await generateBookPdf({
      album,
      tituloDoCapitulo: (id) => chapterTitle(pack, id),
    });

    const slug = owned.evento.slug ?? "livro";
    return new Response(Buffer.from(result.pdf), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="livro-${slug}.pdf"`,
        "cache-control": "private, no-store",
        "x-albora-book-pages": String(result.paginas),
      },
    });
  } catch (e) {
    return unexpectedError("admin.book_pdf", e);
  }
}
