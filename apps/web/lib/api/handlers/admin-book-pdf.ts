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
import type { TokenLayer } from "@albora/tokens";
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

/** Aviso sRGB adicionado em todos os PDFs do livro — espelha o `colorWarning` das peças. */
const AVISO_SRGB =
  "sRGB: o PDF foi gerado em perfil sRGB prepress. A cor do acento pode sair um pouco mais apagada na impressão CMYK. Peça uma prova impressa antes da tiragem inteira.";

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

/** Thumb de cada mídia do livro: prioriza `/thumb`, cai para `/full`; pula silenciosamente acima de `TETO_BYTES_THUMB`. */
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
    const pool = getPool();
    const data = await withEvent(pool, eventId, async (c) => {
      const plano = await planoDoEvento(c, eventId);
      const midias = await listarMidiaDoAlbum(c, eventId);
      const janela = await janelaDoAlbum(c, eventId);
      const packId = await eventPack(c, eventId);

      const { rows: evRows } = await c.query<{
        vendor_id: string | null;
        identity_tokens: Record<string, unknown>;
      }>("SELECT vendor_id, identity_tokens FROM events WHERE id = $1", [eventId]);
      const evRow = evRows[0];

      let vendorBrandTokens: Record<string, unknown> | null = null;
      if (evRow?.vendor_id) {
        const { rows: vRows } = await c.query<{ brand_tokens: Record<string, unknown> }>(
          "SELECT brand_tokens FROM vendors WHERE id = $1",
          [evRow.vendor_id],
        );
        vendorBrandTokens = vRows[0]?.brand_tokens ?? null;
      }

      return {
        plano,
        midias,
        janela,
        packId,
        vendorBrandTokens,
        identityTokens: (evRow?.identity_tokens ?? {}) as Record<string, unknown>,
      };
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

    const vendorTokens =
      data.vendorBrandTokens && Object.keys(data.vendorBrandTokens).length > 0
        ? (data.vendorBrandTokens as TokenLayer)
        : undefined;
    const eventoTokens =
      Object.keys(data.identityTokens).length > 0
        ? (data.identityTokens as TokenLayer)
        : undefined;

    const result = await generateBookPdf({
      album,
      tituloDoCapitulo: (id) => chapterTitle(pack, id),
      imagens,
      ...(vendorTokens ? { vendorTokens } : {}),
      ...(pack?.tokens ? { packTokens: pack.tokens } : {}),
      ...(eventoTokens ? { eventoTokens } : {}),
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
        "x-albora-avisos": AVISO_SRGB,
      },
    });
  } catch (e) {
    return unexpectedError("admin.book_pdf", e);
  }
}
