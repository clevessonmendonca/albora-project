import { resolverEscala } from "./resolvedor";
import type { Tokens } from "./tipos";

/**
 * Um formato de saída, dois consumidores.
 *
 * A web injeta como custom properties; o React Native lê o mesmo objeto via
 * NativeWind. É o que mantém o ADR 0003 de pé com duas superfícies: se cada
 * lado tivesse o seu formato, seriam dois temas com um nome só.
 */
export function paraVariaveis(tokens: Tokens): Record<string, string> {
  const e = resolverEscala(tokens);

  return {
    "--bg": e.bg,
    "--superficie": e.superficie,
    "--superficie-alta": e.superficieAlta,
    "--linha": e.linha,
    "--ink": e.ink,
    "--ink-2": e.ink2,
    "--ink-3": e.ink3,
    "--acento": e.acento,
    "--acento-texto": e.acentoTexto,
    "--critico": e.critico,

    "--fonte-titulo": tokens.fontes.titulo,
    "--fonte-corpo": tokens.fontes.corpo,
    "--raio": tokens.escala.raio,
    "--espaco": tokens.escala.espaco,

    // Ponte para as telas escritas antes da escala semântica existir. Sai na
    // passada de tela — não escreva componente novo contra elas.
    "--fundo": e.bg,
    "--frente": e.ink,
  };
}

export function paraCss(tokens: Tokens): string {
  return Object.entries(paraVariaveis(tokens))
    .map(([chave, valor]) => `${chave}: ${valor};`)
    .join(" ");
}
