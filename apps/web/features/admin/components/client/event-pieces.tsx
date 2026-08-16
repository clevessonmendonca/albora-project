"use client";

import { useState } from "react";
import { adminClasses } from "@/features/admin/components/server/admin-shell";

const FORMATS = [
  { id: "placa-a4", label: "Placa A4", size: "210×297 mm + sangria 3 mm" },
  { id: "card-de-mesa", label: "Card de mesa", size: "100×140 mm + sangria 3 mm" },
  { id: "card-de-missao", label: "Card de missão", size: "55×85 mm + sangria 3 mm" },
] as const;

export function EventPieces({ eventId, slug }: { eventId: string; slug: string }) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeSvg, setIncludeSvg] = useState(false);

  const saveBlob = async (path: string, filename: string) => {
    setError(null);
    try {
      const r = await fetch(path);
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as {
          message?: string;
          details?: { problemas?: string[] };
        } | null;
        const msg = body?.details?.problemas?.join(" ") ?? body?.message ?? "Não gerou o arquivo.";
        throw new Error(msg);
      }
      const blob = await r.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não baixou agora.");
    } finally {
      setDownloading(null);
    }
  };

  const download = async (format: (typeof FORMATS)[number]["id"], tipo: "pdf" | "svg") => {
    const key = `${format}-${tipo}`;
    setDownloading(key);
    await saveBlob(
      `/api/admin/events/${eventId}/pieces?formato=${format}&tipo=${tipo}`,
      `albora-${slug}-${format}.${tipo}`,
    );
  };

  const downloadZip = async () => {
    setDownloading("zip");
    const svg = includeSvg ? "&svg=1" : "";
    await saveBlob(
      `/api/admin/events/${eventId}/pieces?tipo=zip${svg}`,
      `albora-${slug}-pecas.zip`,
    );
  };

  return (
    <div>
      <p className="mb-4 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
        PDF pronto para a gráfica. SVG se o estúdio pedir para editar. A tela mostra RGB e a
        impressão sai CMYK — peça uma prova antes da tiragem inteira.
      </p>

      <div className="mb-6 rounded-token bg-bg px-4 py-4">
        <p className="mb-3 mt-0 text-[0.9375rem] leading-relaxed text-ink">
          Placa A4, card de mesa e card de missão num ZIP — o que a gráfica pede de uma vez.
        </p>
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-[0.8125rem] text-ink-2">
          <input
            type="checkbox"
            checked={includeSvg}
            onChange={(e) => setIncludeSvg(e.target.checked)}
            disabled={downloading !== null}
          />
          Incluir SVG, se o estúdio pedir para editar
        </label>
        <button
          type="button"
          disabled={downloading !== null}
          onClick={() => void downloadZip()}
          className={`${adminClasses.primaryButtonSm} ${
            downloading !== null ? "cursor-wait" : ""
          } ${downloading === "zip" ? "opacity-60" : ""}`}
        >
          {downloading === "zip" ? "Gerando…" : "Baixar tudo (ZIP)"}
        </button>
      </div>

      <p className="mb-3 mt-0 text-[0.8125rem] uppercase tracking-rotulo text-ink-3">Uma peça só</p>
      <div className="flex flex-col gap-4">
        {FORMATS.map((f) => (
          <div key={f.id}>
            <p className="mb-2 mt-0 text-[0.9375rem] text-ink">
              {f.label} <span className="text-ink-3">{f.size}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={downloading !== null}
                onClick={() => void download(f.id, "pdf")}
                className={`${adminClasses.primaryButtonSm} ${
                  downloading !== null ? "cursor-wait" : ""
                } ${downloading === `${f.id}-pdf` ? "opacity-60" : ""}`}
              >
                {downloading === `${f.id}-pdf` ? "Gerando…" : "Baixar PDF"}
              </button>
              <button
                type="button"
                disabled={downloading !== null}
                onClick={() => void download(f.id, "svg")}
                className={`cursor-pointer rounded-pilula border border-linha bg-superficie px-3 py-[0.45rem] font-titulo text-[0.8125rem] text-ink ${
                  downloading !== null ? "cursor-wait" : ""
                } ${downloading === `${f.id}-svg` ? "opacity-60" : ""}`}
              >
                {downloading === `${f.id}-svg` ? "Gerando…" : "Baixar SVG"}
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mb-0 mt-3 text-sm text-critico">{error}</p>}
    </div>
  );
}
