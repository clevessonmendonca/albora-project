export type ErroDeCriacao = { texto: string; precisaEntrar: boolean };

export function erroDeCriacao(status: number | null, mensagemDoServidor?: string | null): ErroDeCriacao {
  if (status === 401) {
    return { texto: "Sua sessão expirou. Entre de novo em outra aba e volte aqui para criar: seus dados continuam nesta tela.", precisaEntrar: true };
  }
  if (status === 403) {
    return { texto: "Esta conta não pode criar este evento. Troque de conta ou fale com a gente.", precisaEntrar: false };
  }
  if (status === 429) {
    return { texto: "Muitas tentativas seguidas. Espere um instante e tente de novo.", precisaEntrar: false };
  }
  if (status === 422) {
    const detalhe = mensagemDoServidor?.trim();
    return {
      texto: detalhe
        ? `${detalhe}. Volte à etapa correspondente, ajuste e tente de novo.`
        : "Algum dado não passou na conferência. Revise as etapas e tente de novo.",
      precisaEntrar: false,
    };
  }
  if (status === null) {
    return { texto: "Sem conexão com o servidor. Confira a internet e tente de novo.", precisaEntrar: false };
  }
  return { texto: "Algo falhou do nosso lado. Tente de novo em instantes.", precisaEntrar: false };
}
