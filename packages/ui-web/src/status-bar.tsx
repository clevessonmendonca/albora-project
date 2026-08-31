// Só espaçador de safe-area — nunca UI falsa (hora/sinal/bateria). Mantido como componente para não tocar dezenas de telas.
export function StatusBar() {
  return <div className="h-[env(safe-area-inset-top)]" aria-hidden="true" />;
}
