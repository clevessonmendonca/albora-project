export type {
  Evento,
  EventoId,
  Midia,
  MidiaId,
  Missao,
  Sessao,
  SessaoId,
} from "./tipos";

export type { CorpoItem, DetalhesItem, Fila, ItemFila } from "./fila";
export { deveDesistir, esperaAntesDeRetentar, MAX_TENTATIVAS } from "./fila";

export type { GateDeInteracao, ModoInteracao } from "./interacao";
export { interacaoAberta, modoInteracao } from "./interacao";

export type { AjustesManuais } from "./ajustes";
export { AJUSTES_NEUTROS, aplicarAjustes, saoNeutros } from "./ajustes";

export type { Ajustes, Filtro } from "./luts";
export { aplicarIntensidade, NEUTRO, paraFiltroCss } from "./luts";

export type { Preset } from "./presets";
export { aplicarPorPixel, ordenarComRecomendado, preset, PRESETS, TETO_POR_PIXEL_MS } from "./presets";

export { chaveThumbDeFull, derivarChaveMidia, prefixoDoEvento } from "./chaves";

export type { ErroMidia, TipoAceito, TipoEntrada, TipoVideo } from "./midia";
export {
  detectarTipo,
  ehHeic,
  isVideoMime,
  isVideoMime as ehMimeVideo,
  ehVideo,
  LADO_MAIOR,
  MAX_BYTES,
  MAX_BYTES_VIDEO,
  TIPOS_ACEITOS,
  TIPOS_ENTRADA,
  TIPOS_VIDEO,
  tipoAceito,
  validarConteudo,
  validarDeclaracao,
} from "./midia";

export type { PlanoDoEvento } from "./plano-evento";
export {
  limiteVideosPorConvidado,
  parsePlanoDoEvento,
  planoParaRedimensionamento,
  podeEnviarVideo,
  VIDEOS_POR_CONVIDADO,
} from "./plano-evento";

export type { PedidoConfirm, PedidoPresign, RespostaPresign } from "./upload";
export { presignExpirou, VALIDADE_PRESIGN_SEGUNDOS } from "./upload";

export type { Orientacao, Transformacao } from "./exif";
export { dimensoesCorrigidas, lerOrientacao, temExif, temGeolocalizacao, transformacaoParaOrientacao } from "./exif";

export type { Alvo, Aparelho, Plano } from "./redimensionar";
export { alvoFull, alvoParaLadoMaior, alvoQueCabe, alvoThumb, LADO_THUMB, planejarProcessamento, QUALIDADE, TETO_PIXELS, tetoParaAparelho } from "./redimensionar";

export type { Resultado, ResumoDrenagem, Transporte } from "./envio";
export { drenar, enviarItem } from "./envio";

export type { Bitmap, Desenhista, FiltroAplicado, FotoProcessada, OpcoesProcessamento } from "./processar";
export { processarFoto } from "./processar";

export type {
  CodigoDeModeracao,
  Decisao,
  EntradaDeAuditoria,
  EstadoDaMidia,
  EstadoDoEvento,
  Superficie,
  VeredictoDoClassificador,
} from "./moderacao";
export {
  DENUNCIAS_PARA_SEGURAR,
  decidirExibicao,
  precisaDeRevisao,
  registrarDecisao,
} from "./moderacao";

export type { EscolhaDoTelao, Faixa, ItemDoTelao, ModeloDeTelao, PerfilDoModelo } from "./wall-display";
export {
  ehVertical,
  faixaDe,
  JANELA_RECENTE_MS,
  modeloCorta,
  modelosPermitidos,
  MODELOS_DE_TELAO,
  PERFIS,
  PESOS,
  modelosDoRodizio,
  problemasDaEscolha,
  podarCache,
  pontuacaoPopular,
  proximaDoTelao,
  TETO_DO_CACHE,
} from "./wall-display";

export type {
  EstadoNaGaleria,
  ItemDaGaleria,
  MidiaEnviada,
  Reacao,
  ResumoDaGaleria,
} from "./galeria";
export {
  aplicarReacao,
  contagemVisivel,
  contarReacoes,
  montarGaleria,
  podeReagir,
  podeRemover,
  removerReacao,
  resumirGaleria,
} from "./galeria";

