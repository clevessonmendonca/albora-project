"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminCard, adminClasses } from "@/features/admin/components/server/admin-shell";
import {
  buildPreEventSections,
  readPreEventChecklist,
} from "@/features/admin/lib/pre-event-checklist";

type Props = {
  eventId: string;
  storageKey: string;
  startsAt: Date;
};

export function PreEventPromo({ eventId, storageKey, startsAt }: Props) {
  const [done, setDone] = useState<number | null>(null);
  const total = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return buildPreEventSections(eventId, origin).reduce((n, s) => n + s.items.length, 0);
  }, [eventId]);

  useEffect(() => {
    const atualizar = () => {
      const state = readPreEventChecklist(storageKey);
      const marcados = Object.values(state).filter(Boolean).length;
      setDone(marcados);
    };
    atualizar();
    window.addEventListener("storage", atualizar);
    window.addEventListener("focus", atualizar);
    return () => {
      window.removeEventListener("storage", atualizar);
      window.removeEventListener("focus", atualizar);
    };
  }, [storageKey]);

  const dias = Math.ceil((startsAt.getTime() - Date.now()) / 86_400_000);
  const antesDoEvento = dias > 0;
  const completo = done !== null && done >= total;

  if (completo && !antesDoEvento) return null;

  return (
    <AdminCard className="print:hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 font-titulo text-lg">Antes do sábado</h2>
          <p className="mt-2 mb-0 max-w-[42ch] text-[0.9375rem] leading-relaxed text-ink-2">
            {antesDoEvento
              ? `Faltam ${dias} ${dias === 1 ? "dia" : "dias"}. Confira peças, QR, telão e gate.`
              : "Checklist do dia D: telão, MC, gate e moderação."}
          </p>
          {done !== null && (
            <p className="mb-0 mt-2 text-[0.8125rem] text-ink-3">
              {done}/{total} itens marcados neste navegador
            </p>
          )}
        </div>
        <Link href={`/admin/e/${eventId}/pre-event`} className={adminClasses.primaryButton}>
          Abrir checklist
        </Link>
      </div>
    </AdminCard>
  );
}
