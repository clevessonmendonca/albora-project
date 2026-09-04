"use client";

import { ProgressBar } from "@albora/ui-web";
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
          <h2 className="tipo-subtitle m-0 text-ink">Antes do sábado</h2>
          <p className="tipo-body mt-2 mb-0 max-w-[42ch] text-ink-2">
            {antesDoEvento
              ? `Faltam ${dias} ${dias === 1 ? "dia" : "dias"}. Confira peças, QR, telão e gate.`
              : "Checklist do dia D: telão, MC, gate e moderação."}
          </p>
          {done !== null && total > 0 && (
            <div className="mt-3 max-w-[24rem]">
              <ProgressBar
                current={done}
                total={total}
                label="Itens preparados neste navegador"
                completedLabel="Tudo preparado neste navegador"
              />
            </div>
          )}
        </div>
        <Link href={`/admin/e/${eventId}/pre-event`} className={adminClasses.primaryButton}>
          Abrir checklist
        </Link>
      </div>
    </AdminCard>
  );
}
