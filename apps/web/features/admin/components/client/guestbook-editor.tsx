"use client";

import { MAX_TEXT_CHARACTERS } from "@albora/core";
import { PACKS, resolvePackText } from "@albora/packs";
import { useEffect, useState } from "react";
import { GuestbookAudioField } from "@/features/admin/components/client/guestbook-audio-field";
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
        <p className="m-0 text-ink-3">Carregando…</p>
      </AdminSection>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <p className="mb-5 mt-0 leading-relaxed text-ink-2">
          {rotulo}. O texto é o corpo: no salão a música é alta, e um recado só em áudio some. Cada
          convidado vê uma vez, no horário que vocês escolherem.
        </p>

        <label className="flex flex-col gap-1.5 font-titulo text-sm">
          Texto
          <textarea
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setSaved(false);
            }}
            rows={6}
            maxLength={MAX_TEXT_CHARACTERS + 40}
            placeholder={exemplo}
            className="resize-y rounded-token border border-linha bg-bg px-3 py-[0.65rem] font-corpo text-base text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
          />
          <span className={`text-[0.75rem] font-corpo ${longoDemais ? "text-critico" : "text-ink-3"}`}>
            {caracteres} / {MAX_TEXT_CHARACTERS}
          </span>
        </label>

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

        <label className="mt-5 flex flex-col gap-1.5 font-titulo text-sm">
          Aparece a partir de
          <input
            type="datetime-local"
            value={publicaEm}
            onChange={(e) => {
              setPublicaEm(e.target.value);
              setSaved(false);
            }}
            className="rounded-token border border-linha bg-bg px-3 py-[0.65rem] font-corpo text-base text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
          />
          <span className="font-corpo text-[0.75rem] text-ink-3">
            Sem horário, nenhum convidado vê. Escolha quando mostrar.
          </span>
        </label>

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
          {saved && <span className="text-sm text-ink-3">Salvo.</span>}
          {error && <span className="text-sm text-critico">{error}</span>}
        </div>
      </AdminSection>
    </div>
  );
}
