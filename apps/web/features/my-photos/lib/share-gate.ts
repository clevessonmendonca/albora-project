import {
  pendenciaDeConsentimento,
  type CodigoDeCompartilhamento,
  type ConsentimentoExterno,
} from "@albora/core";

export type ConsentimentoExternoBruto = {
  versao: string;
  em: string;
  revogadoEm: string | null;
  nomeNaMoldura: boolean;
};

export function mapConsentimentoExterno(
  bruto: ConsentimentoExternoBruto | null,
): ConsentimentoExterno | null {
  if (!bruto) return null;
  return {
    versao: bruto.versao,
    em: new Date(bruto.em),
    revogadoEm: bruto.revogadoEm ? new Date(bruto.revogadoEm) : null,
    nomeNaMoldura: bruto.nomeNaMoldura,
  };
}

export function precisaPedirConsentimento(
  consentimento: ConsentimentoExterno | null,
  agora = new Date(),
): boolean {
  return (
    pendenciaDeConsentimento(
      {
        sessaoId: "gate",
        eventoId: "gate",
        nome: "",
        consentimentoDeEntrada: { versao: "v1", em: agora },
        consentimentoExterno: consentimento,
      },
      agora,
    ) !== null
  );
}

export const MENSAGENS_DE_SHARE: Partial<Record<CodigoDeCompartilhamento, string>> = {
  "compartilhar.desligado_pelo_anfitriao":
    "Nesta festa, postar para fora está desligado.",
  "compartilhar.sem_consentimento_externo":
    "Antes de postar fora, precisa aceitar que a foto sai do evento.",
  "compartilhar.consentimento_desatualizado":
    "O aceite de postar fora mudou. Confira de novo.",
  "compartilhar.consentimento_sem_data":
    "O aceite de postar fora está incompleto. Confira de novo.",
  "compartilhar.consentimento_revogado":
    "O aceite de postar fora foi retirado. Confira de novo.",
  "compartilhar.bloqueado_pela_moderacao": "Esta foto ainda não pode sair do evento.",
  "compartilhar.nao_e_autor": "Só dá para compartilhar fotos suas.",
  "compartilhar.evento_diferente": "Esta foto é de outra festa.",
  "compartilhar.modelo_corta_a_foto": "Esta foto não cabe na moldura sem cortar o topo.",
  "compartilhar.colagem_vazia": "A colagem precisa de fotos suas já enviadas.",
  "compartilhar.colagem_grande_demais": "A colagem leva no máximo quatro fotos.",
};

export function mensagemDeShare(codigo: CodigoDeCompartilhamento): string {
  return MENSAGENS_DE_SHARE[codigo] ?? "Não dá para compartilhar agora.";
}
