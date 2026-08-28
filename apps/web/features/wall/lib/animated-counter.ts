/** Passo de aproximação ao alvo (spec A4): sempre sobe (queda por moderação salta direto, sem "desanimar"), desacelera próximo do alvo. */
export function proximoValorExibido(atual: number, alvo: number): number {
  if (alvo <= atual) return alvo;
  const diferenca = alvo - atual;
  const passo = Math.max(1, Math.round(diferenca * 0.2));
  return Math.min(alvo, atual + passo);
}
