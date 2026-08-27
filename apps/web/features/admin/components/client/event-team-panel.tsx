"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";

type EventMember = {
  accountId: string;
  email: string;
  role: "couple" | "planner";
  createdAt: string;
};

type Props = {
  eventId: string;
  canManageTeam?: boolean;
};

export function EventTeamPanel({ eventId, canManageTeam = false }: Props) {
  const [members, setMembers] = useState<EventMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convidado, setConvidado] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"couple" | "planner">("couple");

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/members`);
      if (!res.ok) throw new Error("Falha ao carregar membros");
      const data = (await res.json()) as { members?: EventMember[] };
      setMembers(data.members || []);
    } catch {
      setError("Não foi possível carregar a equipe agora.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        throw new Error(err.message || "Falha ao convidar");
      }

      const data = (await res.json()) as { members?: EventMember[] };
      setMembers(data.members || []);
      setEmail("");
      setRole("couple");
      setConvidado(true);
      setTimeout(() => setConvidado(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível convidar agora. Tente de novo.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (canManageTeam) {
      void loadMembers();
    }
  }, [canManageTeam, loadMembers]);

  if (!canManageTeam) return null;

  return (
    <AdminSection>
      <h2 className="mb-3 mt-0 font-titulo text-lg">Equipe</h2>
      <p className="mb-4 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
        Convide pessoas para gerenciar este evento junto com você.
      </p>

      {loading && <p className="m-0 text-[0.9rem] text-ink-3">Carregando…</p>}

      {error && (
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-sm text-critico">{error}</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadMembers()}
            className="cursor-pointer rounded-pilula border border-linha bg-transparent px-2.5 py-1 font-titulo text-xs text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink disabled:cursor-default disabled:opacity-50"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {!loading && members.length === 0 && (
        <p className="mb-4 mt-0 text-[0.9rem] text-ink-3">
          Só você por enquanto — convide o casal ou o cerimonialista.
        </p>
      )}

      {!loading && members.length > 0 && (
        <div className="mb-5 flex flex-col gap-2">
          {members.map((m) => (
            <div
              key={m.accountId}
              className="flex items-center gap-3 rounded-token bg-bg px-3 py-2.5 text-sm"
            >
              <div className="flex-1 text-ink">{m.email}</div>
              <div className="shrink-0 text-xs text-ink-3">
                {m.role === "couple" ? "Casal" : "Cerimonialista"}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleInvite} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
            className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
            placeholder="nome@exemplo.com"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
          Papel
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "couple" | "planner")}
            disabled={saving}
            className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
          >
            <option value="couple">Casal (acesso completo)</option>
            <option value="planner">Cerimonialista (moderação e painel)</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={saving || !email.trim()}
          className={`${adminClasses.primaryButton} ${
            saving || !email.trim() ? "opacity-60" : ""
          }`}
        >
          {saving ? "Convidando…" : convidado ? "Convite enviado!" : "Convidar"}
        </button>
      </form>
    </AdminSection>
  );
}
