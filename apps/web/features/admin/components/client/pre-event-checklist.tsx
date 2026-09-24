"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminCard, adminClasses } from "@/features/admin/components/server/admin-shell";
import {
  MC_SCRIPTS,
  buildPreEventSections,
  estadoDoChecklist,
  type SinaisDePreparo,
} from "@/features/admin/lib/pre-event-checklist";
import { QrProofSheet } from "@/features/admin/components/client/qr-proof-sheet";

export function PreEventChecklist({
  eventId,
  marcados,
  sinais,
}: {
  eventId: string;
  /** Vem do evento (`setup_marks.checklist`), não do navegador. */
  marcados: Readonly<Record<string, boolean>>;
  sinais: SinaisDePreparo;
}) {
  // Origem só depois de montar: lida no render, o servidor produz "" e o cliente
  // a origem real — o HTML não bate e o React avisa que "não vai consertar".
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const sections = useMemo(() => buildPreEventSections(eventId, origin), [eventId, origin]);
  const [otimista, setOtimista] = useState<Record<string, boolean>>({});
  const [falhou, setFalhou] = useState(false);

  const estado = useMemo(
    () => estadoDoChecklist(marcados, sinais, eventId, origin),
    [marcados, sinais, eventId, origin],
  );

  const estaFeito = (id: string) => otimista[id] ?? estado[id]?.feito ?? false;

  const toggle = async (id: string) => {
    const feito = !estaFeito(id);
    setOtimista((antes) => ({ ...antes, [id]: feito }));
    setFalhou(false);

    try {
      const r = await fetch(`/api/admin/events/${eventId}/setup-marks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ checklist: { item: id, feito } }),
      });
      if (!r.ok) throw new Error("falhou");
    } catch {
      setOtimista((antes) => {
        const { [id]: _, ...resto } = antes;
        return resto;
      });
      setFalhou(true);
    }
  };

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
      {falhou && (
        <p
          role="alert"
          className="m-0 rounded-token border border-critico px-3.5 py-3 text-[0.875rem] text-critico print:hidden"
        >
          Não deu para salvar agora. Toque de novo no item.
        </p>
      )}
      <AdminCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="m-0 font-titulo text-lg">Checklist pré-evento</h2>
            <p className="mt-2 mb-0 max-w-[42ch] text-[0.9375rem] leading-relaxed text-ink-2">
              Espelha o runbook operacional. Marque conforme for concluindo — salva neste
              navegador.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-pilula bg-superficie-alta px-3 py-1.5 font-titulo text-sm text-ink-2">
              {done}/{total}
            </span>
            <button
              type="button"
              className={`${adminClasses.secondaryButton} print:hidden`}
              onClick={() => window.print()}
            >
              Imprimir
            </button>
          </div>
        </div>
      </AdminCard>

      {sections.map((section) => (
        <AdminCard key={section.id} className="print:break-inside-avoid">
          <h3 className="m-0 mb-4 font-titulo text-base">{section.title}</h3>
          <ul className="m-0 grid list-none gap-3 p-0">
            {section.items.map((item) => {
              const isChecked = estaFeito(item.id);
              const derivado = estado[item.id]?.derivado ?? false;
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-token border border-linha bg-bg px-3.5 py-3"
                >
                  <input
                    id={`pre-event-${item.id}`}
                    type="checkbox"
                    checked={isChecked}
                    disabled={derivado}
                    onChange={() => void toggle(item.id)}
                    className="mt-1 size-4 shrink-0 accent-[var(--acento)] disabled:opacity-60"
                  />
                  <label
                    htmlFor={`pre-event-${item.id}`}
                    className={`min-w-0 flex-1 ${derivado ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <span
                      className={`block text-[0.9375rem] leading-snug ${
                        isChecked ? "text-ink-3 line-through" : "text-ink"
                      }`}
                    >
                      {item.label}
                    </span>
                    {derivado && (
                      <span className="mt-1 block text-[0.8125rem] leading-snug text-ink-3">
                        {isChecked
                          ? "O Álbora vê que isto já está feito."
                          : "O Álbora marca sozinho quando estiver feito."}
                      </span>
                    )}
                    {item.hint && !derivado && (
                      <span className="mt-1 block text-[0.8125rem] leading-snug text-ink-3">
                        {item.hint}
                      </span>
                    )}
                    {item.href && (
                      <span className="mt-2 block print:hidden">
                        {item.external ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[0.8125rem] text-acento no-underline hover:opacity-80"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Abrir ↗
                          </a>
                        ) : (
                          <Link
                            href={item.href}
                            className="text-[0.8125rem] text-acento no-underline hover:opacity-80"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ir para etapa →
                          </Link>
                        )}
                      </span>
                    )}
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
        <h3 className="m-0 mb-2 font-titulo text-base">Roteiro para o microfone</h3>
        <p className="mt-0 mb-4 text-[0.875rem] text-ink-3">
          Copie ou envie por WhatsApp para o MC. Adapte se o plano for grátis (sem telão) ou se o
          gate ainda estiver fechado.
        </p>
        <div className="grid gap-4">
          {MC_SCRIPTS.map((script) => (
            <blockquote
              key={script.id}
              className="m-0 rounded-token border border-linha bg-bg px-4 py-3.5"
            >
              <cite className="not-italic text-[0.75rem] uppercase tracking-rotulo text-ink-3">
                {script.title}
              </cite>
              <p className="mb-0 mt-2 text-[0.9375rem] leading-[1.65] text-ink-2">
                “{script.text}”
              </p>
            </blockquote>
          ))}
        </div>
        </AdminCard>
      </div>
    </div>
    </>
  );
}
