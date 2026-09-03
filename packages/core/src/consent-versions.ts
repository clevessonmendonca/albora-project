/**
 * Registro central das versões de consentimento do convidado. O texto legal
 * é código, não dado — muda por deploy revisado, nunca por escrita solta no
 * banco. `guest_sessions.consent_version` / `.external_consent_version`
 * guardam qual versão a pessoa aceitou; este arquivo é a única fonte do que
 * o texto de cada versão dizia. Toda superfície que mostra o texto ao
 * convidado (entrada, compartilhamento externo) e o painel de auditoria LGPD
 * do anfitrião leem daqui — se divergirem, a auditoria mente sobre o que a
 * pessoa realmente aceitou.
 */

export type TipoDeConsentimento = "entrada" | "externo";

export type VersaoDeConsentimento = {
  tipo: TipoDeConsentimento;
  versao: string;
  rotulo: string;
  texto: string;
};

export const CONSENTIMENTO_ENTRADA_VIGENTE = "v1";
export const CONSENTIMENTO_EXTERNO_VIGENTE = "externo-v1";

export const VERSOES_DE_CONSENTIMENTO: readonly VersaoDeConsentimento[] = [
  {
    tipo: "entrada",
    versao: CONSENTIMENTO_ENTRADA_VIGENTE,
    rotulo: "Entrada no evento",
    texto:
      "As fotos e vídeos que você enviar ficam visíveis para quem participa desta festa — no álbum, no feed e no telão, conforme os anfitriões liberarem. Seus dados ficam neste evento até o prazo de retenção definido pelos anfitriões. Você pode pedir a remoção das suas fotos a qualquer momento.",
  },
  {
    tipo: "externo",
    versao: CONSENTIMENTO_EXTERNO_VIGENTE,
    rotulo: "Compartilhamento fora da festa",
    texto:
      "A foto vai sair com a moldura desta festa: monograma, nomes, data e o endereço da Albora. Quem receber no Instagram ou WhatsApp pode guardar para sempre — não dá para desfazer depois.",
  },
];

export function versaoVigente(tipo: TipoDeConsentimento): string {
  return tipo === "entrada" ? CONSENTIMENTO_ENTRADA_VIGENTE : CONSENTIMENTO_EXTERNO_VIGENTE;
}

export function textoDoConsentimento(tipo: TipoDeConsentimento, versao: string): string | null {
  return VERSOES_DE_CONSENTIMENTO.find((v) => v.tipo === tipo && v.versao === versao)?.texto ?? null;
}

export function rotuloDoConsentimento(tipo: TipoDeConsentimento, versao: string): string | null {
  return VERSOES_DE_CONSENTIMENTO.find((v) => v.tipo === tipo && v.versao === versao)?.rotulo ?? null;
}