export type {
  CodigoDaTese,
  CodigoDeMetrica,
  CodigoDePlataforma,
  CodigoDeSequencia,
  ComparacaoDePlataforma,
  ContagemDePlataforma,
  ContagemDoEvento,
  DegrauDoFunil,
  EtapaDaEspinha,
  EventoDoFunil,
  LeituraDePlataforma,
  Perda,
  Sequencia,
  Veredito,
} from "./funnel";
export {
  ESPINHA_DO_FUNIL,
  EVENTOS_DO_FUNIL,
  MARGEM_DE_RUIDO,
  MetricaInvalida,
  PISO_DA_FRICCAO,
  PISO_DA_TESE,
  PRE_REQUISITOS,
  compararPlataforma,
  decidirTese,
  degraus,
  ehEventoDoFunil,
  lerPlataforma,
  maiorPerda,
  ondeParou,
  taxaDeParticipacao,
  validarSequencia,
} from "./funnel";

export type {
  AtorDaRemocao,
  CodigoDeComentario,
  Comentario,
  EntradaDeAuditoriaDeComentario,
  EstadoDoComentario,
  EventoDoComentario,
  PedidoDeComentario,
  ResultadoDePublicacao,
  TextoValidado,
  ThreadDeComentario,
} from "./comment";
export {
  MAX_CARACTERES,
  PROFUNDIDADE_MAXIMA,
  decidirExibicaoDoComentario,
  montarThread,
  podeRemoverComentario,
  publicarComentario,
  registrarDecisaoDoComentario,
  validarTexto,
} from "./comment";

export { classificarTexto } from "./classificador-texto";

export type {
  Autorizacao,
  Caixa,
  CodigoDeCompartilhamento,
  Composicao,
  ConsentimentoExterno,
  ConteudoDaMoldura,
  Dimensoes,
  EntradaDaComposicao,
  EventoQueCompartilha,
  IdentidadeDoEvento,
  MidiaParaCompartilhar,
  ModeloDeMoldura,
  ProblemaDaComposicao,
  Recorte,
  ResultadoDaComposicao,
  SessaoQueCompartilha,
} from "./compartilhar";
export {
  ALTURA_DA_COMPOSICAO,
  ALTURA_DA_FAIXA,
  ESPACO_DA_COLAGEM,
  LARGURA_DA_COMPOSICAO,
  MARGEM,
  MAX_DA_COLAGEM,
  MAX_PERDA_LATERAL,
  MODELOS_DE_MOLDURA,
  VERSAO_DO_CONSENTIMENTO_EXTERNO,
  areaDaFoto,
  autorizarColagem,
  autorizarCompartilhamento,
  caixaDaFoto,
  celulasDaColagem,
  cobreSemPerderTopo,
  compor,
  conteudoDaMoldura,
  encaixar,
  faixaDaMarca,
  midiasCompartilhaveis,
  modeloRecomendado,
  modelosDeMolduraPermitidos,
  molduraCorta,
  pendenciaDeConsentimento,
  problemasDaComposicao,
  recorte,
} from "./compartilhar";

export type {
  Album,
  Bloco,
  CapituloDoAlbum,
  CapituloPlanejado,
  Contadores,
  FotoNaPagina,
  Instante,
  JanelaDoEvento,
  Layout,
  MidiaDoAlbum,
  MidiaResolvida,
  Pagina,
  PlanoDoAlbum,
  Proporcao,
  Selecao,
  Slot,
} from "./album";
export {
  CAPITULO_SEM_HORA,
  CAPITULO_UNICO,
  FOLGA_DA_JANELA_MS,
  HORAS_DO_AMANHECER,
  JANELA_DE_RAJADA_MS,
  LAYOUTS,
  TETO_DE_PAGINAS_PADRAO,
  agruparEmBlocos,
  capituloDe,
  contarAcervo,
  diagramarBloco,
  ehAmanhecer,
  escolherLayout,
  horaNoEvento,
  inicioDaHoraNoEvento,
  instanteDe,
  layoutsQueCabem,
  montarAlbum,
  ordemDeDescarte,
  ordemNaRajada,
  proporcaoDe,
  resolver,
  selecionarParaAlbum,
  slotAceita,
  slotCorta,
} from "./album";

