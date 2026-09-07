"use client";

import { MAX_TEXT_CHARACTERS } from "@albora/core";
import { PACKS, resolvePackText } from "@albora/packs";
import { PhoneFrame, TextField } from "@albora/ui-web";
import { useEffect, useState } from "react";
import {
  formatarDuracaoAudio,
  GuestbookAudioField,
} from "@/features/admin/components/client/guestbook-audio-field";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";
import { useGuestbookRecorder } from "@/features/admin/hooks/use-guestbook-recorder";
import type { SavedGuestbookAudio } from "@/features/admin/lib/guestbook-audio";
import { deleteGuestbookAudio, uploadGuestbookAudio } from "@/features/admin/lib/guestbook-audio-upload";

type RecadoSalvo = {
  id: string;
  texto: string;
  publicaEm: string | null;
  audio: SavedGuestbookAudio | null;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatarDataLocal(valorInput: string): string | null {
  if (valorInput.trim() === "") return null;
  const d = new Date(valorInput);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Prévia sem marca do pack — mostra só a forma do cartão, não a cor do evento (isso vive no editor de identidade). */
function PreviaConvidado({
  rotulo,
  texto,
  exemplo,
  audioPreview,
  audioDuracao,
  publicaFormatada,
}: {
  rotulo: string;
  texto: string;
  exemplo: string;
  audioPreview: string | null;
  audioDuracao: number | null;
  publicaFormatada: string | null;
}) {
  const corpo = texto.trim() || exemplo;

  return (
    <div className="flex h-full flex-col gap-4 bg-bg p-5">
      <span className="tipo-label text-ink-3">{rotulo}</span>
      <p className="tipo-body m-0 flex-1 whitespace-pre-wrap text-ink">
        {corpo || "Seu recado aparece aqui…"}
      </p>
      {audioPreview && audioDuracao !== null && (
        <div className="flex items-center gap-2 rounded-pilula border border-linha bg-superficie-alta px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0 text-ink-2">
            <circle cx="7" cy="7" r="6.25" stroke="currentColor" strokeWidth="1.25" />
            <path d="M5.6 4.8v4.4l3.6-2.2-3.6-2.2z" fill="currentColor" />
          </svg>
          <span className="tipo-label text-ink-2">Áudio · {formatarDuracaoAudio(audioDuracao)}</span>
        </div>
      )}
      <p className="tipo-label m-0 text-ink-3">
        {publicaFormatada ? `Aparece em ${publicaFormatada}` : "Ainda sem horário — some até vocês publicarem"}
      </p>
    </div>
  );
}

export function GuestbookEditor({ eventId, packId }: { eventId: string; packId: string }) {
  const pack = PACKS[packId];
  const exemplo = pack ? resolvePackText(pack, "recado.exemplo") : "";
  const rotulo = pack ? resolvePackText(pack, "recado.rotulo") : "O recado";

  const [texto, setTexto] = useState("");
  const [publicaEm, setPublicaEm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [exists, setExists] = useState(false);
  const [audioSalvo, setAudioSalvo] = useState<SavedGuestbookAudio | null>(null);
  const [removerAudio, setRemoverAudio] = useState(false);
  const [aceite, setAceite] = useState(false);
  const recorder = useGuestbookRecorder();

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(`/api/admin/events/${eventId}/guestbook`);
        if (!r.ok) throw new Error("falhou");
        const body = (await r.json()) as { recado: RecadoSalvo | null };
        if (body.recado) {
          setTexto(body.recado.texto);
          setPublicaEm(toLocalInput(body.recado.publicaEm));
          setAudioSalvo(body.recado.audio);
          setExists(true);
        }
      } catch {
        setError("Não carregou o recado salvo.");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const caracteres = texto.trim().length;
  const longoDemais = caracteres > MAX_TEXT_CHARACTERS;
  const vazio = caracteres === 0;
  const precisaAceite = recorder.pending !== null;

  const audioPreviewUrl = recorder.pending?.previewUrl ?? (removerAudio ? null : audioSalvo?.url) ?? null;
  const audioPreviewDuracao =
    recorder.pending?.duracaoSegundos ?? (removerAudio ? null : audioSalvo?.duracaoSegundos) ?? null;

  const save = async (publicarAgora: boolean) => {
    if (vazio || longoDemais) return;
    if (precisaAceite && !aceite) {
      setError("Confirme que a gravação é da sua voz.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);

    const horario = publicarAgora
      ? new Date().toISOString()
      : publicaEm.trim() === ""
        ? null
        : new Date(publicaEm).toISOString();

    try {
      const r = await fetch(`/api/admin/events/${eventId}/guestbook`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texto, publicaEm: horario }),
      });
      const body = (await r.json()) as {
        recado?: RecadoSalvo | null;
        message?: string;
      };
      if (!r.ok) throw new Error(body.message ?? "falhou");
      if (body.recado) {
        setTexto(body.recado.texto);
        setPublicaEm(toLocalInput(body.recado.publicaEm));
        if (body.recado.audio) setAudioSalvo(body.recado.audio);
        setExists(true);
      }

      if (removerAudio && !recorder.pending) {
        await deleteGuestbookAudio(eventId);
        setAudioSalvo(null);
        setRemoverAudio(false);
      }

      if (recorder.pending) {
        const audio = await uploadGuestbookAudio(eventId, recorder.pending);
        setAudioSalvo(audio);
        recorder.descartar();
        setRemoverAudio(false);
      }

      setSaved(true);
    } catch (e) {
      setError(e instanceof Error && e.message !== "falhou" ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminSection>
        <div className="flex animate-pulse flex-col gap-4">
          <div className="h-3 w-32 rounded-full bg-superficie-alta" />
          <div className="h-36 rounded-token bg-superficie-alta" />
          <div className="h-3 w-48 rounded-full bg-superficie-alta" />
          <div className="h-10 rounded-token bg-superficie-alta" />
          <div className="mt-2 flex gap-3">
            <div className="h-10 w-32 rounded-pilula bg-superficie-alta" />
            <div className="h-10 w-40 rounded-pilula bg-superficie-alta" />
          </div>
        </div>
      </AdminSection>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <p className="tipo-body m-0 mb-6 max-w-[38rem] text-ink-2">
          {rotulo}. O texto é o corpo: no salão a música é alta, e um recado só em áudio some. Cada
          convidado vê uma vez, no horário que vocês escolherem.
        </p>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="flex flex-col">
            <div className="flex flex-col gap-2">
              <label htmlFor="guestbook-texto" className="tipo-label text-ink-3">
                Texto
              </label>
              <textarea
                id="guestbook-texto"
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value);
                  setSaved(false);
                }}
                rows={6}
                maxLength={MAX_TEXT_CHARACTERS + 40}
                placeholder={exemplo}
                aria-describedby="guestbook-texto-contagem"
                className="min-h-32 resize-y rounded-token border border-linha bg-superficie px-3.5 py-2.5 font-corpo text-[0.9375rem] text-ink outline-none transition-[border-color,box-shadow] duration-[var(--tempo-rapido)] ease-[var(--curva)] placeholder:text-ink-3 focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto"
              />
              <span
                id="guestbook-texto-contagem"
                className={`text-xs ${longoDemais ? "text-critico" : "text-ink-3"}`}
              >
                {caracteres} / {MAX_TEXT_CHARACTERS}
              </span>
            </div>

            <GuestbookAudioField
              saved={removerAudio ? null : audioSalvo}
              aceite={aceite}
              onAceite={setAceite}
              onRemoveSaved={() => {
                setRemoverAudio(true);
                setSaved(false);
              }}
              recorder={recorder}
            />

            <div className="mt-6">
              <TextField
                id="guestbook-publica"
                label="Aparece a partir de"
                type="datetime-local"
                value={publicaEm}
                onChange={(e) => {
                  setPublicaEm(e.target.value);
                  setSaved(false);
                }}
                hint="Sem horário, nenhum convidado vê. Escolha quando mostrar."
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={vazio || longoDemais || saving || recorder.recording}
                onClick={() => void save(false)}
                className={`${adminClasses.primaryButton} ${
                  vazio || longoDemais || saving || recorder.recording ? "opacity-60" : ""
                }`}
              >
                {saving ? "Salvando…" : exists ? "Salvar recado" : "Criar recado"}
              </button>
              <button
                type="button"
                disabled={vazio || longoDemais || saving || recorder.recording}
                onClick={() => void save(true)}
                className={`${adminClasses.secondaryButton} ${
                  vazio || longoDemais || saving || recorder.recording ? "opacity-60" : ""
                }`}
              >
                Salvar e publicar agora
              </button>
              {saved && (
                <span className="flex items-center gap-1.5 rounded-pilula border border-acento-texto px-3 py-1.5 font-titulo text-[0.8125rem] text-acento-texto">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M2 6l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Salvo
                </span>
              )}
              {error && (
                <span role="alert" className="text-sm text-critico">
                  {error}
                </span>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <PhoneFrame title="Como o convidado vê" note="Uma vez, no horário que vocês escolherem — atualiza com o texto e o áudio.">
              <PreviaConvidado
                rotulo={rotulo}
                texto={texto}
                exemplo={exemplo}
                audioPreview={audioPreviewUrl}
                audioDuracao={audioPreviewDuracao}
                publicaFormatada={formatarDataLocal(publicaEm)}
              />
            </PhoneFrame>
          </aside>
        </div>
      </AdminSection>
    </div>
  );
}
