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

export { comAgregacao, comConta, comEvento, ErroContaAusente, ErroEventoAusente } from "./evento";
export { migrar } from "./migrar";

export type { LinhaUpload, ResultadoConfirm } from "./uploads";
export { anotarUpload, confirmarUpload, ErroUploadDeOutroEvento, removerUploadProprio } from "./uploads";

export type { Desafio } from "./desafios";
export { desafioDoEvento, listarDesafios } from "./desafios";

export type { EntradaFeed, ItemFeed, ModoFeed, PaginaFeed } from "./feed";
export { codificarCursor, decodificarCursor, ErroCursorInvalido, gateDoEvento, listarFeed, TAMANHO_PAGINA } from "./feed";

export type { MotivoSessaoInvalida, NovaSessao, SessaoResolvida } from "./sessoes";
export { comSessao, criarSessao, ErroNomeInvalido, ErroSessaoInvalida, resolverSessao, revogarSessoesDoEvento } from "./sessoes";
export { assinaturaValida, emitirToken, ErroSegredoDeSessao, hashDoToken } from "./token";

export type { EstadoDoEvento, EventoPublico, NovoEvento, Resolucao } from "./eventos";
export {
  criarEvento,
  HORAS_APOS_EVENTO,
  packDoEvento,
  resolverSlug,
  rotacionarSlug,
} from "./eventos";
export type { AtualizacaoConfigEvento } from "./eventos-admin";
export { atualizarConfigDoEvento, ocultarMidiaDoHost } from "./eventos-admin";
export type { FotoRecente, MetricasAoVivo } from "./metricas-evento";
export { lerMetricasAoVivo } from "./metricas-evento";
export type { MotivoParedeInvalida, ParedeResolvida } from "./parede";
export {
  ErroParedeInvalida,
  emitirCrachaDaParede,
  resolverParede,
  revogarParedesDoEvento,
} from "./parede";

export type { MidiaNaParede } from "./parede-midia";
export { listarMidiaDaParede, TETO_DA_PAREDE } from "./parede-midia";

export type {
  MotivoAutorizacaoInvalida,
  PareamentoCriado,
  StatusDoPareamento,
} from "./pareamento";
export {
  autorizarPareamento,
  criarPareamento,
  ErroAutorizacaoDePareamento,
  finalizarPareamento,
} from "./pareamento";

export type { ComentarioComAutor, ComentarioGravado } from "./comentario-db";
export {
  ErroComentarioDeOutroEvento,
  gravarComentario,
  gravarVeredictoComentario,
  listarComentariosDaFoto,
  removerComentario,
  removerComentarioDoEvento,
} from "./comentario-db";

export type { ComentarioModeracao } from "./comentario-moderacao-db";
export {
  denunciarComentario,
  listarComentariosParaModeracao,
  listarComentariosVisiveisDaFoto,
} from "./comentario-moderacao-db";

export type { ResultadoBloqueio } from "./bloqueio-db";
export {
  bloquearConvidado,
  ErroSessaoDeOutroEvento,
  filtroSemBloqueio,
} from "./bloqueio-db";

export {
  adicionarSugestao,
  definirMusicaDoCasal,
  ErroProvedorForaDoConjunto,
  listarSugestoes,
  musicaDoCasal,
} from "./musica-db";

export type { ResultadoDenuncia } from "./moderacao-db";
export { contarDenuncias, denunciar, ErroMidiaDeOutroEvento } from "./moderacao-db";

export type {
  AtualizacaoModeracao,
  EstadoModeracao,
  EventoDoHost,
  ResumoEvento,
} from "./moderacao-evento";
export {
  abrirInteracaoDoEvento,
  alternarPanicoDoEvento,
  atualizarModeracaoDoEvento,
  buscarEventoDoHost,
  lerModeracaoDoEvento,
  limiarDenuncias,
  listarEventosDoHost,
  paraEstadoDoEvento,
} from "./moderacao-evento";

export type { ComentarioParaRevisao, MidiaParaRevisao } from "./moderacao-revisao-db";
export {
  liberarComentarioDoEvento,
  liberarMidiaDoEvento,
  listarComentariosParaRevisao,
  listarMidiaParaRevisao,
} from "./moderacao-revisao-db";

export type { ContextoCompartilharDb } from "./compartilhar-db";
export { buscarContextoCompartilhar, registrarConsentimentoExterno } from "./compartilhar-db";

export type { JanelaDoAlbum, MidiaDoAlbumComChave } from "./album-db";
export { janelaDoAlbum, listarMidiaDoAlbum, TETO_DO_ALBUM } from "./album-db";

export {
  apagarReacao,
  gravarReacao,
  midiaPublicadaDoEvento,
  reacaoDaSessao,
} from "./reacao-db";

export type { MidiaMinha } from "./galeria-db";
export { listarMinhasDoEvento } from "./galeria-db";

export { contarVideosDaSessao, planoDoEvento } from "./plano-db";

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
