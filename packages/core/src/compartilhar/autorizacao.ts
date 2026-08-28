import { decidirExibicao } from "../moderacao";
import type {
  Autorizacao,
  CodigoDeCompartilhamento,
  EventoQueCompartilha,
  MidiaParaCompartilhar,
  SessaoQueCompartilha,
} from "./types";
import { MAX_DA_COLAGEM, VERSAO_DO_CONSENTIMENTO_EXTERNO } from "./types";

function negar(
  codigo: CodigoDeCompartilhamento,
  motivoDaModeracao: Autorizacao["motivoDaModeracao"] = null,
): Autorizacao {
  return { pode: false, codigo, motivoDaModeracao };
}

export function pendenciaDeConsentimento(
  sessao: SessaoQueCompartilha,
  agora: Date,
): CodigoDeCompartilhamento | null {
  const consentimento = sessao.consentimentoExterno;
  if (consentimento === null) return "compartilhar.sem_consentimento_externo";

  if (consentimento.versao !== VERSAO_DO_CONSENTIMENTO_EXTERNO) {
    return "compartilhar.consentimento_desatualizado";
  }

  const em = consentimento.em.getTime();
  if (!Number.isFinite(em) || em > agora.getTime()) {
    return "compartilhar.consentimento_sem_data";
  }

  const revogado = consentimento.revogadoEm;
  if (revogado !== null && revogado.getTime() <= agora.getTime()) {
    return "compartilhar.consentimento_revogado";
  }

  return null;
}

export function autorizarCompartilhamento(
  midia: MidiaParaCompartilhar,
  sessao: SessaoQueCompartilha,
  evento: EventoQueCompartilha,
  agora: Date,
): Autorizacao {
  if (midia.eventoId !== sessao.eventoId) return negar("compartilhar.evento_diferente");
  if (midia.sessaoDeOrigem !== sessao.sessaoId) return negar("compartilhar.nao_e_autor");
  if (!evento.compartilhamentoExternoLiberado) {
    return negar("compartilhar.desligado_pelo_anfitriao");
  }

  const pendencia = pendenciaDeConsentimento(sessao, agora);
  if (pendencia !== null) return negar(pendencia);

  const moderacao = decidirExibicao(midia.estado, evento, "telao");
  if (!moderacao.visivel) {
    return negar("compartilhar.bloqueado_pela_moderacao", moderacao.codigo);
  }

  return { pode: true, codigo: "compartilhar.autorizado", motivoDaModeracao: null };
}

export function midiasCompartilhaveis(
  midias: readonly MidiaParaCompartilhar[],
  sessao: SessaoQueCompartilha,
  evento: EventoQueCompartilha,
  agora: Date,
): MidiaParaCompartilhar[] {
  return midias.filter((m) => autorizarCompartilhamento(m, sessao, evento, agora).pode);
}

export function autorizarColagem(
  midias: readonly MidiaParaCompartilhar[],
  sessao: SessaoQueCompartilha,
  evento: EventoQueCompartilha,
  agora: Date,
): Autorizacao {
  if (midias.length === 0) return negar("compartilhar.colagem_vazia");
  if (midias.length > MAX_DA_COLAGEM) return negar("compartilhar.colagem_grande_demais");

  for (const midia of midias) {
    const autorizacao = autorizarCompartilhamento(midia, sessao, evento, agora);
    if (!autorizacao.pode) return autorizacao;
  }

  return { pode: true, codigo: "compartilhar.autorizado", motivoDaModeracao: null };
}
