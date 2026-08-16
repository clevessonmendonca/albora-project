"use client";

import { useState } from "react";
import { adminClasses } from "@/features/admin/components/server/admin-shell";

export function SupportHelpButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"p0" | "p1" | "p2">("p2");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  const send = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSaving(true);
    setError(false);
    try {
      const r = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, body, eventId, priority }),
      });
      if (!r.ok) throw new Error("falhou");
      setDone(true);
      setOpen(false);
      setSubject("");
      setBody("");
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return <p className="m-0 text-sm text-ink-3">Pedido enviado. A gente responde no e-mail da conta.</p>;
  }

  if (!open) {
    return (
      <button type="button" className={adminClasses.secondaryButton} onClick={() => setOpen(true)}>
        Abrir chamado
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-ink-2">
        Assunto
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded-token border border-linha bg-bg px-3 py-2 font-corpo text-base text-ink"
          placeholder="Telão não liga"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink-2">
        O que aconteceu
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="rounded-token border border-linha bg-bg px-3 py-2 font-corpo text-base text-ink"
          placeholder="Sem nomes de convidados, sem colar legendas."
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink-2">
        Prioridade
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as "p0" | "p1" | "p2")}
          className="rounded-token border border-linha bg-bg px-3 py-2 font-corpo text-base text-ink"
        >
          <option value="p0">P0 — festa ao vivo agora</option>
          <option value="p1">P1 — esta semana, antes da festa</option>
          <option value="p2">P2 — quando der</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void send()}
          className={`${adminClasses.primaryButton} ${saving ? "opacity-60" : ""}`}
        >
          {saving ? "Enviando…" : "Enviar"}
        </button>
        <button type="button" className={adminClasses.secondaryButton} onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
      {error && <p className="m-0 text-sm text-critico">Não enviou. Tente de novo.</p>}
    </div>
  );
}
