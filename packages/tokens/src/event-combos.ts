/** Pares harmônicos de cor do evento (`--ev` + `--ev-2`) e cores sugeridas — dados de paleta, não
 *  componente: moram aqui, junto da engine de cor do evento, pelo mesmo motivo que
 *  `MODELOS_DE_IDENTIDADE` mora no pacote de tokens. O casal escolhe pelo par (design-system-v3 §2),
 *  não por "principal/secundária". Nomes descrevem o clima, nunca o domínio. */
export type EventColorCombo = { nome: string; cor: string; cor2: string };

export const EVENT_COLOR_COMBOS: readonly EventColorCombo[] = [
  { nome: "Marsala & Marinho", cor: "#7A2E3A", cor2: "#22415F" },
  { nome: "Oliva & Areia", cor: "#4A5D3A", cor2: "#B99C6B" },
  { nome: "Terracota & Ocre", cor: "#9E4A22", cor2: "#C08A3E" },
  { nome: "Ardósia & Rosé", cor: "#3A4C5A", cor2: "#B07A6B" },
  { nome: "Vinho & Dourado", cor: "#5C2233", cor2: "#B08637" },
  { nome: "Grafite & Champanhe", cor: "#26221F", cor2: "#C7B08A" },
];

/** Cores sugeridas quando o casal cria a própria combinação — offline, sem foto. */
export const SUGGESTED_EVENT_COLORS: readonly string[] = [
  "#7A2E3A",
  "#22415F",
  "#2E4A3F",
  "#7A3417",
  "#1F1B18",
  "#3A4C7A",
];
