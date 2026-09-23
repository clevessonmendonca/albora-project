"use client";

import React, { useMemo } from "react";
import { ProgressBar, buttonClasses } from "@albora/ui-web";
import Link from "next/link";
import { AdminCard } from "@/features/admin/components/server/admin-shell";
import {
  buildPreEventSections,
  estadoDoChecklist,
  type SinaisDePreparo,
} from "@/features/admin/lib/pre-event-checklist";
import { useAdminResource } from "@/features/admin/hooks/use-admin-resource";

type Props = {
  eventId: string;
  sinais: SinaisDePreparo;
  startsAt: Date;
};

export function PreEventPromo({ eventId, sinais, startsAt }: Props) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const { dado, carregando } = useAdminResource<{ marcados: string[] }>(
    `/api/admin/events/${eventId}/checklist`,
  );

  const total = useMemo(
    () => buildPreEventSections(eventId, origin).reduce((n, s) => n + s.items.length, 0),
    [eventId, origin],
  );

  const done = useMemo(() => {
    if (carregando) return null;
    const estado = estadoDoChecklist(dado?.marcados ?? [], sinais, eventId, origin);
    return Object.values(estado).filter((i) => i.feito).length;
  }, [carregando, dado, sinais, eventId, origin]);

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
                label="Itens preparados"
                completedLabel="Tudo preparado"
              />
            </div>
          )}
        </div>
        <Link
          href={`/admin/e/${eventId}/pre-event`}
          className={buttonClasses({ variant: "primary" })}
        >
          Abrir checklist
        </Link>
      </div>
    </AdminCard>
  );
}
