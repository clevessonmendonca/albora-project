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

type SavingField = "panic" | "hasMinors" | "hardened" | "interaction" | "status" | null;

type Props = {
  eventId: string;
  slug: string;
  plan: "free" | "celebration" | "vendor";
  initial: WireModeration;
  initialInteractionOpensAt: string | null;
  initialStatus: "draft" | "active" | "ended";
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
  initialStatus,
  canManageCoupleOnly = true,
}: Props) {
  const [moderation, setModeration] = useState(() => fromWire(initial));
  const [interactionOpensAt, setInteractionOpensAt] = useState(initialInteractionOpensAt);
  const [status, setStatus] = useState(initialStatus);
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
    const previousStatus = status;

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
    if (body.status === "active") setStatus("active");

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
        status?: "draft" | "active" | "ended";
      };
      setModeration(fromWire(response.moderacao));
      if (response.interacaoAbreEm !== undefined) {
        setInteractionOpensAt(response.interacaoAbreEm);
      }
      if (response.status !== undefined) setStatus(response.status);
    } catch {
      setModeration(previousModeration);
      setInteractionOpensAt(previousGate);
      setStatus(previousStatus);
      setError(true);
    } finally {
      setSaving(null);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="flex flex-col gap-5">
      {status === "draft" && (
        <AdminSection>
          <div className="flex items-center justify-between gap-5">
            <div>
              <span className="block font-titulo text-[1.0625rem] text-ink">
                Evento em rascunho
              </span>
              <span className="mt-1 block text-sm text-ink-3">
                Convidado não acessa até você publicar.
              </span>
            </div>
            <button
              type="button"
              disabled={saving === "status"}
              onClick={() => void patch({ status: "active" }, "status")}
              className={`${adminClasses.primaryButton} shrink-0 ${
                saving === "status" ? "opacity-60" : ""
              }`}
            >
              {saving === "status" ? "Publicando…" : "Publicar evento"}
            </button>
          </div>
        </AdminSection>
      )}

      <AdminSection>
        <div className="flex items-center justify-between gap-5">
          <div>
            <span
              className={`block font-titulo text-[1.0625rem] ${
                moderation.panic ? "text-critico" : "text-ink"
              }`}
            >
              {moderation.panic ? "Telão pausado" : "Telão ativo"}
            </span>
            <span className="mt-1 block text-sm text-ink-3">
              {moderation.panic
                ? "Nenhuma foto nova aparece na parede."
                : "Fotos aparecem no telão em tempo real."}
            </span>
          </div>
          <button
            type="button"
            disabled={saving === "panic"}
            onClick={() => void patch({ panico: !moderation.panic }, "panic")}
            className={`shrink-0 cursor-pointer rounded-pilula border-none px-5 py-2.5 font-titulo text-[0.9375rem] text-sobre-acento transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80 disabled:cursor-default disabled:opacity-50 ${
              moderation.panic ? "bg-ink-2" : "bg-critico"
            }`}
          >
            {saving === "panic"
              ? moderation.panic
                ? "Pausando…"
                : "Retomando…"
              : moderation.panic
                ? "Retomar"
                : "Pausar telão"}
          </button>
        </div>
      </AdminSection>

      <AdminSection id="controle-menores">
        <h2 className="mb-4 mt-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
          Proteções
        </h2>

        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="block font-titulo text-[1.0625rem]">Há menores</span>
            <span className="mt-1 block text-sm text-ink-3">
              Uma denúncia segura do telão. Compartilhar nasce desligado.
            </span>
          </div>
          {canManageCoupleOnly ? (
            <Switch
              checked={moderation.hasMinors}
              label="Há menores nesta festa"
              disabled={saving === "hasMinors"}
              onChange={(v) => void patch({ haMenores: v }, "hasMinors")}
            />
          ) : (
            <span className="shrink-0 text-sm text-ink-3">
              {moderation.hasMinors ? "Sim" : "Não"}
            </span>
          )}
        </div>

        {moderation.hasMinors && (
          <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2">
            <Effect
              label="Para segurar"
              value={`${defaults.denunciasParaSegurar} ${
                defaults.denunciasParaSegurar === 1 ? "denúncia" : "denúncias"
              }`}
            />
            <Effect
              label="Compartilhar fora"
              value={defaults.compartilhamentoExterno ? "ligado" : "desligado"}
            />
            <Effect
              label="Gate"
              value={gateOpen ? "aberto" : defaults.gateComecaFechado ? "fechado" : "aberto"}
            />
          </div>
        )}

        <div className="my-4 h-px bg-linha" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="block font-titulo text-[1.0625rem]">Modo endurecido</span>
            <span className="mt-1 block text-sm text-ink-3">
              Novas fotos e comentários ficam na fila até você liberar.
            </span>
          </div>
          <Switch
            checked={moderation.hardened}
            label="Modo endurecido"
            disabled={saving === "hardened"}
            onChange={(v) => void patch({ modoEndurecido: v }, "hardened")}
          />
        </div>
      </AdminSection>

      <AdminSection id="controle-interacao">
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
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="interacao-agendar"
                className="text-[0.7rem] uppercase tracking-rotulo text-ink-3"
              >
                Ou agendar
              </label>
              <input
                id="interacao-agendar"
                type="datetime-local"
                disabled={saving === "interaction"}
                className="rounded-token border border-linha bg-bg px-3.5 py-3 font-corpo text-base text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento disabled:opacity-60"
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) return;
                  const iso = new Date(value).toISOString();
                  void patch({ interacaoAbreEm: iso }, "interaction");
                }}
              />
            </div>
            {interactionOpensAt && (
              <p className="m-0 text-[0.875rem] text-acento-texto">
                Agendada para{" "}
                {new Date(interactionOpensAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
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
        <div className="flex flex-col gap-3">
          <EventLink title="Convidado" url={eventEntryUrl(origin, slug, "link")} />
          <EventLink title="WhatsApp" url={whatsappInviteUrl(origin, slug)} />
          <EventLink title="Telão" url={`${origin}/wall-display`} />
        </div>
        <a
          href={eventEntryUrl(origin, slug, "link")}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex min-h-10 items-center justify-center rounded-pilula border border-linha bg-transparent px-4 text-center text-[0.875rem] text-ink-2 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink"
        >
          Testar como convidado ↗
        </a>
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
  const [copiado, setCopiado] = useState(false);

  const copiar = () => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <div>
      <span className="block text-xs uppercase tracking-rotulo text-ink-3">{title}</span>
      <div className="mt-1 flex items-center gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[0.875rem] text-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-80">
          {url}
        </a>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-pilula border border-linha bg-superficie-alta px-3 py-1 font-titulo text-[0.75rem] text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink-2"
        >
          {copiado ? (
            <>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path
                  d="M2 6l2.5 2.5L10 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Copiado!
            </>
          ) : (
            "Copiar"
          )}
        </button>
      </div>
    </div>
  );
}
