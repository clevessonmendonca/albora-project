import {
  CAPITULO_SEM_HORA,
  CAPITULO_UNICO,
  planejarCapitulos,
  type CapituloPlanejado,
  type JanelaDoEvento,
} from "@albora/core";
import { resolvePackText, type Pack } from "@albora/packs";

/**
 * Os capítulos da noite são os momentos do pack, na ordem em que ela acontece.
 * Sem momentos, o núcleo monta um capítulo só (`a-noite`).
 */
export function chapterIdsFromPack(pack: Pack | undefined): string[] {
  return pack?.momentos?.map((m) => m.id) ?? [];
}

export function planAlbumChapters(
  janela: JanelaDoEvento,
  pack: Pack | undefined,
): CapituloPlanejado[] {
  return planejarCapitulos(janela, chapterIdsFromPack(pack));
}

/**
 * Título que o convidado lê. Momento do pack resolve pelo vocabulário;
 * `a-noite` e `sem-hora` são do álbum, não do vertical.
 */
export function chapterTitle(pack: Pack | undefined, id: string): string {
  if (id === CAPITULO_SEM_HORA) return "Durante a festa";
  if (id === CAPITULO_UNICO) return "A noite";
  const momento = pack?.momentos?.find((m) => m.id === id);
  if (!momento || !pack) return id;
  return resolvePackText(pack, momento.chaveTitulo);
}

export function chapterHeadingVisible(id: string): boolean {
  return id !== CAPITULO_SEM_HORA && id !== CAPITULO_UNICO;
}
