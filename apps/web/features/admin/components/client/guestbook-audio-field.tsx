"use client";

import { MAX_AUDIO_SECONDS } from "@albora/core";
import { Badge } from "@albora/ui-web";
import { adminClasses } from "@/features/admin/components/server/admin-shell";
import type { useGuestbookRecorder } from "@/features/admin/hooks/use-guestbook-recorder";
import type { SavedGuestbookAudio } from "@/features/admin/lib/guestbook-audio";

/** Alvo de toque ≥44px nas ações de gravação — mesmo override local de review-queue.tsx/host-album.tsx. */
const ALVO_TOQUE = "min-h-11 px-5";

export function formatarDuracaoAudio(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  return `0:${String(s).padStart(2, "0")}`;
}

export function GuestbookAudioField({
  saved,
  aceite,
  onAceite,
  onRemoveSaved,
  recorder,
}: {
  saved: SavedGuestbookAudio | null;
  aceite: boolean;
  onAceite: (v: boolean) => void;
  onRemoveSaved: () => void;
  recorder: ReturnType<typeof useGuestbookRecorder>;
}) {
  const preview = recorder.pending?.previewUrl ?? saved?.url ?? null;
  const duracao = recorder.pending?.duracaoSegundos ?? saved?.duracaoSegundos ?? null;
  const temAudio = recorder.pending !== null || saved !== null;

  return (
    <fieldset className="m-0 mt-6 border-0 p-0">
      <legend className="tipo-label p-0 text-ink-3">Áudio (opcional)</legend>
      {(recorder.recording || temAudio) && (
        <div className="mb-1.5 mt-1.5 flex flex-wrap items-center gap-2">
          {recorder.recording ? (
            <Badge tone="critico">
              <span
                aria-hidden
                className="size-1.5 shrink-0 animate-pulse rounded-full bg-current motion-reduce:animate-none"
              />
              Gravando · {formatarDuracaoAudio(recorder.elapsed)}
            </Badge>
          ) : (
            <Badge tone="outline">Áudio anexado{duracao !== null ? ` · ${formatarDuracaoAudio(duracao)}` : ""}</Badge>
          )}
        </div>
      )}
      <p className="m-0 mb-3 mt-1.5 max-w-[34rem] tipo-caption text-ink-3">
        Até {MAX_AUDIO_SECONDS} s. No salão a música é alta — o texto continua sendo o corpo. O áudio
        emociona quem tem fone, ou quem abre no dia seguinte.
      </p>

      <label className="mb-4 flex min-h-11 items-center gap-2.5 rounded-token border border-linha bg-superficie px-3 py-2 font-corpo text-sm text-ink-2 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto">
        <input
          type="checkbox"
          checked={aceite}
          onChange={(e) => onAceite(e.target.checked)}
          className="size-4 shrink-0 accent-acento"
        />
        <span>Esta gravação é da nossa voz, sem música de terceiro.</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        {recorder.recording ? (
          <button type="button" onClick={recorder.parar} className={`${adminClasses.secondaryButton} ${ALVO_TOQUE}`}>
            Parar · {formatarDuracaoAudio(recorder.elapsed)}
          </button>
        ) : (
          <button
            type="button"
            disabled={!aceite}
            onClick={() => void recorder.gravar()}
            className={`${adminClasses.secondaryButton} ${ALVO_TOQUE} ${!aceite ? "opacity-60" : ""}`}
          >
            Gravar
          </button>
        )}

        <label className={`relative ${adminClasses.secondaryButton} ${ALVO_TOQUE} ${!aceite ? "opacity-60" : ""}`}>
          Anexar arquivo
          <input
            type="file"
            accept="audio/webm,audio/mp4,audio/mpeg,audio/ogg,audio/aac,.webm,.m4a,.mp3,.ogg"
            disabled={!aceite}
            className="absolute size-px opacity-0"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void recorder.anexar(file);
            }}
          />
        </label>

        {temAudio && (
          <button
            type="button"
            onClick={() => {
              recorder.descartar();
              if (!recorder.pending && saved) onRemoveSaved();
            }}
            className="inline-flex min-h-11 cursor-pointer items-center border-0 bg-transparent px-2 font-corpo text-sm text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-critico"
          >
            Remover áudio
          </button>
        )}
      </div>

      {preview && duracao !== null && (
        <div className="mt-4 rounded-token border border-linha bg-superficie-alta p-3">
          <audio className="w-full" controls src={preview} preload="metadata">
            Seu navegador não toca este áudio.
          </audio>
        </div>
      )}

      {recorder.erro && (
        <p role="alert" className="mb-0 mt-3 font-corpo text-sm text-critico">
          {recorder.erro}
        </p>
      )}
    </fieldset>
  );
}
