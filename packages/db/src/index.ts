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

export { comAgregacao, comConta, comEvento, ErroContaAusente, ErroEventoAusente } from "./event";
export { migrar } from "./migrar";

export type { LinhaUpload, ResultadoConfirm } from "./uploads";
export { anotarUpload, confirmarUpload, ErroUploadDeOutroEvento, removerUploadProprio } from "./uploads";

export type { Desafio } from "./challenges";
export { desafioDoEvento, listarDesafios } from "./challenges";

export type { EntradaFeed, ItemFeed, ModoFeed, PaginaFeed } from "./feed";
export { codificarCursor, decodificarCursor, ErroCursorInvalido, gateDoEvento, listarFeed, TAMANHO_PAGINA } from "./feed";

export type { MotivoSessaoInvalida, NovaSessao, SessaoResolvida } from "./sessions";
export { comSessao, criarSessao, ErroNomeInvalido, ErroSessaoInvalida, resolverSessao, revogarSessoesDoEvento } from "./sessions";
export { assinaturaValida, emitirToken, ErroSegredoDeSessao, hashDoToken } from "./token";

export type { EstadoDoEvento, EventoPublico, NovoEvento, Resolucao } from "./events";
export {
  criarEvento,
  HORAS_APOS_EVENTO,
  packDoEvento,
  resolverSlug,
  rotacionarSlug,
} from "./events";
export type { AtualizacaoConfigEvento } from "./host-events";
export { atualizarConfigDoEvento, ocultarMidiaDoHost } from "./host-events";
export type { FotoRecente, MetricasAoVivo } from "./event-metrics";
export { lerMetricasAoVivo } from "./event-metrics";
export type { FunilAgregado } from "./funnel-aggregate";
export { lerFunilAgregado } from "./funnel-aggregate";
export type {
  CodigoPareamentoApp,
  MotivoResgateInvalido,
  SessaoResgatada,
} from "./app-pairing";
export {
  criarCodigoPareamentoApp,
  ErroResgateDePareamento,
  resgatarCodigoPareamentoApp,
} from "./app-pairing";
export type { MotivoParedeInvalida, ParedeResolvida } from "./wall";
export {
  ErroParedeInvalida,
  emitirCrachaDaParede,
  resolverParede,
  revogarParedesDoEvento,
} from "./wall";

export type { MidiaNaParede } from "./wall-media";
export { listarMidiaDaParede, TETO_DA_PAREDE } from "./wall-media";

export type {
  MotivoAutorizacaoInvalida,
  PareamentoCriado,
  StatusDoPareamento,
} from "./pairing";
export {
  autorizarPareamento,
  criarPareamento,
  ErroAutorizacaoDePareamento,
  finalizarPareamento,
} from "./pairing";

export type { ComentarioComAutor, ComentarioGravado } from "./comment-db";
export {
  ErroComentarioDeOutroEvento,
  gravarComentario,
  gravarVeredictoComentario,
  listarComentariosDaFoto,
  removerComentario,
  removerComentarioDoEvento,
} from "./comment-db";

export type { ComentarioModeracao } from "./comment-moderation-db";
export {
  denunciarComentario,
  listarComentariosParaModeracao,
  listarComentariosVisiveisDaFoto,
} from "./comment-moderation-db";

export type { ResultadoBloqueio } from "./block-db";
export {
  bloquearConvidado,
  ErroSessaoDeOutroEvento,
  filtroSemBloqueio,
} from "./block-db";

export {
  adicionarSugestao,
  definirMusicaDoCasal,
  ErroProvedorForaDoConjunto,
  listarSugestoes,
  musicaDoCasal,
} from "./music-db";

export type { ResultadoDenuncia } from "./moderation-db";
export { contarDenuncias, denunciar, ErroMidiaDeOutroEvento } from "./moderation-db";

export type {
  AtualizacaoModeracao,
  EstadoModeracao,
  EventoDoHost,
  ResumoEvento,
} from "./moderation-event";
export {
  abrirInteracaoDoEvento,
  alternarPanicoDoEvento,
  atualizarModeracaoDoEvento,
  buscarEventoDoHost,
  lerModeracaoDoEvento,
  limiarDenuncias,
  listarEventosDoHost,
  paraEstadoDoEvento,
} from "./moderation-event";

export type { ComentarioParaRevisao, MidiaParaRevisao } from "./moderation-review-db";
export {
  liberarComentarioDoEvento,
  liberarMidiaDoEvento,
  listarComentariosParaRevisao,
  listarMidiaParaRevisao,
} from "./moderation-review-db";

export type { ContextoCompartilharDb } from "./share-db";
export { buscarContextoCompartilhar, registrarConsentimentoExterno } from "./share-db";

export type { JanelaDoAlbum, MidiaDoAlbumComChave } from "./album-db";
export { janelaDoAlbum, listarMidiaDoAlbum, TETO_DO_ALBUM } from "./album-db";

export {
  apagarReacao,
  gravarReacao,
  midiaPublicadaDoEvento,
  reacaoDaSessao,
} from "./reaction-db";

