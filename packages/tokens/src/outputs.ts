import { resolveScale } from "./resolver";
import type { Tokens } from "./types";

/** §6: a sombra é a tinta da marca em baixa opacidade, nunca preta — preto puro some sobre `noite` e suja sobre `papel`. */
const tinta = (pct: number) => `color-mix(in srgb, var(--ink) ${pct}%, transparent)`;

const SOMBRA_SUAVE = `0 1px 2px ${tinta(7)}, 0 10px 26px -14px ${tinta(26)}`;
const SOMBRA_ALTA = `0 2px 4px ${tinta(6)}, 0 14px 32px -10px ${tinta(20)}, 0 44px 88px -36px ${tinta(34)}`;
const SOMBRA_ACENTO = `0 8px 20px -6px color-mix(in srgb, var(--acento) 70%, transparent)`;
const SOMBRA_DEVICE = `0 2px 4px ${tinta(8)}, 0 24px 48px -16px ${tinta(34)}`;
const SOMBRA_POLAROIDE = `0 24px 80px -32px ${tinta(60)}`;
const SOMBRA_SCAN_MASCARA = `0 0 0 9999px color-mix(in srgb, var(--noite) 35%, transparent)`;

/** Um formato, dois consumidores (web + NativeWind) — formatos separados seriam dois temas com um nome, quebrando o ADR 0003. */
export function toVariables(tokens: Tokens): Record<string, string> {
  const scale = resolveScale(tokens);

  return {
    "--bg": scale.bg,
    "--superficie": scale.superficie,
    "--superficie-alta": scale.superficieAlta,
    "--linha": scale.linha,
    "--ink": scale.ink,
    "--ink-2": scale.ink2,
    "--ink-3": scale.ink3,
    "--acento": scale.acento,
    "--acento-texto": scale.acentoTexto,
    "--sobre-acento": scale.sobreAcento,
    "--critico": scale.critico,
    "--atencao": scale.atencao,
    "--positivo": scale.positivo,
    "--informativo": scale.informativo,

    "--fonte-titulo": tokens.fontes.titulo,
    "--fonte-corpo": tokens.fontes.corpo,
    "--raio": tokens.escala.raio,
    "--raio-pilula": tokens.escala.raioPilula,
    "--raio-superficie": tokens.escala.raioSuperficie,
    "--raio-media": tokens.escala.raioMedia,
    "--espaco": tokens.escala.espaco,

    "--curva": tokens.movimento.curva,
    "--mola": tokens.movimento.mola,
    "--saida": tokens.movimento.saida,
    "--instantaneo": tokens.movimento.instantaneo,
    "--tempo-rapido": tokens.movimento.rapido,
    "--tempo": tokens.movimento.medio,
    "--tempo-lento": tokens.movimento.lento,

    "--tracking-titulo": tokens.tracking.titulo,
    "--tracking-rotulo": tokens.tracking.rotulo,

    // Nascem aqui, e não no CSS, porque derivam de `--ink`: uma custom property
    // resolve o `var()` onde é DECLARADA. Declaradas em `:root`, onde o `--ink`
    // do evento ainda não existe, viravam valor inválido e toda a profundidade
    // computava `none`.
    "--sombra-suave": SOMBRA_SUAVE,
    "--sombra-alta": SOMBRA_ALTA,
    "--sombra-acento": SOMBRA_ACENTO,
    "--sombra-device": SOMBRA_DEVICE,
    "--sombra-polaroide": SOMBRA_POLAROIDE,
    "--sombra-scan-mascara": SOMBRA_SCAN_MASCARA,
  };
}

export function toCss(tokens: Tokens): string {
  return Object.entries(toVariables(tokens))
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");
}
