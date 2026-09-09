import { contraste, lerHex, misturarHex, paraHex, textoSobre } from "./cor";

/** As duas cores do evento (`--ev` + `--ev-2`) — camada do casal, separada do âmbar do produto
 *  (design-system-v3 §2). Aparecem só em capa, telão, experiência do convidado, QR, seleções e
 *  chips de momento. Um resolvedor, N renderizadores (ADR 0003): web, telão e PDF derivam daqui,
 *  então a placa impressa combina com o telão. */

/** Texto escuro do produto (design-system-v3 §1, `--ink`). Preto quente, nunca #000. */
const INK = "#1F1B18";
const BRANCO = "#FFFFFF";

/** Achata `t` (0–1) em dois dígitos hex de alfa — cor do evento sobre foto de festa é overlay,
 *  não fill opaco; devolve `base` sem alfa quando o hex é inválido (neutro errado é feio, ausente
 *  é buraco). */
function alfaHex(base: string, t: number): string {
  const rgb = lerHex(base);
  if (!rgb) return base;
  const canal = Math.round(Math.min(1, Math.max(0, t)) * 255)
    .toString(16)
    .toUpperCase()
    .padStart(2, "0");
  return `${paraHex(rgb)}${canal}`;
}

/** Uma cor válida do evento devolve o par completo de variáveis; inválida devolve `{}` — o
 *  chamador cai no âmbar do produto em vez de pintar com lixo. Espelha a engine `applyEvent`/
 *  `applyEvent2` do protótipo, mas deriva contraste pelas mesmas primitivas de `cor.ts` que o
 *  resto do sistema (AA é do sistema, não da escolha do casal). */
export function eventColorVariables(
  ev: string,
  ev2?: string | null,
): Record<string, string> {
  const base = lerHex(ev);
  if (!base) return {};
  const hex = paraHex(base);

  const vars: Record<string, string> = {
    "--ev": hex,
    // Hover = a cor caminhando 16% para o preto — mesma regra em botão do convidado e no telão.
    "--ev-hover": misturarHex(hex, "#000000", 0.16),
    // Nunca branco cego sobre a cor: escolhe entre branco e tinta por contraste e caminha até AA.
    "--ev-on": textoSobre(hex, BRANCO, INK),
    "--ev-soft": alfaHex(hex, 0.12),
    "--ev-tint": alfaHex(hex, 0.05),
    "--ev-border": alfaHex(hex, 0.24),
  };

  const segunda = ev2 ? lerHex(ev2) : null;
  if (segunda) {
    const hex2 = paraHex(segunda);
    vars["--ev-2"] = hex2;
    vars["--ev-2-soft"] = alfaHex(hex2, 0.16);
    vars["--ev-2-border"] = alfaHex(hex2, 0.32);
  }

  return vars;
}

/** As duas cores do evento como o casal as guarda no `identity_tokens` (JSONB). Campo aditivo:
 *  renderizadores antigos ignoram, os novos derivam `--ev`/`--ev-2` daqui. */
export type EventColors = { cor: string; cor2?: string };

/** Lê `eventCores` de um `identity_tokens` solto e devolve as variáveis de cor do evento — ponte
 *  entre o blob guardado e a engine, para que web/telão/PDF passem pelo mesmo caminho. Sem o campo
 *  (ou cor inválida) devolve `{}` e o chamador fica no âmbar do produto. */
export function eventColorVariablesFrom(
  tokens: Record<string, unknown> | null | undefined,
): Record<string, string> {
  const raw = tokens?.["eventCores"];
  if (!raw || typeof raw !== "object") return {};
  const { cor, cor2 } = raw as Partial<EventColors>;
  if (typeof cor !== "string") return {};
  return eventColorVariables(cor, typeof cor2 === "string" ? cor2 : undefined);
}

/** Razão de contraste do texto sobre a cor 1, para o badge AA do onboarding (design-system-v3 §2).
 *  Reusa `textoSobre` para saber qual base ganhou, e reporta a razão real dessa base. */
export function eventOnContrast(ev: string): number | null {
  const base = lerHex(ev);
  if (!base) return null;
  const onRgb = lerHex(textoSobre(paraHex(base), BRANCO, INK));
  if (!onRgb) return null;
  return contraste(base, onRgb);
}
