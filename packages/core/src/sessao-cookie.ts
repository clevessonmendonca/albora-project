/**
 * Nome do cookie da sessão do convidado.
 *
 * Uma constante só: a web grava HttpOnly; o app nativo manda o mesmo nome
 * no header. Duplicar a string é o tipo de divergência que o ADR 0010 existe
 * para impedir.
 */
export const GUEST_SESSION_COOKIE = "albora_sessao";
