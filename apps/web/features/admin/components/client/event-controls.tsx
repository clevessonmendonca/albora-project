"use client";

import { interacaoAberta, eventDefaults } from "@albora/core";
import { Switch } from "@albora/ui-web";
import Link from "next/link";
import { useState } from "react";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";
import { EventMusic } from "@/features/admin/components/client/event-music";
import { EventPieces } from "@/features/admin/components/client/event-pieces";
import { SupportHelpButton } from "@/features/admin/components/client/support-help-button";
import { eventEntryUrl, whatsappInviteUrl } from "@/lib/qr";

type WireModeration = {
  panico: boolean;
  modoEndurecido: boolean;
  haMenores: boolean;
};

type Moderation = {
  panic: boolean;
  hardened: boolean;
  hasMinors: boolean;
};

type SavingField = "panic" | "hasMinors" | "hardened" | "interaction" | null;

type Props = {
  eventId: string;
  slug: string;
  plan: "free" | "celebration" | "vendor";
  initial: WireModeration;
  initialInteractionOpensAt: string | null;
  canManageCoupleOnly?: boolean;
};

function fromWire(m: WireModeration): Moderation {
  return {
    panic: m.panico,
    hardened: m.modoEndurecido,
    hasMinors: m.haMenores,
  };
}

export function EventControls({
  eventId,
  slug,
  plan,
  initial,
  initialInteractionOpensAt,
  canManageCoupleOnly = true,
}: Props) {
  const [moderation, setModeration] = useState(() => fromWire(initial));
  const [interactionOpensAt, setInteractionOpensAt] = useState(initialInteractionOpensAt);
  const [saving, setSaving] = useState<SavingField>(null);
  const [error, setError] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const defaults = eventDefaults({ haMenores: moderation.hasMinors });
  const gateOpen = interacaoAberta(
    { interacaoAbreEm: interactionOpensAt ? new Date(interactionOpensAt) : null },
    new Date(),
  );

  const patch = async (
    body: Record<string, boolean | string | null>,
    field: NonNullable<SavingField>,
  ) => {
    setSaving(field);
    setError(false);
    const previousModeration = moderation;
    const previousGate = interactionOpensAt;

    if ("panico" in body && typeof body.panico === "boolean") {
      setModeration((m) => ({ ...m, panic: body.panico as boolean }));
    }
    if ("haMenores" in body && typeof body.haMenores === "boolean") {
      setModeration((m) => ({ ...m, hasMinors: body.haMenores as boolean }));
    }
    if ("modoEndurecido" in body && typeof body.modoEndurecido === "boolean") {
      setModeration((m) => ({ ...m, hardened: body.modoEndurecido as boolean }));
    }
    if (body.abrirInteracao === true) setInteractionOpensAt(new Date().toISOString());
    if ("interacaoAbreEm" in body) {
      setInteractionOpensAt(
        typeof body.interacaoAbreEm === "string" ? body.interacaoAbreEm : null,
      );
    }

    try {
      const r = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("falhou");
      const response = (await r.json()) as {
        moderacao: WireModeration;
        interacaoAbreEm?: string | null;
      };
      setModeration(fromWire(response.moderacao));
      if (response.interacaoAbreEm !== undefined) {
        setInteractionOpensAt(response.interacaoAbreEm);
      }
    } catch {
      setModeration(previousModeration);
      setInteractionOpensAt(previousGate);
      setError(true);
    } finally {
      setSaving(null);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <p className="mb-4 mt-0 leading-relaxed text-ink-2">
          Controles durante a festa. O pânico pausa o telão em segundos; marcar que há menores
          torna a moderação mais rigorosa sem expor ninguém.
        </p>

        <button
          type="button"
          disabled={saving === "panic"}
          onClick={() => void patch({ panico: !moderation.panic }, "panic")}
          className={`${adminClasses.dangerButton} ${
            moderation.panic ? "bg-ink-2" : "bg-critico"
          } ${saving === "panic" ? "opacity-60" : ""}`}
        >
          {saving === "panic"
            ? "Salvando…"
            : moderation.panic
              ? "Retomar telão"
              : "Pausar telão"}
        </button>

        {moderation.panic && (
          <p className="mb-0 mt-3 text-[0.9rem] text-critico">
            O telão está pausado. Nenhuma foto nova aparece na parede.
          </p>
        )}
      </AdminSection>

      <AdminSection>
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="block font-titulo text-[1.0625rem]">Há menores nesta festa</span>
            <span className="mt-1 block text-sm text-ink-3">
              Uma denúncia já segura do telão. Compartilhar para fora nasce desligado.
            </span>
          </div>
          {canManageCoupleOnly ? (
            <Switch
              checked={moderation.hasMinors}
              label="Há menores nesta festa"
              onChange={(v) => {
                if (saving === "hasMinors") return;
                void patch({ haMenores: v }, "hasMinors");
              }}
            />
          ) : (
            <span className="shrink-0 text-sm text-ink-3">
              {moderation.hasMinors ? "Sim" : "Não"}
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2">
          <Effect label="Para segurar" value={`${defaults.denunciasParaSegurar} denúncia(s)`} />
          <Effect
            label="Compartilhar fora"
            value={defaults.compartilhamentoExterno ? "ligado" : "desligado"}
          />
          <Effect
            label="Gate"
            value={gateOpen ? "aberto" : defaults.gateComecaFechado ? "fechado" : "aberto"}
          />
        </div>
      </AdminSection>

      <AdminSection>
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="block font-titulo text-[1.0625rem]">Modo endurecido</span>
            <span className="mt-1 block text-sm text-ink-3">
              Novas fotos e comentários ficam na fila até você liberar.
            </span>
          </div>
          <Switch
            checked={moderation.hardened}
            label="Modo endurecido"
            onChange={(v) => {
              if (saving === "hardened") return;
              void patch({ modoEndurecido: v }, "hardened");
            }}
          />
        </div>
      </AdminSection>

      <AdminSection>
        <h2 className="mb-3 mt-0 font-titulo text-lg">Interação social</h2>
        <p className="mb-4 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
          Reações e comentários no feed só aparecem depois que vocês liberarem.
          Sem horário, os convidados veem as fotos mas não interagem.
        </p>
        {gateOpen ? (
          <p className="m-0 text-[0.9rem] text-ink">
            Aberta desde{" "}
            {interactionOpensAt
              ? new Date(interactionOpensAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={saving === "interaction"}
              onClick={() => void patch({ abrirInteracao: true }, "interaction")}
              className={`${adminClasses.primaryButton} ${
                saving === "interaction" ? "opacity-60" : ""
              }`}
            >
              {saving === "interaction" ? "Abrindo…" : "Abrir interação agora"}
            </button>
            <label className="flex flex-col gap-1.5 text-sm text-ink-2">
              Ou agendar
              <input
                type="datetime-local"
                disabled={saving === "interaction"}
                className="rounded-token border border-linha bg-bg px-3 py-[0.65rem] font-corpo text-base text-ink"
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) return;
                  const iso = new Date(value).toISOString();
                  void patch({ interacaoAbreEm: iso }, "interaction");
                }}
              />
            </label>
          </div>
        )}
        {gateOpen || interactionOpensAt ? (
          <button
            type="button"
            disabled={saving === "interaction"}
            onClick={() => void patch({ interacaoAbreEm: null }, "interaction")}
            className={`${adminClasses.secondaryButton} mt-3 ${
              saving === "interaction" ? "opacity-60" : ""
            }`}
          >
            Fechar interação
          </button>
        ) : null}
      </AdminSection>

      <AdminSection>
        <h2 className="mb-3 mt-0 font-titulo text-lg">Moderação e convidados</h2>
        <p className="mb-4 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
          A fila de revisão e o funil de participação têm páginas próprias — números agregados,
          sem lista nominal.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/admin/e/${eventId}/moderation`} className={adminClasses.primaryButton}>
            Abrir moderação
          </Link>
          <Link href={`/admin/e/${eventId}/guests`} className={adminClasses.secondaryButton}>
            Ver convidados
          </Link>
        </div>
      </AdminSection>

      <AdminSection>
        <h2 className="mb-3 mt-0 font-titulo text-lg">Preciso de ajuda</h2>
        <p className="mb-4 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
          Fala com a equipe Albora. Em festa ao vivo, marque prioridade alta.
        </p>
        <SupportHelpButton eventId={eventId} />
      </AdminSection>

      {canManageCoupleOnly && plan === "free" && (
        <AdminSection>
          <h2 className="mb-3 mt-0 font-titulo text-lg">Assinar Completo</h2>
          <p className="mb-4 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
            Telão, ZIP e vídeos ilimitados. O convidado não vê cobrança — o plano sobe no
            próximo poll.
          </p>
          <button
            type="button"
            disabled={upgrading}
            className={`${adminClasses.primaryButton} ${upgrading ? "opacity-60" : ""}`}
            onClick={() => {
              void (async () => {
                setUpgrading(true);
                try {
                  const r = await fetch("/api/billing/checkout", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ eventId, plan: "celebration" }),
                  });
                  if (!r.ok) throw new Error("falhou");
                  const data = (await r.json()) as {
                    invoiceUrl?: string | null;
                    asaasPaymentId?: string;
                  };
                  if (data.invoiceUrl?.startsWith("http")) {
                    window.location.href = data.invoiceUrl;
                    return;
                  }
                  if (data.asaasPaymentId?.startsWith("pay_stub_")) {
                    await fetch("/api/billing/simulate", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ asaasPaymentId: data.asaasPaymentId }),
                    });
                    window.location.reload();
                    return;
                  }
                } catch {
                  setError(true);
                } finally {
                  setUpgrading(false);
                }
              })();
            }}
          >
            {upgrading ? "Abrindo…" : "Pagar R$ 199"}
          </button>
        </AdminSection>
      )}

      <AdminSection>
        <h2 className="mb-4 mt-0 font-titulo text-lg">Música do casal</h2>
        <EventMusic eventId={eventId} />
      </AdminSection>

      <AdminSection>
        <h2 className="mb-4 mt-0 font-titulo text-lg">Peças para imprimir</h2>
        <EventPieces eventId={eventId} slug={slug} />
      </AdminSection>

      <AdminSection>
        <h2 className="mb-4 mt-0 font-titulo text-lg">Links do evento</h2>
        <EventLink title="Link do convidado" url={eventEntryUrl(origin, slug, "link")} />
        <EventLink title="WhatsApp" url={whatsappInviteUrl(origin, slug)} />
        <EventLink title="Telão" url={`${origin}/wall-display`} />
      </AdminSection>

      {error && (
        <p className="m-0 text-[0.9rem] text-critico">Não salvou agora. Tente de novo.</p>
      )}
    </div>
  );
}

function Effect({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-token bg-bg px-3 py-2.5 text-[0.8125rem]">
      <span className="block text-ink-3">{label}</span>
      <span className="mt-0.5 block text-ink">{value}</span>
    </div>
  );
}

function EventLink({ title, url }: { title: string; url: string }) {
  return (
    <div className="mb-3.5">
      <span className="block text-xs uppercase tracking-rotulo text-ink-3">{title}</span>
      <a href={url} className="break-all text-[0.95rem] text-acento">
        {url}
      </a>
    </div>
  );
}
