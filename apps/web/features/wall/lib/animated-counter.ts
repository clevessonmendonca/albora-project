/**
 * Passo de aproximação do número exibido até o alvo do contador público
 * (spec A4): sempre sobe, nunca conta pra trás — uma queda por moderação
 * salta direto para o novo valor, sem "desanimar" o placar — e desacelera
 * perto do alvo em vez de saltar de uma vez.
 */
export function proximoValorExibido(atual: number, alvo: number): number {
  if (alvo <= atual) return alvo;
  const diferenca = alvo - atual;
  const passo = Math.max(1, Math.round(diferenca * 0.2));
  return Math.min(alvo, atual + passo);
}
