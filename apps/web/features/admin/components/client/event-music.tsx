"use client";

import { useEffect, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

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

      <div className="mt-2 grid gap-2">
        <p className="m-0 text-xs uppercase tracking-rotulo text-ink-3">
          Sugestões dos convidados
        </p>
        {loading ? (
          <p className="m-0 text-[0.9rem] text-ink-3">Carregando…</p>
        ) : suggestions.length === 0 ? (
          <p className="m-0 text-[0.9rem] text-ink-2">
            Nenhuma ainda. Quando a interação abrir, os pedidos aparecem aqui, ordenados por voto.
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {suggestions.map((s) => (
              <li key={`${s.provedor}:${s.tipo}:${s.url}`} className="text-[0.9rem] text-ink">
                <a href={s.url} className="text-acento">
                  {suggestionLabel(s)}
                </a>
                {" · "}
                {s.votos === 1 ? "1 voto" : `${s.votos} votos`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
