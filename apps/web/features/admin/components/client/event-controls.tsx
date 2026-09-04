"use client";

import { interacaoAberta, eventDefaults } from "@albora/core";
import { Badge, Switch } from "@albora/ui-web";
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
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <span className="tipo-subtitle block text-ink">Evento em rascunho</span>
              <span className="tipo-caption mt-1 block text-ink-3">
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
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="tipo-subtitle text-ink">Telão</span>
              <Badge tone={moderation.panic ? "critico" : "accent"}>
                {moderation.panic ? "Pausado" : "Ativo"}
              </Badge>
            </div>
            <span className="tipo-caption block text-ink-3">
              {moderation.panic
                ? "Nenhuma foto nova aparece na parede."
                : "Fotos aparecem no telão em tempo real."}
            </span>
          </div>
          <Switch
            checked={!moderation.panic}
            label={moderation.panic ? "Retomar telão" : "Pausar telão"}
            disabled={saving === "panic"}
            onChange={(v) => void patch({ panico: !v }, "panic")}
          />
        </div>
      </AdminSection>

      <AdminSection id="controle-menores">
        <h2 className="tipo-label m-0 mb-4 text-ink-3">Proteções</h2>

        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="tipo-subtitle block text-ink">Há menores</span>
            <span className="tipo-caption mt-1 block text-ink-3">
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
            <span className="tipo-caption shrink-0 text-ink-3">
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
            <span className="tipo-subtitle block text-ink">Modo endurecido</span>
            <span className="tipo-caption mt-1 block text-ink-3">
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
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="tipo-subtitle m-0 text-ink">Interação social</h2>
          <Badge tone={gateOpen ? "accent" : interactionOpensAt ? "outline" : "neutral"}>
            {gateOpen ? "Aberta" : interactionOpensAt ? "Agendada" : "Fechada"}
          </Badge>
        </div>
        <p className="tipo-body mb-4 mt-0 text-ink-2">
          Reações e comentários no feed só aparecem depois que vocês liberarem.
          Sem horário, os convidados veem as fotos mas não interagem.
        </p>
        {gateOpen ? (
          <p className="tipo-caption m-0 text-ink">
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
              <label htmlFor="interacao-agendar" className="tipo-label text-ink-3">
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
              <p className="tipo-caption m-0 text-acento-texto">
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
        <h2 className="tipo-subtitle m-0 mb-3 text-ink">Moderação e convidados</h2>
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
        <h2 className="tipo-subtitle m-0 mb-3 text-ink">Preciso de ajuda</h2>
        <p className="tipo-body mb-4 mt-0 text-ink-2">
          Fala com a equipe Albora. Em festa ao vivo, marque prioridade alta.
        </p>
        <SupportHelpButton eventId={eventId} />
      </AdminSection>

      {canManageCoupleOnly && plan === "free" && (
        <AdminSection>
          <h2 className="tipo-subtitle m-0 mb-3 text-ink">Assinar Completo</h2>
          <p className="tipo-body mb-4 mt-0 text-ink-2">
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
        <h2 className="tipo-subtitle m-0 mb-4 text-ink">Música do casal</h2>
        <EventMusic eventId={eventId} />
      </AdminSection>

      <AdminSection>
        <h2 className="tipo-subtitle m-0 mb-4 text-ink">Peças para imprimir</h2>
        <EventPieces eventId={eventId} slug={slug} />
      </AdminSection>

      <AdminSection>
        <h2 className="tipo-subtitle m-0 mb-4 text-ink">Links do evento</h2>
        <div className="flex flex-col gap-3">
          <EventLink title="Convidado" url={eventEntryUrl(origin, slug, "link")} />
          <EventLink title="WhatsApp" url={whatsappInviteUrl(origin, slug)} />
          <EventLink title="Telão" url={`${origin}/wall-display`} />
        </div>
        <a
          href={eventEntryUrl(origin, slug, "link")}
          target="_blank"
          rel="noopener noreferrer"
          className="tipo-caption mt-4 flex min-h-11 items-center justify-center rounded-pilula border border-linha bg-transparent px-4 text-center text-ink-2 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink"
        >
          Testar como convidado ↗
        </a>
      </AdminSection>

      {error && (
        <p role="alert" className="tipo-body m-0 text-critico">
          Não salvou agora. Tente de novo.
        </p>
      )}
    </div>
  );
}

function Effect({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-token bg-bg px-3 py-2.5">
      <span className="tipo-label block text-ink-3">{label}</span>
      <span className="tipo-caption mt-0.5 block text-ink">{value}</span>
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
      <span className="tipo-label block text-ink-3">{title}</span>
      <div className="mt-1 flex items-center gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer" className="tipo-caption min-w-0 flex-1 truncate text-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-80">
          {url}
        </a>
        <button
          type="button"
          onClick={copiar}
          className="tipo-label inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-pilula border border-linha bg-superficie-alta px-3 text-ink transition-[transform,border-color,color] duration-instantaneo ease-mola hover:border-acento-texto hover:text-ink-2 active:scale-[0.97]"
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
