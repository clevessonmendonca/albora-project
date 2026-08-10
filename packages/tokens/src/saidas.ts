import { acentoLegivel } from "./resolvedor";
import type { Tokens } from "./tipos";

/**
 * Um formato de saída, dois consumidores.
 *
 * A web injeta como custom properties; o React Native lê o mesmo objeto via
 * NativeWind. É o que mantém o ADR 0003 de pé com duas superfícies: se cada
 * lado tivesse o seu formato, seriam dois temas com um nome só.
 */
export function paraVariaveis(tokens: Tokens): Record<string, string> {
  return {
    "--tinta": tokens.cores.tinta,
    "--papel": tokens.cores.papel,
    "--acento": acentoLegivel(tokens),
    "--realce": tokens.cores.realce,
    "--fonte-titulo": tokens.fontes.titulo,
    "--fonte-corpo": tokens.fontes.corpo,
    "--raio": tokens.escala.raio,
    "--espaco": tokens.escala.espaco,
    "--frente": tokens.fundo === "escuro" ? tokens.cores.papel : tokens.cores.tinta,
    "--fundo": tokens.fundo === "escuro" ? tokens.cores.tinta : tokens.cores.papel,
  };
}

export function paraCss(tokens: Tokens): string {
  return Object.entries(paraVariaveis(tokens))
    .map(([chave, valor]) => `${chave}: ${valor};`)
    .join(" ");
}
