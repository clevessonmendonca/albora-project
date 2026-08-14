"use client";

import { interacaoAberta, eventDefaults } from "@albora/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";

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
  initial: WireModeration;
  initialInteractionOpensAt: string | null;
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
  initial,
  initialInteractionOpensAt,
}: Props) {
  const [moderation, setModeration] = useState(() => fromWire(initial));
  const [interactionOpensAt, setInteractionOpensAt] = useState(initialInteractionOpensAt);
  const [saving, setSaving] = useState<SavingField>(null);
  const [error, setError] = useState(false);

  const defaults = eventDefaults({ haMenores: moderation.hasMinors });
  const gateOpen = interacaoAberta(
    { interacaoAbreEm: interactionOpensAt ? new Date(interactionOpensAt) : null },
    new Date(),
  );

  const patch = async (body: Record<string, boolean>, field: NonNullable<SavingField>) => {
    setSaving(field);
    setError(false);
    const previousModeration = moderation;
    const previousGate = interactionOpensAt;

    if ("panico" in body) setModeration((m) => ({ ...m, panic: body.panico! }));
    if ("haMenores" in body) setModeration((m) => ({ ...m, hasMinors: body.haMenores! }));
    if ("modoEndurecido" in body) {
      setModeration((m) => ({ ...m, hardened: body.modoEndurecido! }));
    }
    if (body.abrirInteracao) setInteractionOpensAt(new Date().toISOString());

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
          Controles durante a festa. O pânico pausa o telão em segundos; o interruptor
          de menores sobe o limiar de denúncia sem marcar ninguém.
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
          <Switch
            on={moderation.hasMinors}
            disabled={saving === "hasMinors"}
            label="Há menores nesta festa"
            onChange={(v) => void patch({ haMenores: v }, "hasMinors")}
          />
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
            on={moderation.hardened}
            disabled={saving === "hardened"}
            label="Modo endurecido"
            onChange={(v) => void patch({ modoEndurecido: v }, "hardened")}
          />
        </div>
      </AdminSection>

      <AdminSection>
        <h2 className="mb-3 mt-0 font-titulo text-lg">Interação social</h2>
        <p className="mb-4 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
          Reações e comentários no feed só aparecem depois que o casal liberar.
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
        )}
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
        <h2 className="mb-4 mt-0 font-titulo text-lg">Música do casal</h2>
        <EventMusic eventId={eventId} />
      </AdminSection>

      <AdminSection>
        <h2 className="mb-4 mt-0 font-titulo text-lg">Peças para imprimir</h2>
        <EventPieces eventId={eventId} slug={slug} />
      </AdminSection>

      <AdminSection>
        <h2 className="mb-4 mt-0 font-titulo text-lg">Links do evento</h2>
        <EventLink title="Convidado (QR)" url={`${origin}/e/${slug}`} />
        <EventLink title="Telão" url={`${origin}/wall-display`} />
      </AdminSection>

      {error && (
        <p className="m-0 text-[0.9rem] text-critico">Não salvou agora. Tente de novo.</p>
      )}
    </div>
  );
}

function EventMusic({ eventId }: { eventId: string }) {
  const [url, setUrl] = useState("");
  const [current, setCurrent] = useState<{ provedor: string; rotulo: string; url: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(`/api/admin/events/${eventId}/music`);
        if (!r.ok) throw new Error("falhou");
        const body = (await r.json()) as {
          musica: { provedor: string; rotulo: string; url: string } | null;
        };
        setCurrent(body.musica);
        if (body.musica) setUrl(body.musica.url);
      } catch {
        setError("Não carregou a música salva.");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const save = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/events/${eventId}/music`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const body = (await r.json()) as {
        musica?: { provedor: string; rotulo: string; url: string } | null;
        message?: string;
      };
      if (!r.ok) {
        setError(body.message ?? "Link não aceito.");
        return;
      }
      setCurrent(body.musica ?? null);
    } catch {
      setError("Não salvou agora. Tente de novo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[0.9375rem] leading-relaxed text-ink-2">
        Cole o link da faixa no Spotify ou YouTube Music. Convidados veem na confirmação da foto
        e na aba Música.
      </p>

      {loading ? (
        <p className="m-0 text-[0.9rem] text-ink-3">Carregando…</p>
      ) : (
        current && <p className="m-0 text-[0.9rem] text-ink">Agora: {current.rotulo}</p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-rotulo text-ink-3">Link da faixa</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://open.spotify.com/track/…"
          className="w-full rounded-token border border-linha bg-bg px-3.5 py-[0.65rem] font-corpo text-[0.95rem] text-ink"
        />
      </label>

      <button
        type="button"
        disabled={saving || !url.trim()}
        onClick={() => void save()}
        className={`${adminClasses.primaryButton} ${
          saving || !url.trim() ? "opacity-60" : ""
        }`}
      >
        {saving ? "Salvando…" : "Salvar música"}
      </button>

      {error && <p className="m-0 text-sm text-critico">{error}</p>}
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

function EventPieces({ eventId, slug }: { eventId: string; slug: string }) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formats = [
    { id: "placa-a4", label: "Placa A4" },
    { id: "card-de-mesa", label: "Card de mesa" },
    { id: "card-de-missao", label: "Card de missão" },
  ] as const;

  const download = async (format: (typeof formats)[number]["id"]) => {
    setDownloading(format);
    setError(null);
    try {
      const r = await fetch(`/api/admin/events/${eventId}/pieces?formato=${format}`);
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as { problemas?: string[] } | null;
        const msg = body?.problemas?.join(" ") ?? "Não gerou a peça.";
        throw new Error(msg);
      }
      const svg = await r.text();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `albora-${slug}-${format}.svg`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não baixou a peça.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <p className="mb-4 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
        SVG pronto para a gráfica converter em PDF. A tela mostra RGB e a impressão sai
        CMYK — peça uma prova antes da tiragem inteira.
      </p>
      <div className="flex flex-wrap gap-2">
        {formats.map((f) => (
          <button
            key={f.id}
            type="button"
            disabled={downloading !== null}
            onClick={() => void download(f.id)}
            className={`cursor-pointer rounded-pilula border border-linha bg-superficie px-4 py-2.5 font-titulo text-[0.9375rem] text-ink ${
              downloading !== null ? "cursor-wait" : ""
            } ${downloading === f.id ? "opacity-60" : ""}`}
          >
            {downloading === f.id ? "Gerando…" : f.label}
          </button>
        ))}
      </div>
      {error && <p className="mb-0 mt-3 text-sm text-critico">{error}</p>}
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

function Switch({
  on,
  disabled,
  label,
  onChange,
}: {
  on: boolean;
  disabled?: boolean;
  label: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`flex h-[1.875rem] w-[3.25rem] shrink-0 items-center rounded-pilula border-none p-[0.1875rem] ${
        on ? "justify-end bg-acento" : "justify-start bg-linha"
      } ${disabled ? "cursor-wait opacity-60" : "cursor-pointer"}`}
    >
      <span className="size-6 rounded-full bg-superficie-alta" />
    </button>
  );
}
