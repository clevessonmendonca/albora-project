import {
  montarAlbum,
  podeBaixarZip,
  TETO_DE_PAGINAS_PADRAO,
} from "@albora/core";
import {
  eventPack,
  janelaDoAlbum,
  listarMidiaDoAlbum,
  type MidiaDoAlbumComChave,
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
import { readThumb, bufferObject } from "@/lib/r2";

export const dynamic = "force-dynamic";

/** Slots únicos que aparecem nas páginas do álbum — só os primeiros N. */
function slotIdsDoAlbum(album: ReturnType<typeof montarAlbum>, teto: number): string[] {
  const vistos = new Set<string>();
  for (const cap of album.capitulos) {
    for (const pag of cap.paginas) {
      for (const foto of pag.fotos) {
        if (vistos.size >= teto) return [...vistos];
        vistos.add(foto.midia.id);
      }
    }
  }
  return [...vistos];
}

const TETO_SLOTS_PDF = 80;
const TETO_BYTES_THUMB = 512 * 1024;

/**
 * Busca a thumb de cada mídia que aparece nas páginas do livro.
 * Prioriza `/thumb`; cai para `/full` se a thumb não existir.
 * Pula silenciosamente se o objeto ultrapassar TETO_BYTES_THUMB.
 */
async function fetchThumbsParaPdf(
  ids: string[],
  midias: MidiaDoAlbumComChave[],
): Promise<Map<string, Uint8Array>> {
  const chaveMap = new Map<string, MidiaDoAlbumComChave>(midias.map((m) => [m.id, m]));
  const imagens = new Map<string, Uint8Array>();

  await Promise.all(
    ids.map(async (id) => {
      const m = chaveMap.get(id);
      if (!m) return;

      let bytes: Uint8Array | null = null;
      try {
        bytes = await readThumb(m.chaveThumb);
        if (!bytes) {
          bytes = await bufferObject(m.chaveFull);
        }
      } catch {
        return;
      }

      if (!bytes || bytes.byteLength > TETO_BYTES_THUMB) return;
      imagens.set(id, bytes);
    }),
  );

  return imagens;
}

/**
 * PDF sRGB do livro curado (slots do núcleo).
 * Thumbs do R2 embutidas — gap: CMYK (Ghostscript) na fatia seguinte.
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

    const ids = slotIdsDoAlbum(album, TETO_SLOTS_PDF);
    const imagens = await fetchThumbsParaPdf(ids, data.midias);

    const result = await generateBookPdf({
      album,
      tituloDoCapitulo: (id) => chapterTitle(pack, id),
      imagens,
    });

    const slug = owned.evento.slug ?? "livro";
    return new Response(Buffer.from(result.pdf), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="livro-${slug}.pdf"`,
        "cache-control": "private, no-store",
        "x-albora-book-pages": String(result.paginas),
        "x-albora-book-photos": String(result.comFotos),
      },
    });
  } catch (e) {
    return unexpectedError("admin.book_pdf", e);
  }
}
