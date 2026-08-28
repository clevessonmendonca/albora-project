/**
 * Use Case: Generate Book PDF
 *
 * Gera PDF do livro de fotos com identidade visual do evento.
 */
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
import type { Pool } from "pg";
import { chapterTitle, planAlbumChapters } from "@/lib/album-chapters";
import { generateBookPdf } from "@/lib/generate-book-pdf";
import { readThumb, bufferObject } from "@/lib/r2";

const TETO_SLOTS_PDF = 80;
const TETO_BYTES_THUMB = 512 * 1024;

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

export type GenerateBookPdfInput = {
  eventId: string;
  eventSlug: string | null;
};

export type GenerateBookPdfResult =
  | {
      ok: true;
      pdf: Uint8Array;
      paginas: number;
      comFotos: number;
      slug: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export async function generateBookPdfUseCase(
  input: GenerateBookPdfInput,
  pool: Pool,
): Promise<GenerateBookPdfResult> {
  const data = await withEvent(pool, input.eventId, async (c) => {
    const plano = await planoDoEvento(c, input.eventId);
    const midias = await listarMidiaDoAlbum(c, input.eventId);
    const janela = await janelaDoAlbum(c, input.eventId);
    const packId = await eventPack(c, input.eventId);

    const { rows: evRows } = await c.query<{
      vendor_id: string | null;
      identity_tokens: Record<string, unknown>;
    }>("SELECT vendor_id, identity_tokens FROM events WHERE id = $1", [input.eventId]);
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
    return {
      ok: false,
      code: "plano.insuficiente",
      message: "O livro PDF entra nos planos pagos",
    };
  }

  if (!data.janela) {
    return {
      ok: false,
      code: "evento.sem_janela",
      message: "Evento sem datas para montar o livro",
    };
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

  return {
    ok: true,
    pdf: result.pdf,
    paginas: result.paginas,
    comFotos: result.comFotos,
    slug: input.eventSlug ?? "livro",
  };
}
