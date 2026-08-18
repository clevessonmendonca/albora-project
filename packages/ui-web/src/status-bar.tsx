// A PWA do convidado roda sobre a barra de status REAL do sistema operacional.
// Desenhar uma barra falsa (hora/sinal/bateria fixos) é ruído e mente sobre a hora.
// Este componente vira só um espaçador da safe-area do topo, para o conteúdo não
// colidir com o notch — sem nenhuma UI falsa. Mantido como componente (em vez de
// remover as chamadas) para não tocar dezenas de telas numa mudança cosmética.
export function StatusBar() {
  return <div className="h-[env(safe-area-inset-top)]" aria-hidden="true" />;
}
