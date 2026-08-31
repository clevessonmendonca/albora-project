import { ehVertical } from "../wall-display";
import type { Layout, MidiaDoAlbum, Proporcao, Slot } from "./types";

export function proporcaoDe(midia: Pick<MidiaDoAlbum, "largura" | "altura">): Proporcao {
  if (ehVertical(midia)) return "retrato";
  return midia.largura > midia.altura ? "paisagem" : "quadrado";
}

export function slotAceita(
  slot: Slot,
  midia: Pick<MidiaDoAlbum, "largura" | "altura">,
): boolean {
  return slot.proporcao === proporcaoDe(midia);
}

export function slotCorta(
  slot: Slot,
  midia: Pick<MidiaDoAlbum, "largura" | "altura">,
): boolean {
  return !slotAceita(slot, midia);
}

function slots(proporcao: Proporcao, quantos: number): Slot[] {
  const ids = ["a", "b", "c", "d"];
  return Array.from({ length: quantos }, (_, i) => ({
    id: ids[i] ?? `s${i}`,
    proporcao,
    fracao: 1 / quantos,
  }));
}

export const LAYOUTS: readonly Layout[] = [
  { id: "tira-retrato", slots: slots("retrato", 3) },
  { id: "quadrante", slots: slots("quadrado", 4) },
  {
    id: "paisagem-e-par",
    slots: [
      { id: "a", proporcao: "paisagem", fracao: 0.5 },
      { id: "b", proporcao: "retrato", fracao: 0.25 },
      { id: "c", proporcao: "retrato", fracao: 0.25 },
    ],
  },
  { id: "par-retrato", slots: slots("retrato", 2) },
  { id: "par-paisagem", slots: slots("paisagem", 2) },
  { id: "par-quadrado", slots: slots("quadrado", 2) },
  { id: "cheia-paisagem", slots: slots("paisagem", 1) },
  { id: "cheia-retrato", slots: slots("retrato", 1) },
  { id: "cheia-quadrado", slots: slots("quadrado", 1) },
];

export const LAYOUT_DE_UMA: Readonly<Record<Proporcao, Layout>> = {
  paisagem: { id: "cheia-paisagem", slots: slots("paisagem", 1) },
  retrato: { id: "cheia-retrato", slots: slots("retrato", 1) },
  quadrado: { id: "cheia-quadrado", slots: slots("quadrado", 1) },
};

export const MAIOR_LAYOUT = LAYOUTS.reduce((n, l) => Math.max(n, l.slots.length), 1);

export function layoutsQueCabem(
  prefixo: readonly Pick<MidiaDoAlbum, "largura" | "altura">[],
): Layout[] {
  return LAYOUTS.filter(
    (layout) =>
      layout.slots.length <= prefixo.length &&
      layout.slots.every((slot, i) => {
        const midia = prefixo[i];
        return midia !== undefined && slotAceita(slot, midia);
      }),
  );
}

export function escolherLayout(
  prefixo: readonly Pick<MidiaDoAlbum, "largura" | "altura">[],
): Layout | null {
  let melhor: Layout | null = null;
  for (const layout of layoutsQueCabem(prefixo)) {
    if (!melhor || layout.slots.length > melhor.slots.length) melhor = layout;
  }
  return melhor;
}
