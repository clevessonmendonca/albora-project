"use client";

import { useState } from "react";
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

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/members`);
      if (!res.ok) throw new Error("Falha ao carregar membros");
      const data = await res.json();
      setMembers(data.members || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

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
        const err = await res.json();
        throw new Error(err.message || "Falha ao convidar");
      }

      const data = await res.json();
      setMembers(data.members || []);
      setEmail("");
      setRole("couple");
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  React.useEffect(() => {
    if (canManageTeam) {
      void loadMembers();
    }
  }, [eventId, canManageTeam]);

  if (!canManageTeam) return null;

  return (
    <AdminSection title="Equipe">
      <div className={adminClasses.textMuted}>
        Convide pessoas para gerenciar este evento junto com você.
      </div>

      {loading && <div className={adminClasses.textMuted}>Carregando...</div>}

      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}

      {!loading && members.length > 0 && (
        <div className="mt-4 space-y-2">
          {members.map((m) => (
            <div key={m.accountId} className="flex items-center gap-3 text-sm">
              <div className="flex-1 font-mono text-xs">{m.email}</div>
              <div className={adminClasses.textMuted}>
                {m.role === "couple" ? "Casal" : "Cerimonialista"}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleInvite} className="mt-6 space-y-3">
        <div>
          <label className={adminClasses.label}>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
            className={adminClasses.input}
            placeholder="nome@exemplo.com"
          />
        </div>

        <div>
          <label className={adminClasses.label}>Papel</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "couple" | "planner")}
            disabled={saving}
            className={adminClasses.input}
          >
            <option value="couple">Casal (acesso completo)</option>
            <option value="planner">Cerimonialista (moderação e painel)</option>
          </select>
        </div>

        <button type="submit" disabled={saving || !email.trim()} className={adminClasses.button}>
          {saving ? "Convidando..." : "Convidar"}
        </button>
      </form>
    </AdminSection>
  );
}
