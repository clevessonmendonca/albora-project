/**
 * Primitivas web. Só desenham.
 *
 * Nenhum hex literal, nenhuma classe de cor arbitrária com valor fixo — o guard
 * `tokens` reprova; cor entra por token (`bg-acento`, `text-ink`) ou por
 * `var(--…)`. Nenhuma regra de negócio, validação ou chamada de API — o guard
 * `dominio` reprova. O que não desenha pixel mora em `@albora/core`, para poder
 * ser reaproveitado pelo app Expo sem refactor (ADR 0010).
 *
 * O padrão é shadcn, próprio: componente dono, estilo por `className` Tailwind,
 * variantes por `variantes()` (o CVA da casa), tema por CSS var de token.
 */
export { cn, variantes } from "./variantes";
export { Botao } from "./Botao";
export { Etiqueta } from "./Etiqueta";
export { Cartao } from "./Cartao";
export { Estrela } from "./Estrela";
export { Moldura } from "./Moldura";
export { BotaoFlutuante } from "./BotaoFlutuante";
export { Avatar, iniciais } from "./Avatar";
export { BarraDeAbas, type AbaConvidado } from "./BarraDeAbas";
export {
  IconeCamera,
  IconeComentario,
  IconeCompartilhar,
  IconeGrade,
  IconeMais,
  IconePessoa,
  IconePilha,
  IconeVoltar,
} from "./icones";
