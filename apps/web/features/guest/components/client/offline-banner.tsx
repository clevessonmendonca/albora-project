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
      className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-toast flex items-center justify-center gap-2 rounded-b-media bg-ink px-4 py-3 text-center shadow-suave"
    >
      <span aria-hidden="true" className="inline-block size-2 shrink-0 rounded-full bg-acento" />
      <p className="m-0 tipo-caption font-medium text-bg">
        Sem conexão — suas fotos estão seguras e sobem quando voltar
      </p>
    </div>
  );
}
