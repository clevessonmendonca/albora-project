export type {
  Evento,
  EventoId,
  Midia,
  MidiaId,
  Missao,
  Sessao,
  SessaoId,
} from "./tipos";

export type { QueueBody, QueueDetails, Queue, QueueItem } from "./fila";
export type {
  QueueBody as CorpoItem,
  QueueDetails as DetalhesItem,
  Queue as Fila,
  QueueItem as ItemFila,
} from "./fila";
export { shouldGiveUp, retryWaitSeconds, MAX_ATTEMPTS } from "./fila";
export {
  shouldGiveUp as deveDesistir,
  retryWaitSeconds as esperaAntesDeRetentar,
  MAX_ATTEMPTS as MAX_TENTATIVAS,
} from "./fila";

export type { GateDeInteracao, ModoInteracao } from "./interacao";
export { interacaoAberta, modoInteracao } from "./interacao";

export type { AjustesManuais } from "./ajustes";
export { AJUSTES_NEUTROS, aplicarAjustes, saoNeutros } from "./ajustes";

export type { Ajustes, Filtro } from "./luts";
export { aplicarIntensidade, NEUTRO, paraFiltroCss } from "./luts";

export type { Preset } from "./presets";
export { aplicarPorPixel, ordenarComRecomendado, preset, PRESETS, TETO_POR_PIXEL_MS } from "./presets";

export { chaveThumbDeFull, derivarChaveMidia, derivarChaveRecado, chaveRecadoValida, prefixoDoEvento } from "./chaves";
export { chaveExportValida, derivarChaveExport } from "./chaves";
export type { EstadoDoExport, ItemDoAcervo } from "./acervo-export";
export {
  ACAO_EXPORT_ACERVO,
  TETO_DO_EXPORT,
  midiaExportavel,
  nomeDoArquivoZip,
  nomeNoZip,
} from "./acervo-export";
export type { ZipStoreEntry } from "./zip-store";
export { crc32Update, zipStore } from "./zip-store";

