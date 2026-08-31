import { pendenciaDeConsentimento } from "./autorizacao";
import type {
  ConteudoDaMoldura,
  IdentidadeDoEvento,
  MidiaParaCompartilhar,
  SessaoQueCompartilha,
} from "./types";

export function conteudoDaMoldura(
  identidade: IdentidadeDoEvento,
  midia: MidiaParaCompartilhar,
  sessao: SessaoQueCompartilha,
  agora: Date,
): ConteudoDaMoldura {
  const consentimento = sessao.consentimentoExterno;

  const podeCreditar =
    midia.sessaoDeOrigem === sessao.sessaoId &&
    consentimento !== null &&
    consentimento.nomeNaMoldura &&
    pendenciaDeConsentimento(sessao, agora) === null;

  return {
    monograma: identidade.monograma,
    titulo: identidade.titulo,
    data: identidade.data,
    slug: identidade.slug,
    legenda: midia.legenda,
    credito: podeCreditar ? sessao.nome : null,
  };
}
