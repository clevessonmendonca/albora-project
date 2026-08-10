import { escalaDoFundo } from "./escalas";
import type { CamadaTokens, EntradaResolucao, EscalaSemantica, Tokens } from "./tipos";

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
 * A escala que o componente consome, já resolvida para o chão escolhido.
 *
 * **Trocar o chão re-deriva o acento.** Não é trocar uma cor, é trocar um
 * conjunto: o mesmo âmbar que é seguro sobre noite reprova contraste sobre
 * papel, e deixar o casal escolher a cor sem re-derivar entregaria uma
 * interface ilegível às 22h num salão escuro. A validação é trabalho do
 * sistema, nunca escolha de quem paga.
 */
export function resolverEscala(tokens: Tokens): EscalaSemantica {
  return escalaDoFundo(tokens.cores, tokens.fundo);
}
