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

function initials(email: string): string {
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ email }: { email: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-superficie-alta font-titulo text-[0.6875rem] text-ink-2">
      {initials(email)}
    </span>
  );
}

function RoleChip({ role }: { role: "couple" | "planner" }) {
  return (
    <span className="rounded-pilula border border-linha px-2 py-0.5 font-titulo text-[0.72rem] text-ink-3">
      {role === "couple" ? "Casal" : "Cerimonialista"}
    </span>
  );
}

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
      <h2 className="mb-1 mt-0 font-titulo text-lg">Equipe</h2>
      <p className="mb-5 mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">
        Convide pessoas para gerenciar este evento junto com você.
      </p>

      {loading && (
        <div className="mb-5 flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 rounded-token bg-bg px-3 py-3">
              <div className="h-8 w-8 rounded-full bg-superficie-alta" />
              <div className="h-3 flex-1 rounded-full bg-superficie-alta" />
              <div className="h-5 w-20 rounded-pilula bg-superficie-alta" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-token border border-critico bg-bg px-3.5 py-3">
          <p className="m-0 text-sm text-critico">{error}</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadMembers()}
            className="shrink-0 cursor-pointer rounded-pilula border border-linha bg-transparent px-2.5 py-1 font-titulo text-xs text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink disabled:cursor-default disabled:opacity-50"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {!loading && !error && members.length === 0 && (
        <div className="mb-5 flex flex-col items-center gap-3 rounded-token border border-linha bg-bg px-6 py-8 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-superficie-alta text-ink-3">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 15c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <p className="m-0 font-titulo text-[0.9375rem] text-ink">Só você por enquanto</p>
          <p className="m-0 max-w-[18rem] text-[0.8125rem] leading-relaxed text-ink-3">
            Convide o casal ou o cerimonialista para gerenciar o evento junto.
          </p>
        </div>
      )}

      {!loading && members.length > 0 && (
        <div className="mb-5 flex flex-col gap-1.5">
          {members.map((m) => (
            <div
              key={m.accountId}
              className="flex items-center gap-3 rounded-token border border-linha bg-bg px-3 py-2.5"
            >
              <Avatar email={m.email} />
              <span className="flex-1 text-[0.875rem] text-ink">{m.email}</span>
              <RoleChip role={m.role} />
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleInvite} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.7rem] uppercase tracking-rotulo text-ink-3" htmlFor="invite-email">
            E-mail
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
            className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento disabled:opacity-60"
            placeholder="nome@exemplo.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[0.7rem] uppercase tracking-rotulo text-ink-3" htmlFor="invite-role">
            Papel
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as "couple" | "planner")}
            disabled={saving}
            className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento disabled:opacity-60"
          >
            <option value="couple">Casal (acesso completo)</option>
            <option value="planner">Cerimonialista (moderação e painel)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving || !email.trim()}
            className={`${adminClasses.primaryButton} ${
              saving || !email.trim() ? "opacity-60" : ""
            }`}
          >
            {saving ? "Convidando…" : "Convidar"}
          </button>
          {convidado && (
            <span className="flex items-center gap-1.5 rounded-pilula border border-acento-texto px-3 py-1.5 font-titulo text-[0.8125rem] text-acento-texto">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path
                  d="M2 6l2.5 2.5L10 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Convite enviado
            </span>
          )}
        </div>
      </form>
    </AdminSection>
  );
}