export type { ErroMidia, TipoAceito, TipoEntrada, TipoVideo } from "./midia";
export {
  detectarTipo,
  isHeic,
  isHeic as ehHeic,
  isVideoMime,
  isVideoMime as ehMimeVideo,
  isVideoBytes,
  isVideoBytes as ehVideo,
  LADO_MAIOR,
  MAX_BYTES,
  MAX_BYTES_VIDEO,
  PREFIXO_MAGIC_BYTES,
  TIPOS_ACEITOS,
  TIPOS_ENTRADA,
  TIPOS_VIDEO,
  tipoAceito,
  validarConteudo,
  validarDeclaracao,
  validarObjetoRecebido,
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
export { dimensoesCorrigidas, lerCapturadaEm, lerOrientacao, temExif, temGeolocalizacao, transformacaoParaOrientacao } from "./exif";

export type { Target, Device, Plan } from "./redimensionar";
export type { Target as Alvo, Device as Aparelho, Plan as Plano } from "./redimensionar";
export {
  fullTarget,
  targetForLongerSide,
  targetThatFits,
  thumbTarget,
  THUMB_SIDE,
  planProcessing,
  QUALITY,
  PIXEL_CAP,
  pixelCapForDevice,
} from "./redimensionar";
export {
  fullTarget as alvoFull,
  targetForLongerSide as alvoParaLadoMaior,
  targetThatFits as alvoQueCabe,
  thumbTarget as alvoThumb,
  THUMB_SIDE as LADO_THUMB,
  planProcessing as planejarProcessamento,
  QUALITY as QUALIDADE,
  PIXEL_CAP as TETO_PIXELS,
  pixelCapForDevice as tetoParaAparelho,
} from "./redimensionar";

export type { SendResult, DrainSummary, Transport } from "./envio";
export type {
  SendResult as Resultado,
  DrainSummary as ResumoDrenagem,
  Transport as Transporte,
} from "./envio";
export { drain, sendItem } from "./envio";
export { drain as drenar, sendItem as enviarItem } from "./envio";

export {
  isValidSlug,
  extractSlug,
  eventPath,
  eventEntryPath,
  eventEntryUrl,
  whatsappInviteUrl,
  slugValido,
  extrairSlug,
  caminhoDoEvento,
} from "./qr";
export { GUEST_SESSION_COOKIE } from "./sessao-cookie";

export type { Bitmap, Desenhista, FiltroAplicado, FotoProcessada, OpcoesProcessamento } from "./processar";
export { processarFoto } from "./processar";

export type {
  CodigoDeModeracao,
  Decisao,
  EntradaDeAuditoria,
  EstadoDaMidia,
  EstadoDoEvento,
  MotivoDaFila,
  MotivoDeDenuncia,
  Superficie,
  VeredictoDoClassificador,
} from "./moderacao";
export {
  DENUNCIAS_PARA_SEGURAR,
  MOTIVOS_DE_DENUNCIA,
  MOTIVO_DENUNCIA_PADRAO,
  decidirExibicao,
  denunciaSeguraTelao,
  ehMotivoDeDenuncia,
  interpretarVeredicto,
  motivoDaFila,
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
  ViaDeEntrada,
} from "./funnel";
export {
  ESPINHA_DO_FUNIL,
  EVENTOS_DO_FUNIL,
  VIAS_DE_ENTRADA,
  ehViaDeEntrada,
  eventosDeEntrada,
  parseViaDeEntrada,
  MARGEM_DE_RUIDO,
  MetricaInvalida,
  PISO_DA_FRICCAO,
  PISO_DA_TESE,
  PRE_REQUISITOS,
  compararPlataforma,
  decidirTese,
  degraus,
  ehEventoDoFunil,
  ehEventoUnicoDoFunil,
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
  EntradaDeImagem,
  NomeDoProvedorDeImagem,
  ProvedorDeClassificadorDeImagem,
} from "./classificador-imagem";
export {
  TEMPO_MAXIMO_MS as TEMPO_MAXIMO_CLASSIFICADOR_IMAGEM_MS,
  classificarImagem,
  provedorDeImagemDoAmbiente,
  provedorHeuristico,
} from "./classificador-imagem";

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
export type { FusoDoEvento } from "./album";
export {
  CAPITULO_SEM_HORA,
  CAPITULO_UNICO,
  FOLGA_DA_JANELA_MS,
  FUSOS_DO_EVENTO,
  FUSO_PADRAO,
  HORAS_DO_AMANHECER,
  JANELA_DE_RAJADA_MS,
  LAYOUTS,
  OFFSET_PADRAO_MINUTOS,
  TETO_DE_PAGINAS_PADRAO,
  agruparEmBlocos,
  capituloDe,
  contarAcervo,
  diagramarBloco,
  ehAmanhecer,
  escolherLayout,
  fusoIanaValido,
  fusoOuPadrao,
  horaNoEvento,
  inicioDaHoraNoEvento,
  instanteDaParede,
  instanteDaParedeNoFuso,
  instanteDe,
  instanteLocalNoFuso,
  layoutsQueCabem,
  montarAlbum,
  offsetMinutosDoFuso,
  ordemDeDescarte,
  ordemNaRajada,
  planejarCapitulos,
  primeiroAmanhecerNaJanela,
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

export {
  MAX_NOME_EXIBICAO,
  MIN_NOME_EXIBICAO,
  NOME_NEUTRO_DO_TELAO,
  nomeNeutroDoTelao,
  validarNomeDeExibicao,
} from "./nome-exibicao";
/** English alias — prefer for new code. @see NOME_NEUTRO_DO_TELAO */
export { NOME_NEUTRO_DO_TELAO as WALL_NEUTRAL_NAME } from "./nome-exibicao";
/** English alias — prefer for new code. @see nomeNeutroDoTelao */
export { nomeNeutroDoTelao as wallNeutralName } from "./nome-exibicao";
/** English alias — prefer for new code. @see validarNomeDeExibicao */
export { validarNomeDeExibicao as validateDisplayName } from "./nome-exibicao";

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
/** English alias — prefer for new code. @see validarConteudo */
export { validarConteudo as validateContent } from "./midia";
/** English alias — prefer for new code. @see validarObjetoRecebido */
export { validarObjetoRecebido as validateReceivedObject } from "./midia";
/** English alias — prefer for new code. @see PREFIXO_MAGIC_BYTES */
export { PREFIXO_MAGIC_BYTES as MAGIC_BYTE_PREFIX } from "./midia";
/** English alias — prefer for new code. */
export { podeEnviarVideo as canUploadVideo } from "./plano-evento";
/** English alias — prefer for new code. */
export { processarFoto as processPhoto } from "./processar";
/** English alias — prefer for new code. */
export { lerCapturadaEm as readCapturedAt } from "./exif";
/** English alias — prefer for new code. */
export { instanteDaParede as wallClockToInstant } from "./album";
/** English alias — prefer for new code. */
export { instanteDaParedeNoFuso as wallClockInTimeZone } from "./album";
/** English alias — prefer for new code. */
export { offsetMinutosDoFuso as timezoneOffsetMinutes } from "./album";
/** English alias — prefer for new code. */
export { FUSO_PADRAO as DEFAULT_TIMEZONE } from "./album";
/** English alias — prefer for new code. */
export { fusoIanaValido as isValidIanaTimeZone } from "./album";
/** English alias — prefer for new code. */
export { montarGaleria as buildGallery } from "./galeria";
/** English alias — prefer for new code. */
export { publicarComentario as publishComment } from "./comment";
/** English alias — prefer for new code. */
export { decidirExibicao as decideDisplay } from "./moderacao";
/** English alias — prefer for new code. */
export { interpretarVeredicto as interpretVerdict } from "./moderacao";
/** English alias — prefer for new code. */
export { ehMotivoDeDenuncia as isReportKind } from "./moderacao";
/** English alias — prefer for new code. */
export { denunciaSeguraTelao as reportHoldsDisplay } from "./moderacao";
/** English alias — prefer for new code. */
export { motivoDaFila as reviewReason } from "./moderacao";
/** English alias — prefer for new code. */
export { precisaDeRevisao as needsReview } from "./moderacao";
/** English alias — prefer for new code. */
export { autorizarCompartilhamento as authorizeShare } from "./compartilhar";
/** English alias — prefer for new code. */
export { compor as composeShare } from "./compartilhar";
/** English alias — prefer for new code. */
export { montarAlbum as buildAlbum } from "./album";
/** English alias — prefer for new code. */
export { planejarCapitulos as planChapters } from "./album";
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
/** English alias — prefer for new code. @see derivarChaveRecado */
export { derivarChaveRecado as deriveGuestbookAudioKey } from "./chaves";
/** English alias — prefer for new code. @see chaveRecadoValida */
export { chaveRecadoValida as isGuestbookAudioKey } from "./chaves";
/** English alias — prefer for new code. @see derivarChaveExport */
export { derivarChaveExport as deriveExportKey } from "./chaves";
/** English alias — prefer for new code. @see chaveExportValida */
export { chaveExportValida as isExportKey } from "./chaves";
/** English alias — prefer for new code. @see midiaExportavel */
export { midiaExportavel as isExportableMedia } from "./acervo-export";
/** English alias — prefer for new code. @see nomeNoZip */
export { nomeNoZip as zipEntryName } from "./acervo-export";
/** English alias — prefer for new code. @see nomeDoArquivoZip */
export { nomeDoArquivoZip as zipDownloadName } from "./acervo-export";

export type { ErroAudioRecado, TipoAudioRecado } from "./guestbook-audio";
export {
  ACEITE_AUDIO_VERSAO,
  TETO_BYTES_AUDIO_RECADO,
  TIPOS_AUDIO_RECADO,
  duracaoParaEnvio,
  normalizarMimeAudio,
  validarAceiteAudio,
  validarConteudoAudio,
  validarDeclaracaoAudio,
} from "./guestbook-audio";
/** English alias — prefer for new code. @see ACEITE_AUDIO_VERSAO */
export { ACEITE_AUDIO_VERSAO as GUESTBOOK_AUDIO_CONSENT_VERSION } from "./guestbook-audio";
/** English alias — prefer for new code. @see TETO_BYTES_AUDIO_RECADO */
export { TETO_BYTES_AUDIO_RECADO as MAX_GUESTBOOK_AUDIO_BYTES } from "./guestbook-audio";
/** English alias — prefer for new code. @see validarDeclaracaoAudio */
export { validarDeclaracaoAudio as validateGuestbookAudioDeclaration } from "./guestbook-audio";
/** English alias — prefer for new code. @see validarConteudoAudio */
export { validarConteudoAudio as validateGuestbookAudioContent } from "./guestbook-audio";
/** English alias — prefer for new code. @see validarAceiteAudio */
export { validarAceiteAudio as validateGuestbookAudioConsent } from "./guestbook-audio";
/** English alias — prefer for new code. @see normalizarMimeAudio */
export { normalizarMimeAudio as normalizeGuestbookAudioMime } from "./guestbook-audio";
/** English alias — prefer for new code. @see duracaoParaEnvio */
export { duracaoParaEnvio as durationForUpload } from "./guestbook-audio";

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
/** English alias — prefer for new code. @see ehEventoUnicoDoFunil */
export { ehEventoUnicoDoFunil as isUniqueFunnelEvent } from "./funnel";
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
/** English alias — prefer for new code. @see ViaDeEntrada */
export type { ViaDeEntrada as EntryVia } from "./funnel";
/** English alias — prefer for new code. @see VIAS_DE_ENTRADA */
export { VIAS_DE_ENTRADA as ENTRY_VIAS } from "./funnel";
/** English alias — prefer for new code. @see ehViaDeEntrada */
export { ehViaDeEntrada as isEntryVia } from "./funnel";
/** English alias — prefer for new code. @see eventosDeEntrada */
export { eventosDeEntrada as entryEvents } from "./funnel";
/** English alias — prefer for new code. @see parseViaDeEntrada */
export { parseViaDeEntrada as parseEntryVia } from "./funnel";

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
