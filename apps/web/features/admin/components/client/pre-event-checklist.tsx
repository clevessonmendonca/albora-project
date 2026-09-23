"use client";

import { Badge, Button, ProgressBar } from "@albora/ui-web";
import Link from "next/link";
import React, { useCallback, useMemo, useState } from "react";
import { AdminCard } from "@/features/admin/components/server/admin-shell";
import {
  MC_SCRIPTS,
  buildPreEventSections,
  estadoDoChecklist,
  type SinaisDePreparo,
} from "@/features/admin/lib/pre-event-checklist";
import { useAdminResource } from "@/features/admin/hooks/use-admin-resource";
import { QrProofSheet } from "@/features/admin/components/client/qr-proof-sheet";

export function PreEventChecklist({
  eventId,
  sinais,
}: {
  eventId: string;
  sinais: SinaisDePreparo;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const sections = useMemo(() => buildPreEventSections(eventId, origin), [eventId, origin]);
  const [otimista, setOtimista] = useState<Record<string, boolean>>({});
  const [falhou, setFalhou] = useState(false);

  const { dado, recarregar } = useAdminResource<{ marcados: string[] }>(
    `/api/admin/events/${eventId}/checklist`,
  );

  const estado = useMemo(
    () => estadoDoChecklist(dado?.marcados ?? [], sinais, eventId, origin),
    [dado, sinais, eventId, origin],
  );

  const estaFeito = (id: string) => otimista[id] ?? estado[id]?.feito ?? false;

  const toggle = useCallback(
    async (id: string) => {
      const feito = !estaFeito(id);
      setOtimista((antes) => ({ ...antes, [id]: feito }));
      setFalhou(false);

      try {
        const r = await fetch(`/api/admin/events/${eventId}/checklist`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ item: id, feito }),
        });
        if (!r.ok) throw new Error("falhou");
        await recarregar();
        setOtimista((antes) => {
          const { [id]: _, ...resto } = antes;
          return resto;
        });
      } catch {
        setOtimista((antes) => {
          const { [id]: _, ...resto } = antes;
          return resto;
        });
        setFalhou(true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventId, recarregar, otimista, estado],
  );

  const total = sections.reduce((n, s) => n + s.items.length, 0);
  const done = sections.reduce(
    (n, s) => n + s.items.filter((item) => estaFeito(item.id)).length,
    0,
  );

  return (
    <>
      <style>{`
        @media print {
          header, nav, aside, footer,
          [data-admin-nav], [data-admin-shell-header],
          [data-admin-shell-back] { display: none !important; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .pre-event-print { box-shadow: none !important; border: 1px solid var(--linha) !important; }
        }
      `}</style>
      <div className="pre-event-print flex flex-col gap-5 print:block">
      <AdminCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="tipo-subtitle m-0 text-ink">Checklist pré-evento</h2>
            <p className="tipo-body mt-2 mb-0 max-w-[42ch] text-ink-2">
              Espelha o runbook operacional. Marque conforme for concluindo — fica salvo para
              todo mundo que organiza este evento, em qualquer aparelho.
            </p>
            {falhou && (
              <p role="alert" className="tipo-caption mt-2 mb-0 text-critico">
                Não deu para salvar agora. Toque de novo.
              </p>
            )}
            <div className="mt-3 max-w-[24rem]">
              <ProgressBar
                current={done}
                total={total}
                label="Progresso do preparo"
                completedLabel="Preparo completo"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={done >= total && total > 0 ? "accent" : "neutral"}>
              <span className="tabular-nums">
                {done}/{total}
              </span>
            </Badge>
            <Button
              variant="secondary"
              type="button"
              className="print:hidden"
              onClick={() => window.print()}
            >
              Imprimir
            </Button>
          </div>
        </div>
      </AdminCard>

      {sections.map((section) => (
        <AdminCard key={section.id} className="print:break-inside-avoid">
          <h3 className="tipo-subtitle m-0 mb-4 text-ink">{section.title}</h3>
          <ul className="m-0 grid list-none gap-3 p-0">
            {section.items.map((item) => {
              const isChecked = estaFeito(item.id);
              const derivado = estado[item.id]?.derivado ?? false;
              return (
                <li key={item.id} className="rounded-token border border-linha bg-bg">
                  <label
                    htmlFor={`pre-event-${item.id}`}
                    className={`flex min-h-11 items-start gap-3 px-3.5 py-3 ${
                      derivado ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    <input
                      id={`pre-event-${item.id}`}
                      type="checkbox"
                      checked={isChecked}
                      disabled={derivado}
                      onChange={() => void toggle(item.id)}
                      className="mt-1 size-4 shrink-0 accent-[var(--acento)] disabled:opacity-60"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`tipo-body block ${
                          isChecked ? "text-ink-3 line-through" : "text-ink"
                        }`}
                      >
                        {item.label}
                      </span>
                      {derivado && (
                        <span className="tipo-caption mt-1 block text-ink-3">
                          {isChecked
                            ? "O Álbora vê que isto já está feito."
                            : "O Álbora marca sozinho quando estiver feito."}
                        </span>
                      )}
                      {item.hint && !derivado && (
                        <span className="tipo-caption mt-1 block text-ink-3">{item.hint}</span>
                      )}
                      {item.href && (
                        <span className="mt-2 block print:hidden">
                          {item.external ? (
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tipo-caption text-acento no-underline hover:opacity-80"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Abrir ↗
                            </a>
                          ) : (
                            <Link
                              href={item.href}
                              className="tipo-caption text-acento no-underline hover:opacity-80"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Ir para etapa →
                            </Link>
                          )}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </AdminCard>
      ))}

      <div id="prova-qr-fisica">
        <QrProofSheet eventId={eventId} />
      </div>

      <div id="roteiro-mc">
        <AdminCard className="print:break-inside-avoid">
        <h3 className="tipo-subtitle m-0 mb-2 text-ink">Roteiro para o microfone</h3>
        <p className="tipo-caption mt-0 mb-4 text-ink-3">
          Copie ou envie por WhatsApp para o MC. Adapte se o plano for grátis (sem telão) ou se o
          gate ainda estiver fechado.
        </p>
        <div className="grid gap-4">
          {MC_SCRIPTS.map((script) => (
            <blockquote
              key={script.id}
              className="m-0 rounded-token border border-linha bg-bg px-4 py-3.5"
            >
              <cite className="tipo-label not-italic text-ink-3">{script.title}</cite>
              <p className="tipo-body mb-0 mt-2 leading-[1.65] text-ink-2">“{script.text}”</p>
            </blockquote>
          ))}
        </div>
        </AdminCard>
      </div>
    </div>
    </>
  );
}
