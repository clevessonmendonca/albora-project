/** Ação ao voltar ao foco (visibilitychange/pageshow) — compartilhada entre `useUpload` e `useEventQueue`, que aplicam a mesma regra sobre a mesma fila. */
export type AcaoFoco = "drenar" | "atualizar" | "ignorar";

export function resolverAcaoFoco(visivel: boolean, online: boolean): AcaoFoco {
  if (!visivel) return "ignorar";
  return online ? "drenar" : "atualizar";
}
