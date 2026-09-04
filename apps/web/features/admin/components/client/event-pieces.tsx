"use client";

import { useState } from "react";
import { adminClasses } from "@/features/admin/components/server/admin-shell";

/**
 * ≥44px de alvo de toque — override local do Sm compartilhado (`adminClasses.primaryButtonSm`),
 * mesmo padrão de host-album.tsx/review-queue.tsx.
 */
const ALVO_TOQUE = "min-h-11 px-5";

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
      <p className="tipo-body mb-5 mt-0 text-ink-2">
        PDF pronto para a gráfica, com sangria de 3 mm e marcas de corte. SVG se o estúdio pedir
        para editar. A tela mostra RGB e a impressão sai CMYK — sempre peça uma prova colorida
        antes da tiragem final.
      </p>

      <div className="mb-6 rounded-token border border-linha bg-superficie-alta px-5 py-5">
        <p className="tipo-body mb-3 mt-0 font-medium text-ink">
          Pacote completo
        </p>
        <p className="tipo-caption mb-4 mt-0 text-ink-2">
          Placa A4, card de mesa e card de missão num arquivo ZIP — tudo que a gráfica
          precisa de uma vez só.
        </p>
        <label className="tipo-caption mb-4 flex min-h-11 cursor-pointer items-center gap-2 text-ink-2 transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-80">
          <input
            type="checkbox"
            checked={includeSvg}
            onChange={(e) => setIncludeSvg(e.target.checked)}
            disabled={downloading !== null}
            className="size-4 cursor-pointer"
          />
          Incluir arquivos SVG editáveis
        </label>
        <button
          type="button"
          disabled={downloading !== null}
          onClick={() => void downloadZip()}
          className={`${adminClasses.primaryButton} ${
            downloading !== null ? "cursor-wait opacity-50" : ""
          } ${downloading === "zip" ? "opacity-60" : ""}`}
        >
          {downloading === "zip" ? "Preparando arquivo…" : "Baixar pacote completo (ZIP)"}
        </button>
      </div>

      <p className="tipo-label mb-3 mt-0 text-ink-3">
        Arquivos individuais
      </p>
      <div className="flex flex-col gap-4">
        {FORMATS.map((f) => (
          <div key={f.id} className="rounded-token border border-linha bg-bg px-4 py-3.5">
            <p className="tipo-body mb-3 mt-0 font-medium text-ink">
              {f.label}
            </p>
            <p className="tipo-caption mb-3 mt-0 text-ink-3">{f.size}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={downloading !== null}
                onClick={() => void download(f.id, "pdf")}
                className={`${adminClasses.primaryButtonSm} ${ALVO_TOQUE} ${
                  downloading !== null ? "cursor-wait opacity-50" : ""
                } ${downloading === `${f.id}-pdf` ? "opacity-60" : ""}`}
              >
                {downloading === `${f.id}-pdf` ? "Gerando…" : "Baixar PDF"}
              </button>
              <button
                type="button"
                disabled={downloading !== null}
                onClick={() => void download(f.id, "svg")}
                className={`${ALVO_TOQUE} inline-flex cursor-pointer items-center justify-center rounded-pilula border border-linha bg-superficie font-titulo text-[0.8125rem] text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta ${
                  downloading !== null ? "cursor-wait opacity-50" : ""
                } ${downloading === `${f.id}-svg` ? "opacity-60" : ""}`}
              >
                {downloading === `${f.id}-svg` ? "Gerando…" : "Baixar SVG"}
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && (
        <div role="alert" className="mt-4 rounded-token border border-critico bg-superficie px-4 py-3">
          <p className="tipo-caption m-0 text-critico">{error}</p>
        </div>
      )}
    </div>
  );
}