export type {
  ErroMusica,
  ExibicaoDaMusica,
  FaixaSugerida,
  LinkDeMusica,
  MetadadoDaMusica,
  MusicaDoEvento,
  Provedor,
  ResultadoDaSugestao,
  ResultadoDeLink,
  SaidaDeCompartilhamento,
  SugestaoDeCompartilhamento,
  TipoDeConteudo,
} from "./musica";
export {
  CAMPOS_DA_SUGESTAO,
  FRONTEIRA_ADR_0011,
  HOSTS_ACEITOS,
  PROVEDORES,
  chaveDaFaixa,
  exibirMusica,
  lerLinkDeMusica,
  montarSugestaoDeCompartilhamento,
  ordenarSugestoes,
  podeSugerir,
  registrarSugestao,
  sugestoesDaSessao,
  TETO_DE_SUGESTOES_POR_SESSAO,
  validarSaidaDeCompartilhamento,
  votos,
} from "./musica";

export type {
  AgendamentoDoRecado,
  AudioDoRecado,
  AudioGravado,
  CodigoDeEntrega,
  Entrega,
  ErroDoRecado,
  EstadoDoAudio,
  LeituraDoRecado,
  RascunhoDeRecado,
  Recado,
  SessaoDoRecado,
  TelaDoRecado,
} from "./guestbook";
export {
  TETO_AUDIO_SEGUNDOS,
  TETO_TEXTO_CARACTERES,
  decidirEntrega,
  foiLido,
  marcarLido,
  montarTela,
  recadoPublicado,
  telaTemConteudo,
  validarCriacao,
  validarRascunho,
} from "./guestbook";

export type { PadroesDoEvento, PoliticaDeMenores } from "./menores";
export {
  compartilhamentoExternoPadrao,
  denunciasParaSegurar,
  gateComecaFechado,
  eventDefaults,
} from "./menores";
/** English alias — prefer for new code. @see PadroesDoEvento */
export type { PadroesDoEvento as EventDefaults } from "./menores";
/** English alias — prefer for new code. @see PoliticaDeMenores */
export type { PoliticaDeMenores as MinorsPolicy } from "./menores";
/** PT alias — prefer `eventDefaults`. */
export { eventDefaults as padroesDoEvento } from "./menores";
/** English alias — prefer for new code. @see denunciasParaSegurar */
export { denunciasParaSegurar as reportsToHold } from "./menores";
/** English alias — prefer for new code. @see compartilhamentoExternoPadrao */
export { compartilhamentoExternoPadrao as defaultExternalShare } from "./menores";
/** English alias — prefer for new code. @see gateComecaFechado */
export { gateComecaFechado as gateStartsClosed } from "./menores";

export type { ConcessaoDaParede, CrachaDaParede, VeredictoDaParede } from "./wall";
export {
  CONCESSOES_DA_PAREDE,
  VALIDADE_DA_PAREDE_HORAS,
  autorizarParede,
  expiraEmPara,
} from "./wall";

/** English alias — prefer for new code. */
export { modoInteracao as interactionMode } from "./interacao";
/** English alias — prefer for new code. */
export { interacaoAberta as interactionOpen } from "./interacao";
/** English alias — prefer for new code. */
export { derivarChaveMidia as deriveMediaKey } from "./chaves";
/** English alias — prefer for new code. */
export { prefixoDoEvento as eventPrefix } from "./chaves";
/** English alias — prefer for new code. */
export { validarDeclaracao as validateDeclaration } from "./midia";
/** English alias — prefer for new code. */
export { podeEnviarVideo as canUploadVideo } from "./plano-evento";
/** English alias — prefer for new code. */
export { processarFoto as processPhoto } from "./processar";
/** English alias — prefer for new code. */
export { montarGaleria as buildGallery } from "./galeria";
/** English alias — prefer for new code. */
export { publicarComentario as publishComment } from "./comment";
/** English alias — prefer for new code. */
export { decidirExibicao as decideDisplay } from "./moderacao";
/** English alias — prefer for new code. */
export { autorizarCompartilhamento as authorizeShare } from "./compartilhar";
/** English alias — prefer for new code. */
export { compor as composeShare } from "./compartilhar";
/** English alias — prefer for new code. */
export { montarAlbum as buildAlbum } from "./album";
/** English alias — prefer for new code. */
export { lerLinkDeMusica as parseMusicLink } from "./musica";
/** English alias — prefer for new code. */
export { exibirMusica as displayMusic } from "./musica";

