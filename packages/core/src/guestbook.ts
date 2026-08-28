import { interacaoAberta } from "./interacao";

/** Texto é o corpo; áudio é a camada. Recado é enriquecimento — nunca impede a câmera. */
export const TETO_AUDIO_SEGUNDOS = 60;

/** Tamanho do que alguém lê de pé no escuro antes de voltar para a festa. */
export const TETO_TEXTO_CARACTERES = 600;

export type AudioGravado = {
  duracaoSegundos: number;
};

export type AudioDoRecado = AudioGravado & {
  /** Derivada no servidor em `events/{event_id}/recado/...`. Só existe depois disso — é por isso que `RascunhoDeRecado` não a carrega. */
  chave: string;
};

/** Cliente nunca informa a chave — nem no presign, nem no confirm. */
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

/** Um recado por evento; filtrado por `eventoId` para que RLS já recortado continue correto. */
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

/** Delega para `interacaoAberta` — duas implementações de "passou da hora" divergem no `>=`. */
export function recadoPublicado(recado: AgendamentoDoRecado, agora: Date): boolean {
  return interacaoAberta({ interacaoAbreEm: recado.publicaEm }, agora);
}

/** Id opaco de sessão — nunca nome de convidado, que é PII. */
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

/** Idempotente: preserva `lidoEm` da primeira vez — reabrir o app não é ler de novo. */
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

  // 2ª camada de isolamento: RLS é a primeira, mas sessão do evento A com recado do B para aqui antes da tela.
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
  /** Sempre `"livre"` — tipo literal impede que fechar o caminho da câmera compile. */
  camera: "livre";
};

/** Nunca lança — exceção aqui subiria pela tela entre o convidado e a câmera. */
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

export function telaTemConteudo(tela: TelaDoRecado): boolean {
  return tela.texto !== null;
}
