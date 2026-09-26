import type { TokenLayer } from "./types";

/**
 * A identidade do casal, sem as cores de que a rampa de neutros é derivada.
 *
 * `papel`, `tinta` e `noite` são a base de onde TODO o neutro sai por
 * opacidade — chão, cartão, filete, texto e sombra. Deixá-los passar não tinge
 * o acento: tinge a tela inteira. Um preset de jardim entrega `papel #EDF0E4`
 * e `tinta #39422C`, e o painel vira verde sage de ponta a ponta — que o §7
 * lista como anti-padrão BLOQUEANTE ("a categoria inteira usa verde sage e
 * rosa blush; usar também é desaparecer"), e que contradiz o §1 ("todo neutro
 * tem viés para o âmbar").
 *
 * O que continua passando é o que o casal escolhe e não desmonta o sistema:
 * acento e crítico (§2 os lista por nome), a fonte de display, o raio, a
 * densidade e o tracking — as cinco decisões que `modelos.ts` chama de
 * identidade. Elas mudam a cor de destaque e a forma, nunca o chão.
 *
 * `fundo` também não passa: quem decide o chão é o contexto de uso da
 * superfície (§2, "modo duplo — contexto de uso, NÃO preferência").
 */

/** As três que a escala semântica usa como base. Todo o resto é derivado delas. */
const BASES_DA_RAMPA = ["papel", "tinta", "noite"] as const;

export function camadaDoEvento(
  identidade: Record<string, unknown> | undefined,
): TokenLayer | undefined {
  if (!identidade || Object.keys(identidade).length === 0) return identidade as undefined;

  const { fundo: _fundo, background: _background, cores, ...resto } = identidade;

  const camada: Record<string, unknown> = { ...resto };

  if (cores && typeof cores === "object") {
    const filtradas = Object.fromEntries(
      Object.entries(cores as Record<string, unknown>).filter(
        ([nome]) => !BASES_DA_RAMPA.includes(nome as (typeof BASES_DA_RAMPA)[number]),
      ),
    );
    if (Object.keys(filtradas).length > 0) camada["cores"] = filtradas;
  }

  return camada as TokenLayer;
}