/** English alias — prefer for new code. @see ConcessaoDaParede */
export type { ConcessaoDaParede as WallGrant } from "./wall";
/** English alias — prefer for new code. @see CrachaDaParede */
export type { CrachaDaParede as WallBadge } from "./wall";
/** English alias — prefer for new code. @see VeredictoDaParede */
export type { VeredictoDaParede as WallVerdict } from "./wall";
/** English alias — prefer for new code. @see CONCESSOES_DA_PAREDE */
export { CONCESSOES_DA_PAREDE as WALL_GRANTS } from "./wall";
/** English alias — prefer for new code. @see VALIDADE_DA_PAREDE_HORAS */
export { VALIDADE_DA_PAREDE_HORAS as WALL_VALIDITY_HOURS } from "./wall";
/** English alias — prefer for new code. @see autorizarParede */
export { autorizarParede as authorizeWall } from "./wall";
/** English alias — prefer for new code. @see expiraEmPara */
export { expiraEmPara as wallExpiresAtFor } from "./wall";

/** English alias — prefer for new code. @see AgendamentoDoRecado */
export type { AgendamentoDoRecado as GuestbookSchedule } from "./guestbook";
/** English alias — prefer for new code. @see AudioDoRecado */
export type { AudioDoRecado as GuestbookAudio } from "./guestbook";
/** English alias — prefer for new code. @see AudioGravado */
export type { AudioGravado as RecordedAudio } from "./guestbook";
/** English alias — prefer for new code. @see CodigoDeEntrega */
export type { CodigoDeEntrega as DeliveryCode } from "./guestbook";
/** English alias — prefer for new code. @see Entrega */
export type { Entrega as GuestbookDelivery } from "./guestbook";
/** English alias — prefer for new code. @see ErroDoRecado */
export type { ErroDoRecado as GuestbookError } from "./guestbook";
/** English alias — prefer for new code. @see EstadoDoAudio */
export type { EstadoDoAudio as AudioState } from "./guestbook";
/** English alias — prefer for new code. @see LeituraDoRecado */
export type { LeituraDoRecado as GuestbookRead } from "./guestbook";
/** English alias — prefer for new code. @see RascunhoDeRecado */
export type { RascunhoDeRecado as GuestbookDraft } from "./guestbook";
/** English alias — prefer for new code. @see Recado */
export type { Recado as GuestbookEntry } from "./guestbook";
/** English alias — prefer for new code. @see SessaoDoRecado */
export type { SessaoDoRecado as GuestbookSession } from "./guestbook";
/** English alias — prefer for new code. @see TelaDoRecado */
export type { TelaDoRecado as GuestbookScreen } from "./guestbook";
/** English alias — prefer for new code. @see TETO_AUDIO_SEGUNDOS */
export { TETO_AUDIO_SEGUNDOS as MAX_AUDIO_SECONDS } from "./guestbook";
/** English alias — prefer for new code. @see TETO_TEXTO_CARACTERES */
export { TETO_TEXTO_CARACTERES as MAX_TEXT_CHARACTERS } from "./guestbook";
/** English alias — prefer for new code. @see decidirEntrega */
export { decidirEntrega as decideDelivery } from "./guestbook";
/** English alias — prefer for new code. @see foiLido */
export { foiLido as wasRead } from "./guestbook";
/** English alias — prefer for new code. @see marcarLido */
export { marcarLido as markRead } from "./guestbook";
/** English alias — prefer for new code. @see montarTela */
export { montarTela as buildGuestbookScreen } from "./guestbook";
/** English alias — prefer for new code. @see recadoPublicado */
export { recadoPublicado as guestbookPublished } from "./guestbook";
/** English alias — prefer for new code. @see telaTemConteudo */
export { telaTemConteudo as guestbookScreenHasContent } from "./guestbook";
/** English alias — prefer for new code. @see validarCriacao */
export { validarCriacao as validateGuestbookCreation } from "./guestbook";
/** English alias — prefer for new code. @see validarRascunho */
export { validarRascunho as validateGuestbookDraft } from "./guestbook";

