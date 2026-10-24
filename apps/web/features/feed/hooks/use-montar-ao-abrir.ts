import { useState } from "react";

/** Folha só entra no DOM na primeira abertura e fica montada depois, para a animação de saída não ser cortada. */
export function useMontarAoAbrir(aberto: boolean): boolean {
  const [montado, setMontado] = useState(aberto);
  if (aberto && !montado) setMontado(true);
  return montado || aberto;
}
