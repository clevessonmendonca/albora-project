/**
 * `@albora/integrations` — a fronteira externa (ADR 0016). Billing e o
 * client OIDC de login moram aqui; e-mail e storage seguem em `apps/web/lib`
 * até a próxima migração desta dívida.
 */
export * from "./billing";
export * from "./google-oidc";
