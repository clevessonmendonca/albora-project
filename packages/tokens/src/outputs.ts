import { resolveScale } from "./resolver";
import type { Tokens } from "./types";

/**
 * Um formato de saída, dois consumidores.
 *
 * A web injeta como custom properties; o React Native lê o mesmo objeto via
 * NativeWind. É o que mantém o ADR 0003 de pé com duas superfícies: se cada
 * lado tivesse o seu formato, seriam dois temas com um nome só.
 */
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

    "--fonte-titulo": tokens.fontes.titulo,
    "--fonte-corpo": tokens.fontes.corpo,
    "--raio": tokens.escala.raio,
    "--raio-pilula": tokens.escala.raioPilula,
    "--raio-superficie": tokens.escala.raioSuperficie,
    "--raio-media": tokens.escala.raioMedia,
    "--espaco": tokens.escala.espaco,

    "--curva": tokens.movimento.curva,
    "--tempo-rapido": tokens.movimento.rapido,
    "--tempo": tokens.movimento.medio,
    "--tempo-lento": tokens.movimento.lento,

    "--tracking-titulo": tokens.tracking.titulo,
    "--tracking-rotulo": tokens.tracking.rotulo,
  };
}

export function toCss(tokens: Tokens): string {
  return Object.entries(toVariables(tokens))
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");
}
