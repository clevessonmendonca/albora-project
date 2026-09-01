"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 flex items-center justify-center gap-2 bg-ink px-4 py-2.5 text-center text-sm font-medium text-bg"
    >
      <span aria-hidden="true" className="inline-block size-2 rounded-full bg-critico" />
      Sem conexão — suas fotos estão seguras e sobem quando voltar
    </div>
  );
}
