/**
 * A regra que este pacote existe para impor, e que o guard de isolamento
 * verifica estaticamente desde a task 002:
 *
 * Toda tabela com dado de evento tem `event_id` NOT NULL, RLS **FORÇADO**, e
 * todo acesso passa por `comEvento()` — que abre transação e faz `SET LOCAL`.
 * Nunca `SET`, nunca `pg_advisory_lock` de sessão: o pooling em modo
 * transação devolve a conexão a cada COMMIT, e o que sobrar vaza para o
 * próximo cliente, que é outro casamento.
 */

export const SETTING_EVENTO = "app.event_id";

export { comAgregacao, comEvento, ErroEventoAusente } from "./evento";
export { migrar } from "./migrar";

export type { LinhaUpload, ResultadoConfirm } from "./uploads";
export { anotarUpload, confirmarUpload, ErroUploadDeOutroEvento } from "./uploads";

export type { Desafio } from "./desafios";
export { desafioDoEvento, listarDesafios } from "./desafios";

export type { EntradaFeed, ItemFeed, ModoFeed, PaginaFeed } from "./feed";
export { codificarCursor, decodificarCursor, ErroCursorInvalido, gateDoEvento, listarFeed, TAMANHO_PAGINA } from "./feed";

export type { MotivoSessaoInvalida, NovaSessao, SessaoResolvida } from "./sessoes";
export { comSessao, criarSessao, ErroNomeInvalido, ErroSessaoInvalida, resolverSessao, revogarSessoesDoEvento } from "./sessoes";
export { assinaturaValida, emitirToken, ErroSegredoDeSessao, hashDoToken } from "./token";

export type { EstadoDoEvento, EventoPublico, Resolucao } from "./eventos";
export { HORAS_APOS_EVENTO, packDoEvento, resolverSlug, rotacionarSlug } from "./eventos";