export type { MidiaMinha } from "./gallery-db";
export { listarMinhasDoEvento } from "./gallery-db";

export { contarVideosDaSessao, planoDoEvento } from "./plan-db";

export type { HostResolvida, HostSessaoCriada, MagicLinkEmitido } from "./host-auth";
export {
  consumirMagicLink,
  emitirMagicLink,
  ErroHostSessaoInvalida,
  ErroMagicLinkInvalido,
  resolverHostSessao,
  revogarHostSessao,
  VALIDADE_HOST_SESSAO_HORAS,
  VALIDADE_MAGIC_LINK_MINUTOS,
} from "./host-auth";

/** English alias — preferred for new code. @see comEvento */
export { comEvento as withEvent } from "./event";
/** English alias — preferred for new code. @see comConta */
export { comConta as withAccount } from "./event";
/** English alias — preferred for new code. @see comAgregacao */
export { comAgregacao as withAggregation } from "./event";

/** English alias — preferred for new code. @see criarSessao */
export { criarSessao as createSession } from "./sessions";
/** English alias — preferred for new code. @see resolverSessao */
export { resolverSessao as resolveSession } from "./sessions";
/** English alias — preferred for new code. @see ErroSessaoInvalida */
export { ErroSessaoInvalida as InvalidSessionError } from "./sessions";

/** English alias — preferred for new code. @see listarFeed */
export { listarFeed as listFeed } from "./feed";
/** English alias — preferred for new code. @see gateDoEvento */
export { gateDoEvento as eventGate } from "./feed";
/** English alias — preferred for new code. @see codificarCursor */
export { codificarCursor as encodeCursor } from "./feed";
/** English alias — preferred for new code. @see decodificarCursor */
export { decodificarCursor as decodeCursor } from "./feed";
/** English alias — preferred for new code. @see ErroCursorInvalido */
export { ErroCursorInvalido as InvalidCursorError } from "./feed";

/** English alias — preferred for new code. @see criarEvento */
export { criarEvento as createEvent } from "./events";
/** English alias — preferred for new code. @see resolverSlug */
export { resolverSlug as resolveSlug } from "./events";
/** English alias — preferred for new code. @see packDoEvento */
export { packDoEvento as eventPack } from "./events";

/** English alias — preferred for new code. @see confirmarUpload */
export { confirmarUpload as confirmUpload } from "./uploads";
/** English alias — preferred for new code. @see anotarUpload */
export { anotarUpload as annotateUpload } from "./uploads";
/** English alias — preferred for new code. @see removerUploadProprio */
export { removerUploadProprio as removeOwnUpload } from "./uploads";
/** English alias — preferred for new code. @see ErroUploadDeOutroEvento */
export { ErroUploadDeOutroEvento as UploadConflictError } from "./uploads";

/** English alias — preferred for new code. @see listarMinhasDoEvento */
export { listarMinhasDoEvento as listMyMedia } from "./gallery-db";

/** English alias — preferred for new code. @see denunciar */
export { denunciar as reportMedia } from "./moderation-db";
/** English alias — preferred for new code. @see contarDenuncias */
export { contarDenuncias as reportCount } from "./moderation-db";
/** English alias — preferred for new code. @see ErroMidiaDeOutroEvento */
export { ErroMidiaDeOutroEvento as MediaConflictError } from "./moderation-db";

/** English alias — preferred for new code. @see bloquearConvidado */
export { bloquearConvidado as blockGuest } from "./block-db";
/** English alias — preferred for new code. @see ErroSessaoDeOutroEvento */
export { ErroSessaoDeOutroEvento as SessionConflictError } from "./block-db";

/** English alias — preferred for new code. @see listarEventosDoHost */
export { listarEventosDoHost as listHostEvents } from "./moderation-event";
/** English alias — preferred for new code. @see buscarEventoDoHost */
export { buscarEventoDoHost as getHostEvent } from "./moderation-event";
/** English alias — preferred for new code. @see atualizarModeracaoDoEvento */
export { atualizarModeracaoDoEvento as updateEventModeration } from "./moderation-event";
/** English alias — preferred for new code. @see abrirInteracaoDoEvento */
export { abrirInteracaoDoEvento as openEventInteraction } from "./moderation-event";
/** English alias — preferred for new code. @see alternarPanicoDoEvento */
export { alternarPanicoDoEvento as toggleEventPanic } from "./moderation-event";
/** English alias — preferred for new code. @see lerModeracaoDoEvento */
export { lerModeracaoDoEvento as readEventModeration } from "./moderation-event";

/** English alias — preferred for new code. @see atualizarConfigDoEvento */
export { atualizarConfigDoEvento as updateEventConfig } from "./host-events";
/** English alias — preferred for new code. @see ocultarMidiaDoHost */
export { ocultarMidiaDoHost as hideHostMedia } from "./host-events";

/** English alias — preferred for new code. @see thumbKeyFromFull */
export { thumbKeyFromFull } from "./storage-key";