/** English alias — prefer for new code. @see CodigoDaTese */
export type { CodigoDaTese as ThesisCode } from "./funnel";
/** English alias — prefer for new code. @see CodigoDeMetrica */
export type { CodigoDeMetrica as MetricCode } from "./funnel";
/** English alias — prefer for new code. @see CodigoDePlataforma */
export type { CodigoDePlataforma as PlatformCode } from "./funnel";
/** English alias — prefer for new code. @see CodigoDeSequencia */
export type { CodigoDeSequencia as SequenceCode } from "./funnel";
/** English alias — prefer for new code. @see ComparacaoDePlataforma */
export type { ComparacaoDePlataforma as PlatformComparison } from "./funnel";
/** English alias — prefer for new code. @see ContagemDePlataforma */
export type { ContagemDePlataforma as PlatformCount } from "./funnel";
/** English alias — prefer for new code. @see ContagemDoEvento */
export type { ContagemDoEvento as EventCount } from "./funnel";
/** English alias — prefer for new code. @see DegrauDoFunil */
export type { DegrauDoFunil as FunnelStep } from "./funnel";
/** English alias — prefer for new code. @see EtapaDaEspinha */
export type { EtapaDaEspinha as SpineStage } from "./funnel";
/** English alias — prefer for new code. @see EventoDoFunil */
export type { EventoDoFunil as FunnelEvent } from "./funnel";
/** English alias — prefer for new code. @see LeituraDePlataforma */
export type { LeituraDePlataforma as PlatformReading } from "./funnel";
/** English alias — prefer for new code. @see Perda */
export type { Perda as FunnelLoss } from "./funnel";
/** English alias — prefer for new code. @see Sequencia */
export type { Sequencia as FunnelSequence } from "./funnel";
/** English alias — prefer for new code. @see Veredito */
export type { Veredito as ThesisVerdict } from "./funnel";
/** English alias — prefer for new code. @see ESPINHA_DO_FUNIL */
export { ESPINHA_DO_FUNIL as FUNNEL_SPINE } from "./funnel";
/** English alias — prefer for new code. @see EVENTOS_DO_FUNIL */
export { EVENTOS_DO_FUNIL as FUNNEL_EVENTS } from "./funnel";
/** English alias — prefer for new code. @see MARGEM_DE_RUIDO */
export { MARGEM_DE_RUIDO as NOISE_MARGIN } from "./funnel";
/** English alias — prefer for new code. @see MetricaInvalida */
export { MetricaInvalida as InvalidMetric } from "./funnel";
/** English alias — prefer for new code. @see PISO_DA_FRICCAO */
export { PISO_DA_FRICCAO as FRICTION_FLOOR } from "./funnel";
/** English alias — prefer for new code. @see PISO_DA_TESE */
export { PISO_DA_TESE as THESIS_FLOOR } from "./funnel";
/** English alias — prefer for new code. @see PRE_REQUISITOS */
export { PRE_REQUISITOS as PREREQUISITES } from "./funnel";
/** English alias — prefer for new code. @see compararPlataforma */
export { compararPlataforma as comparePlatform } from "./funnel";
/** English alias — prefer for new code. @see decidirTese */
export { decidirTese as decideThesis } from "./funnel";
/** English alias — prefer for new code. @see degraus */
export { degraus as funnelSteps } from "./funnel";
/** English alias — prefer for new code. @see ehEventoDoFunil */
export { ehEventoDoFunil as isFunnelEvent } from "./funnel";
/** English alias — prefer for new code. @see lerPlataforma */
export { lerPlataforma as readPlatform } from "./funnel";
/** English alias — prefer for new code. @see maiorPerda */
export { maiorPerda as biggestFunnelLoss } from "./funnel";
/** English alias — prefer for new code. @see ondeParou */
export { ondeParou as whereFunnelStopped } from "./funnel";
/** English alias — prefer for new code. @see taxaDeParticipacao */
export { taxaDeParticipacao as participationRate } from "./funnel";
/** English alias — prefer for new code. @see validarSequencia */
export { validarSequencia as validateFunnelSequence } from "./funnel";

