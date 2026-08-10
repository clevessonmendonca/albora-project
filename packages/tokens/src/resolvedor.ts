import type { CamadaTokens, EntradaResolucao, Tokens } from "./tipos";

/**
 * O resolvedor. Um só, para todos os renderizadores — web, nativo, telão,
 * SVG de impressão e moldura de compartilhamento (ADR 0003).
 *
 * Nenhum renderizador implementa o seu. Se dois implementarem, a identidade
 * do casal propaga num e não no outro, e a placa impressa deixa de combinar
 * com o telão — que é a coerência que o produto vende.
 *
 * Cadeia: marca → pack → evento. O evento ganha porque é a identidade de
 * quem pagou.
 */
export function resolverTokens(entrada: EntradaResolucao): Tokens {
  const camadas = [entrada.pack, entrada.evento].filter(
    (c): c is CamadaTokens => c !== undefined,
  );

  return camadas.reduce<Tokens>(
    (acumulado, camada) => ({
      cores: { ...acumulado.cores, ...camada.cores },
      fontes: { ...acumulado.fontes, ...camada.fontes },
      escala: { ...acumulado.escala, ...camada.escala },
      fundo: camada.fundo ?? acumulado.fundo,
    }),
    entrada.marca,
  );
}

/**
 * A cor de acento correta para o fundo resolvido.
 *
 * Existe porque errar isto é invisível em revisão e óbvio no salão: âmbar
 * sobre papel claro não alcança contraste de texto. Quem escolhe o fundo é o
 * casal, então a escolha do acento não pode ficar na mão do componente.
 */
export function acentoLegivel(tokens: Tokens): string {
  return tokens.fundo === "claro"
    ? tokens.cores.acentoSobreClaro
    : tokens.cores.acento;
}
