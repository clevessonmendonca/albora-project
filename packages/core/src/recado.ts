import { interacaoAberta } from "./interacao";

/**
 * O recado dos anfitriões (spec 019).
 *
 * Duas decisões de produto explicam o resto do arquivo.
 *
 * **O texto é o corpo, o áudio é a camada.** Às 23h, num salão com música
 * alta, um recado só em áudio é inaudível — esse é o caso comum, não a exceção
 * de acessibilidade. Por isso `validarRascunho` recusa recado sem texto: se a
 * regra morasse no formulário do admin, a primeira rota que gravasse sem
 * passar por ele criaria um recado que ninguém consegue receber.
 *
 * **O recado é enriquecimento, nunca caminho crítico.** Se o áudio não
 * carregar, a tela mostra o texto; se nada carregar, o app segue para a
 * câmera. `montarTela` é total: aceita qualquer estado, inclusive incoerente,
 * e devolve uma tela — um recado que impede fotografar inverteria a prioridade
 * do produto inteiro.
 */

/** Teto de gravação, spec 019. */
export const TETO_AUDIO_SEGUNDOS = 60;

/**
 * Teto do texto. Não é limite de coluna: é o tamanho do que alguém lê de pé,
 * no escuro, antes de voltar para a festa.
 */
export const TETO_TEXTO_CARACTERES = 600;

export type AudioGravado = {
  duracaoSegundos: number;
};

export type AudioDoRecado = AudioGravado & {
  /**
   * Derivada no servidor em `events/{event_id}/recado/...`. Só existe depois
   * disso — é por isso que `RascunhoDeRecado` não a carrega.
   */
  chave: string;
};

/**
 * O que o admin manda. Não tem campo de chave de storage, e a ausência é a
 * regra: o cliente nunca informa a chave, nem no presign, nem no confirm.
 */
export type RascunhoDeRecado = {
  texto: string;
  audio: AudioGravado | null;
  /** `null` = ainda não agendado, logo invisível para todo convidado. */
  publicaEm: Date | null;
};

export type Recado = {
  id: string;
  eventoId: string;
  texto: string;
  audio: AudioDoRecado | null;
  publicaEm: Date | null;
};

export type ErroDoRecado =
  | { code: "recado.texto_obrigatorio" }
  | { code: "recado.texto_longo_demais"; details: { caracteres: number; limite: number } }
  | { code: "recado.audio_vazio" }
  | { code: "recado.audio_longo_demais"; details: { segundos: number; limite: number } }
  | { code: "recado.ja_existe"; details: { eventoId: string } };

/**
 * Recusa o rascunho antes de assinar upload de áudio nenhum.
 *
 * O texto é checado primeiro de propósito: um recado com áudio impecável e
 * sem texto é recusado do mesmo jeito, e o erro que o admin vê é o que
 * importa.
 */
export function validarRascunho(rascunho: RascunhoDeRecado): ErroDoRecado | null {
  const texto = rascunho.texto.trim();

  if (texto.length === 0) {
    return { code: "recado.texto_obrigatorio" };
  }

  if (texto.length > TETO_TEXTO_CARACTERES) {
    return {
      code: "recado.texto_longo_demais",
      details: { caracteres: texto.length, limite: TETO_TEXTO_CARACTERES },
    };
  }

  if (rascunho.audio !== null) {
    if (rascunho.audio.duracaoSegundos <= 0) {
      return { code: "recado.audio_vazio" };
    }
    if (rascunho.audio.duracaoSegundos > TETO_AUDIO_SEGUNDOS) {
      return {
        code: "recado.audio_longo_demais",
        details: { segundos: rascunho.audio.duracaoSegundos, limite: TETO_AUDIO_SEGUNDOS },
      };
    }
  }

  return null;
}

/**
 * Um recado por evento no primeiro corte.
 *
 * A contagem é filtrada por `eventoId`: recado do evento B não pode bloquear a
 * gravação do evento A, e uma lista já recortada pelo RLS continua correta
 * aqui.
 */
export function validarCriacao(
  existentes: readonly Recado[],
  eventoId: string,
  rascunho: RascunhoDeRecado,
): ErroDoRecado | null {
  if (existentes.some((r) => r.eventoId === eventoId)) {
    return { code: "recado.ja_existe", details: { eventoId } };
  }
  return validarRascunho(rascunho);
}

export type AgendamentoDoRecado = Pick<Recado, "publicaEm">;

