import * as BackgroundFetch from "expo-background-fetch";

export type BackgroundFetchLabel = {
  codigo: number | null;
  rotulo: string;
};

/** Rótulo humano do status do SO — para a tela Fila / validação em aparelho. */
export function rotuloBackgroundFetch(status: number | null): BackgroundFetchLabel {
  if (status === null) return { codigo: null, rotulo: "Indisponível neste ambiente" };
  if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
    return { codigo: status, rotulo: "Restrito pelo sistema" };
  }
  if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
    return { codigo: status, rotulo: "Negado — ative atualização em background" };
  }
  return { codigo: status, rotulo: "Ativo" };
}

export async function lerStatusBackgroundFetch(
  getStatus: () => Promise<number | null> = () => BackgroundFetch.getStatusAsync(),
): Promise<BackgroundFetchLabel> {
  try {
    return rotuloBackgroundFetch(await getStatus());
  } catch {
    return rotuloBackgroundFetch(null);
  }
}
