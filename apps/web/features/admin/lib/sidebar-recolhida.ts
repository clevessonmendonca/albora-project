/**
 * Preferência de rail recolhido, lida no servidor.
 *
 * Fica em cookie, e não em `localStorage`, pelo mesmo motivo do tema: o
 * servidor precisa saber a largura antes de pintar. Com `localStorage` o rail
 * nasceria aberto e encolheria no primeiro frame, arrastando o conteúdo junto.
 */
export const RAIL_COOKIE = "albora_rail";

const RECOLHIDO = "recolhido";

export function railRecolhido(valor: string | undefined): boolean {
  return valor === RECOLHIDO;
}

export function cookieDoRail(recolhido: boolean): string {
  const valor = recolhido ? RECOLHIDO : "aberto";
  // Um ano: é preferência de espaço de trabalho, não estado de sessão.
  return `${RAIL_COOKIE}=${valor}; path=/; max-age=31536000; samesite=lax`;
}