/** English alias — prefer for new code. @see EscolhaDoTelao */
export type { EscolhaDoTelao as WallDisplayChoice } from "./wall-display";
/** English alias — prefer for new code. @see Faixa */
export type { Faixa as WallDisplayBand } from "./wall-display";
/** English alias — prefer for new code. @see ItemDoTelao */
export type { ItemDoTelao as WallDisplayItem } from "./wall-display";
/** English alias — prefer for new code. @see ModeloDeTelao */
export type { ModeloDeTelao as WallDisplayModel } from "./wall-display";
/** English alias — prefer for new code. @see PerfilDoModelo */
export type { PerfilDoModelo as WallDisplayModelProfile } from "./wall-display";
/** English alias — prefer for new code. @see JANELA_RECENTE_MS */
export { JANELA_RECENTE_MS as RECENT_WINDOW_MS } from "./wall-display";
/** English alias — prefer for new code. @see MODELOS_DE_TELAO */
export { MODELOS_DE_TELAO as WALL_DISPLAY_MODELS } from "./wall-display";
/** English alias — prefer for new code. @see PESOS */
export { PESOS as WALL_DISPLAY_BAND_WEIGHTS } from "./wall-display";
/** English alias — prefer for new code. @see PERFIS */
export { PERFIS as WALL_DISPLAY_MODEL_PROFILES } from "./wall-display";
/** English alias — prefer for new code. @see TETO_DO_CACHE */
export { TETO_DO_CACHE as WALL_DISPLAY_CACHE_LIMIT } from "./wall-display";
/** English alias — prefer for new code. @see ehVertical */
export { ehVertical as isVertical } from "./wall-display";
/** English alias — prefer for new code. @see faixaDe */
export { faixaDe as wallDisplayBandOf } from "./wall-display";
/** English alias — prefer for new code. @see modeloCorta */
export { modeloCorta as wallDisplayModelCrops } from "./wall-display";
/** English alias — prefer for new code. @see modelosDoRodizio */
export { modelosDoRodizio as wallDisplayRotationModels } from "./wall-display";
/** English alias — prefer for new code. @see modelosPermitidos */
export { modelosPermitidos as allowedWallDisplayModels } from "./wall-display";
/** English alias — prefer for new code. @see podarCache */
export { podarCache as pruneWallDisplayCache } from "./wall-display";
/** English alias — prefer for new code. @see pontuacaoPopular */
export { pontuacaoPopular as wallDisplayPopularityScore } from "./wall-display";
/** English alias — prefer for new code. @see problemasDaEscolha */
export { problemasDaEscolha as wallDisplayChoiceProblems } from "./wall-display";
/** English alias — prefer for new code. @see proximaDoTelao */
export { proximaDoTelao as nextForWallDisplay } from "./wall-display";

/** English alias — prefer for new code. @see AtorDaRemocao */
export type { AtorDaRemocao as CommentRemovalActor } from "./comment";
/** English alias — prefer for new code. @see CodigoDeComentario */
export type { CodigoDeComentario as CommentCode } from "./comment";
/** English alias — prefer for new code. @see Comentario */
export type { Comentario as Comment } from "./comment";
/** English alias — prefer for new code. @see EntradaDeAuditoriaDeComentario */
export type { EntradaDeAuditoriaDeComentario as CommentAuditEntry } from "./comment";
/** English alias — prefer for new code. @see EstadoDoComentario */
export type { EstadoDoComentario as CommentState } from "./comment";
/** English alias — prefer for new code. @see EventoDoComentario */
export type { EventoDoComentario as CommentEvent } from "./comment";
/** English alias — prefer for new code. @see PedidoDeComentario */
export type { PedidoDeComentario as CommentRequest } from "./comment";
/** English alias — prefer for new code. @see ResultadoDePublicacao */
export type { ResultadoDePublicacao as CommentPublishResult } from "./comment";
/** English alias — prefer for new code. @see TextoValidado */
export type { TextoValidado as ValidatedCommentText } from "./comment";
/** English alias — prefer for new code. @see ThreadDeComentario */
export type { ThreadDeComentario as CommentThread } from "./comment";
/** English alias — prefer for new code. @see MAX_CARACTERES */
export { MAX_CARACTERES as MAX_COMMENT_CHARACTERS } from "./comment";
/** English alias — prefer for new code. @see PROFUNDIDADE_MAXIMA */
export { PROFUNDIDADE_MAXIMA as MAX_COMMENT_DEPTH } from "./comment";
/** English alias — prefer for new code. @see decidirExibicaoDoComentario */
export { decidirExibicaoDoComentario as decideCommentDisplay } from "./comment";
/** English alias — prefer for new code. @see montarThread */
export { montarThread as buildCommentThread } from "./comment";
/** English alias — prefer for new code. @see podeRemoverComentario */
export { podeRemoverComentario as canRemoveComment } from "./comment";
/** English alias — prefer for new code. @see registrarDecisaoDoComentario */
export { registrarDecisaoDoComentario as registerCommentDecision } from "./comment";
/** English alias — prefer for new code. @see validarTexto */
export { validarTexto as validateCommentText } from "./comment";

/**
 * PT filename shims (re-export EN modules). Prefer EN paths in new code:
 * `wall`, `guestbook`, `funnel`, `wall-display`, `comment`,
 * `album`, `musica`, `compartilhar`.
 */
