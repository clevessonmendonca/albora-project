"use client";

import { MAX_AUDIO_SECONDS } from "@albora/core";
import { adminClasses } from "@/features/admin/components/server/admin-shell";
import type { useGuestbookRecorder } from "@/features/admin/hooks/use-guestbook-recorder";
import type { SavedGuestbookAudio } from "@/features/admin/lib/guestbook-audio";

function formatar(segundos: number): string {
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

  return (
    <fieldset className="mt-5 m-0 border-0 p-0">
      <legend className="mb-1.5 font-titulo text-sm">Áudio (opcional)</legend>
      <p className="m-0 mb-3 font-corpo text-[0.75rem] text-ink-3">
        Até {MAX_AUDIO_SECONDS} s. No salão a música é alta — o texto continua sendo o corpo. O áudio
        emociona quem tem fone, ou quem abre no dia seguinte.
      </p>

      <label className="mb-4 flex items-start gap-2 font-corpo text-sm text-ink-2">
        <input
          type="checkbox"
          checked={aceite}
          onChange={(e) => onAceite(e.target.checked)}
          className="mt-1"
        />
        <span>Esta gravação é da nossa voz, sem música de terceiro.</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        {recorder.recording ? (
          <button type="button" onClick={recorder.parar} className={adminClasses.secondaryButton}>
            Parar · {formatar(recorder.elapsed)}
          </button>
        ) : (
          <button
            type="button"
            disabled={!aceite}
            onClick={() => void recorder.gravar()}
            className={`${adminClasses.secondaryButton} ${!aceite ? "opacity-60" : ""}`}
          >
            Gravar
          </button>
        )}

        <label className={`relative ${adminClasses.secondaryButton} ${!aceite ? "opacity-60" : ""}`}>
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

        {(recorder.pending || saved) && (
          <button
            type="button"
            onClick={() => {
              recorder.descartar();
              if (!recorder.pending && saved) onRemoveSaved();
            }}
            className="cursor-pointer border-0 bg-transparent p-0 font-corpo text-sm text-ink-3"
          >
            Remover áudio
          </button>
        )}
      </div>

      {preview && duracao !== null && (
        <audio className="mt-4 w-full" controls src={preview} preload="metadata">
          Seu navegador não toca este áudio.
        </audio>
      )}

      {recorder.erro && <p className="mb-0 mt-3 font-corpo text-sm text-critico">{recorder.erro}</p>}
    </fieldset>
  );
}
