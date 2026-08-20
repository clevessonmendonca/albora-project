import type { Album, Pagina, Proporcao } from "@albora/core";
import { BLEED_MM } from "@albora/tokens";

/** A4 retrato em mm — área de corte (trim), sem sangria. */
export const BOOK_PAGE_MM = { width: 210, height: 297 } as const;

/**
 * Sangria do livro: compartilha o valor das peças impressas (`BLEED_MM`).
 * Toda linha de corte pode sair deslocada ±1–2 mm; a sangria garante que
 * o fundo extravase o suficiente para não aparecer borda branca.
 */
export const BOOK_BLEED_MM: number = BLEED_MM;

/**
 * Caixa de corte (cut box) com sangria dos quatro lados.
 * É o tamanho físico que vai para a impressora / para o `addPage` do pdf-lib.
 * O conteúdo é deslocado `BOOK_BLEED_MM` em x e y para ficar na área de corte.
 */
export const BOOK_CUT_MM = {
  width: BOOK_PAGE_MM.width + BOOK_BLEED_MM * 2,
  height: BOOK_PAGE_MM.height + BOOK_BLEED_MM * 2,
} as const;

export const BOOK_MARGIN_MM = 14;
export const BOOK_HEADER_MM = 18;
export const BOOK_GAP_MM = 4;

export type BookSlotBox = {
  midiaId: string;
  proporcao: Proporcao;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BookPagePlan = {
  capituloId: string;
  titulo: string;
  layoutId: string;
  numero: number;
  slots: BookSlotBox[];
};

/**
 * Posiciona os slots de uma página do núcleo dentro da área útil A4.
 * Diagramação por slots — nunca posicionamento livre (task-020 B-09).
 */
export function planBookPage(
  pagina: Pagina,
  opts: { titulo: string; numero: number },
): BookPagePlan {
  const contentX = BOOK_MARGIN_MM;
  const contentY = BOOK_MARGIN_MM + BOOK_HEADER_MM;
  const contentW = BOOK_PAGE_MM.width - BOOK_MARGIN_MM * 2;
  const contentH = BOOK_PAGE_MM.height - BOOK_MARGIN_MM * 2 - BOOK_HEADER_MM;

  const n = pagina.fotos.length;
  const slots: BookSlotBox[] = [];

  if (n === 0) {
    return {
      capituloId: pagina.capituloId,
      titulo: opts.titulo,
      layoutId: pagina.layoutId,
      numero: opts.numero,
      slots,
    };
  }

  if (n === 1) {
    const f = pagina.fotos[0]!;
    slots.push(encaixarProporcao(f.slot.proporcao, contentX, contentY, contentW, contentH, f.midia.id));
  } else if (n === 2) {
    const colW = (contentW - BOOK_GAP_MM) / 2;
    pagina.fotos.forEach((f, i) => {
      slots.push(
        encaixarProporcao(
          f.slot.proporcao,
          contentX + i * (colW + BOOK_GAP_MM),
          contentY,
          colW,
          contentH,
          f.midia.id,
        ),
      );
    });
  } else if (n === 3 && pagina.layoutId === "paisagem-e-par") {
    const topH = contentH * 0.48;
    const botH = contentH - topH - BOOK_GAP_MM;
    const colW = (contentW - BOOK_GAP_MM) / 2;
    const a = pagina.fotos[0]!;
    const b = pagina.fotos[1]!;
    const c = pagina.fotos[2]!;
    slots.push(encaixarProporcao(a.slot.proporcao, contentX, contentY, contentW, topH, a.midia.id));
    slots.push(
      encaixarProporcao(b.slot.proporcao, contentX, contentY + topH + BOOK_GAP_MM, colW, botH, b.midia.id),
    );
    slots.push(
      encaixarProporcao(
        c.slot.proporcao,
        contentX + colW + BOOK_GAP_MM,
        contentY + topH + BOOK_GAP_MM,
        colW,
        botH,
        c.midia.id,
      ),
    );
  } else if (n === 3) {
    const colW = (contentW - BOOK_GAP_MM * 2) / 3;
    pagina.fotos.forEach((f, i) => {
      slots.push(
        encaixarProporcao(
          f.slot.proporcao,
          contentX + i * (colW + BOOK_GAP_MM),
          contentY,
          colW,
          contentH,
          f.midia.id,
        ),
      );
    });
  } else {
    // quadrante e demais: grade 2×2
    const colW = (contentW - BOOK_GAP_MM) / 2;
    const rowH = (contentH - BOOK_GAP_MM) / 2;
    pagina.fotos.slice(0, 4).forEach((f, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      slots.push(
        encaixarProporcao(
          f.slot.proporcao,
          contentX + col * (colW + BOOK_GAP_MM),
          contentY + row * (rowH + BOOK_GAP_MM),
          colW,
          rowH,
          f.midia.id,
        ),
      );
    });
  }

  return {
    capituloId: pagina.capituloId,
    titulo: opts.titulo,
    layoutId: pagina.layoutId,
    numero: opts.numero,
    slots,
  };
}

export function planBook(album: Album, tituloDoCapitulo: (id: string) => string): BookPagePlan[] {
  const pages: BookPagePlan[] = [];
  let numero = 1;
  for (const cap of album.capitulos) {
    const titulo = tituloDoCapitulo(cap.id);
    for (const pagina of cap.paginas) {
      pages.push(planBookPage(pagina, { titulo, numero }));
      numero += 1;
    }
  }
  return pages;
}

/** Encaixa a proporção do slot no retângulo disponível (letterbox, sem cortar). */
function encaixarProporcao(
  proporcao: Proporcao,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  midiaId: string,
): BookSlotBox {
  const ratio = proporcao === "retrato" ? 3 / 4 : proporcao === "paisagem" ? 4 / 3 : 1;
  let width = maxW;
  let height = width / ratio;
  if (height > maxH) {
    height = maxH;
    width = height * ratio;
  }
  return {
    midiaId,
    proporcao,
    x: x + (maxW - width) / 2,
    y: y + (maxH - height) / 2,
    width,
    height,
  };
}
