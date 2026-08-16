/**
 * Primitivas React Native. Só desenha — nenhuma regra de negócio, validação
 * ou chamada de API (ADR 0010). Cor e forma saem de `@albora/tokens` via
 * NativeWind; o guard `tokens` reprova hex e paleta pronta do Tailwind.
 */

export { Text } from "./text";
export { Button } from "./button";
export { Screen } from "./screen";
export { TabBar, type GuestTab } from "./tab-bar";
