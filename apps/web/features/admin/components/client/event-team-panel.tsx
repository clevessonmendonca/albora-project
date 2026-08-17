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
    } catch (e) {
      setError(String(e));
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
    } catch (err) {
      setError(String(err));
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

      {error && <p className="m-0 text-sm text-critico">{error}</p>}

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
            className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink"
            placeholder="nome@exemplo.com"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
          Papel
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "couple" | "planner")}
            disabled={saving}
            className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink"
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
          {saving ? "Convidando…" : "Convidar"}
        </button>
      </form>
    </AdminSection>
  );
}
