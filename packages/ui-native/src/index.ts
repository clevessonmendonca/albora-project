/**
 * Primitivas React Native. Vazio até a task 017.
 *
 * O pacote existe desde a 002 por exigência do ADR 0010: a única coisa que
 * impede o app Expo de custar o dobro é a lógica estar em `@albora/core`
 * desde o início, e não dentro dos componentes da web. Um diretório vazio
 * hoje evita extrair domínio de telas já escritas depois.
 *
 * Quando for preenchido, vale a mesma regra do `ui-web`: só desenha. Nenhum
 * hex literal — tudo sai de `@albora/tokens` via NativeWind — e nenhuma regra
 * de negócio, validação ou chamada de API. Os guards `tokens` e `dominio`
 * rodam aqui com o mesmo rigor.
 */

export const PENDENTE_TASK_017 = true;
