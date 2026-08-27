"use client";

import { useCallback, useEffect, useState } from "react";
import { adminClasses } from "@/features/admin/components/server/admin-shell";
import { suggestionLabel } from "@/features/music/lib/suggestion-copy";

type HostTrack = { provedor: string; rotulo: string; url: string; capaUrl?: string | null };
type HostSuggestion = {
  provedor: string;
  tipo: string;
  url: string;
  votos: number;
  titulo?: string | null;
  artista?: string | null;
};

export function EventMusic({ eventId }: { eventId: string }) {
  const [url, setUrl] = useState("");
  const [current, setCurrent] = useState<HostTrack | null>(null);
  const [suggestions, setSuggestions] = useState<HostSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [colando, setColando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colarLink = useCallback(async () => {
    try {
      const texto = await navigator.clipboard.readText();
      if (texto.trim()) setUrl(texto.trim());
    } catch {
      // permission denied or not supported
    } finally {
      setColando(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(`/api/admin/events/${eventId}/music`);
        if (!r.ok) throw new Error("falhou");
        const body = (await r.json()) as {
          musica: HostTrack | null;
          sugestoes?: HostSuggestion[];
        };
        setCurrent(body.musica);
        setSuggestions(body.sugestoes ?? []);
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
        musica?: HostTrack | null;
        message?: string;
      };
      if (!r.ok) {
        setError(body.message ?? "Link não aceito.");
        return;
      }
      setCurrent(body.musica ?? null);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
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
        <div className="animate-pulse rounded-token bg-superficie-alta px-3.5 py-3">
          <div className="h-3 w-2/3 rounded-full bg-bg" />
        </div>
      ) : (
        current && <p className="m-0 text-[0.9rem] text-ink">Agora: {current.rotulo}</p>
      )}

      <label className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-rotulo text-ink-3">Link da faixa</span>
          <button
            type="button"
            disabled={colando}
            onClick={() => {
              setColando(true);
              void colarLink();
            }}
            className="cursor-pointer border-none bg-transparent p-0 text-xs text-acento-texto transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70 disabled:cursor-default disabled:opacity-50"
          >
            {colando ? "Colando…" : "Colar da área de transferência"}
          </button>
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://open.spotify.com/track/…"
          className="w-full rounded-token border border-linha bg-bg px-3.5 py-[0.65rem] font-corpo text-[0.95rem] text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
        />
      </label>

      <div className="flex items-center gap-2">
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
        {salvo && (
          <span className="flex items-center gap-1.5 rounded-pilula border border-acento-texto px-3 py-1.5 font-titulo text-[0.8125rem] text-acento-texto">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M2 6l2.5 2.5L10 3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Salvo
          </span>
        )}
      </div>

      {error && <p className="m-0 text-sm text-critico">{error}</p>}

      <div className="mt-2 grid gap-2">
        <p className="m-0 text-xs uppercase tracking-rotulo text-ink-3">
          Sugestões dos convidados
        </p>
        {loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse flex items-center justify-between rounded-token bg-bg px-3 py-2.5"
              >
                <div className="h-3 w-1/2 rounded-full bg-superficie-alta" />
                <div className="h-6 w-12 rounded-pilula bg-superficie-alta" />
              </div>
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <p className="m-0 text-[0.9rem] text-ink-2">
            Nenhum pedido ainda. Quando o feed abrir para os convidados, as sugestões aparecem aqui.
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {suggestions.map((s) => (
              <li key={`${s.provedor}:${s.tipo}:${s.url}`} className="flex items-center justify-between gap-3 rounded-token bg-bg px-3 py-2.5 text-[0.9rem] text-ink">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-75">
                  {suggestionLabel(s)}
                </a>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-ink-3">
                    {s.votos === 1 ? "1 voto" : `${s.votos} votos`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUrl(s.url)}
                    className="cursor-pointer rounded-pilula border border-linha bg-superficie px-2.5 py-1 text-xs text-ink-2 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta"
                  >
                    Usar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