/**
 * O agendamento é próprio, a mecânica é a do gate do ADR 0009 — e delega para
 * ela em vez de repetir a comparação. Duas implementações de "já passou da
 * hora" divergem no `>=` e a festa passa a ter dois horários.
 */
export function recadoPublicado(recado: AgendamentoDoRecado, agora: Date): boolean {
  return interacaoAberta({ interacaoAbreEm: recado.publicaEm }, agora);
}

/**
 * Uma linha de `recado_lido`. Carrega id opaco de sessão e nunca o nome de
 * quem leu: é tabela de evento como qualquer outra, e nome de convidado é PII.
 */
export type LeituraDoRecado = {
  eventoId: string;
  sessaoId: string;
  recadoId: string;
  lidoEm: Date;
};

export function foiLido(
  leituras: readonly LeituraDoRecado[],
  recadoId: string,
  sessaoId: string,
): boolean {
  return leituras.some((l) => l.recadoId === recadoId && l.sessaoId === sessaoId);
}

/**
 * Idempotente por `(recadoId, sessaoId)`, preservando o `lidoEm` da primeira
 * vez. Reabrir o app não é ler de novo — sobrescrever a data faria a entrega
 * "uma vez por sessão" virar uma vez por abertura na hora de auditar.
 */
export function marcarLido(
  leituras: readonly LeituraDoRecado[],
  recado: Pick<Recado, "id" | "eventoId">,
  sessaoId: string,
  em: Date,
): LeituraDoRecado[] {
  if (foiLido(leituras, recado.id, sessaoId)) return [...leituras];

  return [
    ...leituras,
    { eventoId: recado.eventoId, sessaoId, recadoId: recado.id, lidoEm: em },
  ];
}

export type SessaoDoRecado = {
  id: string;
  eventoId: string;
};

export type CodigoDeEntrega =
  | "recado.inexistente"
  | "recado.outro_evento"
  | "recado.agendado"
  | "recado.ja_lido"
  | "recado.entregar";

export type Entrega = {
  mostrar: boolean;
  codigo: CodigoDeEntrega;
  recado: Recado | null;
};

export function decidirEntrega(
  recado: Recado | null,
  sessao: SessaoDoRecado,
  leituras: readonly LeituraDoRecado[],
  agora: Date,
): Entrega {
  if (recado === null) {
    return { mostrar: false, codigo: "recado.inexistente", recado: null };
  }

  // Segunda camada do isolamento por evento. O RLS é a primeira e continua
  // sendo a que vale; esta existe porque uma sessão do evento A que receba o
  // recado do evento B por payload mal montado precisa parar aqui, e não na
  // tela do convidado.
  if (recado.eventoId !== sessao.eventoId) {
    return { mostrar: false, codigo: "recado.outro_evento", recado: null };
  }

  if (!recadoPublicado(recado, agora)) {
    return { mostrar: false, codigo: "recado.agendado", recado: null };
  }

  if (foiLido(leituras, recado.id, sessao.id)) {
    return { mostrar: false, codigo: "recado.ja_lido", recado: null };
  }

  return { mostrar: true, codigo: "recado.entregar", recado };
}

export type EstadoDoAudio = "disponivel" | "indisponivel";

export type TelaDoRecado = {
  /** `null` quando não há corpo nenhum a mostrar. Ver `telaTemConteudo`. */
  texto: string | null;
  audio: AudioDoRecado | null;
  /**
   * Sempre `"livre"`, em todo estado — inclusive nos incoerentes. O tipo é
   * literal para que fechar o caminho da câmera nem compile.
   */
  camera: "livre";
};

/**
 * Monta a tela a partir do que carregou. **Nunca lança**, e nunca depende de o
 * recado estar coerente: erro no recado que virasse exceção subiria pela tela
 * que fica entre o convidado e a câmera.
 */
export function montarTela(entrega: Entrega, estadoDoAudio: EstadoDoAudio): TelaDoRecado {
  if (!entrega.mostrar || entrega.recado === null) {
    return { texto: null, audio: null, camera: "livre" };
  }

  const texto = entrega.recado.texto.trim();

  return {
    texto: texto.length > 0 ? texto : null,
    audio: estadoDoAudio === "disponivel" ? entrega.recado.audio : null,
    camera: "livre",
  };
}

/**
 * Tela sem texto não é tela: o app pula direto para a câmera.
 *
 * Áudio sozinho não segura ninguém na tela — é exatamente o recado inaudível
 * que o teto de texto obrigatório existe para impedir.
 */
export function telaTemConteudo(tela: TelaDoRecado): boolean {
  return tela.texto !== null;
}
