import { AppState } from "react-native";

type AppStateLike = {
  addEventListener: (
    event: "change",
    handler: (state: string) => void,
  ) => { remove: () => void };
};

type DrainFn = () => Promise<unknown>;

/** Assina mudanças de AppState e drena a fila de upload quando o app retorna ao primeiro plano (`active`). Guard de reentrância: se o drain anterior ainda não terminou, a chamada duplicada é descartada silenciosamente. @param drain Função de drenagem — injetável para facilitar testes. @param appState Opcional; padrão `AppState` do React Native. @returns Função de cancelamento adequada para cleanup de `useEffect`. */
export function subscribeForegroundDrain(
  drain: DrainFn,
  appState: AppStateLike = AppState,
): () => void {
  let emCurso = false;

  const subscription = appState.addEventListener("change", (next) => {
    if (next !== "active") return;
    if (emCurso) return;
    emCurso = true;
    void drain()
      .finally(() => { emCurso = false; })
      .catch(() => undefined);
  });

  return () => subscription.remove();
}
