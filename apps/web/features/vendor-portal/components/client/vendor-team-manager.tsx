"use client";

import Link from "next/link";
import React, { useState, type FormEvent } from "react";
import type { VendorRole, VendorTeamMember } from "@albora/db";
import { useVendorTeam } from "../../hooks/use-vendor-team";

type Props = {
  vendorId: string;
  actorAccountId: string;
  initialMembers: VendorTeamMember[];
  teamLimit: number | null;
};

const field = "min-h-12 w-full rounded-token border border-linha bg-bg px-4 text-base text-ink outline-none transition-colors focus:border-acento focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2";
const secondaryButton = "inline-flex min-h-11 items-center justify-center rounded-pilula border border-linha bg-superficie px-4 text-sm font-semibold text-ink transition-colors hover:border-acento-texto disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2";

export function VendorTeamManager({ vendorId, actorAccountId, initialMembers, teamLimit }: Props) {
  const team = useVendorTeam(vendorId, initialMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<VendorRole>("staff");
  const [confirming, setConfirming] = useState<string | null>(null);
  const atLimit = teamLimit !== null && team.members.length >= teamLimit;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await team.invite(email, role)) setEmail("");
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="invite-title" className="rounded-superficie bg-superficie-alta p-5 sm:p-7">
        <div className="max-w-[44rem]">
          <h2 id="invite-title" className="tipo-subtitle m-0">Convide quem trabalha com você</h2>
          <p className="tipo-body mb-0 mt-2 text-ink-2">
            A equipe entra pelo próprio e-mail. Administradores gerenciam conta e pessoas; equipe cuida dos eventos.
          </p>
        </div>
        <p className="mb-0 mt-4 text-sm font-medium text-ink-2">
          {teamLimit === null ? `${team.members.length} pessoas · sem limite contratual` : `${team.members.length} de ${teamLimit} pessoas no plano`}
        </p>
        {atLimit ? (
          <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <p className="m-0 text-sm text-ink-2">O plano atual chegou ao limite da equipe.</p>
            <Link href={`/admin/vendor/checkout?vendor=${vendorId}`} className={secondaryButton}>Ver planos</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4 lg:grid-cols-[minmax(15rem,1fr)_12rem_auto] lg:items-end">
            <label className="grid gap-2 text-sm font-medium text-ink">
              E-mail
              <input className={field} type="email" required maxLength={320} autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); team.clearFeedback(); }} placeholder="pessoa@empresa.com" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-ink">
              Papel
              <select className={field} value={role} onChange={(event) => setRole(event.target.value as VendorRole)}>
                <option value="staff">Equipe</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            <button className="min-h-12 rounded-pilula bg-acento px-6 text-sm font-semibold text-sobre-acento transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2" disabled={team.operation !== null} type="submit">
              {team.operation === "invite" ? "Enviando…" : "Enviar convite"}
            </button>
          </form>
        )}
        <div aria-live="polite" aria-atomic="true">
          {team.feedback && <p className={`mb-0 mt-4 text-sm ${team.feedback.kind === "error" ? "text-critico" : "text-acento-texto"}`} role={team.feedback.kind === "error" ? "alert" : "status"}>{team.feedback.message}</p>}
        </div>
      </section>

      <section aria-labelledby="members-title">
        <h2 id="members-title" className="tipo-subtitle m-0">Pessoas com acesso</h2>
        <p className="tipo-caption mb-5 mt-1 text-ink-3">As mudanças de acesso ficam registradas na auditoria.</p>
        <ul className="m-0 grid list-none gap-3 p-0">
          {team.members.map((member) => {
            const isSelf = member.accountId === actorAccountId;
            const changing = team.operation?.endsWith(member.accountId) ?? false;
            return (
              <li key={member.accountId} className="grid gap-4 rounded-superficie border border-linha bg-superficie p-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-center sm:p-5">
                <div className="min-w-0">
                  <p className="m-0 truncate font-medium text-ink">{member.email}</p>
                  <p className="mb-0 mt-1 text-sm text-ink-3">{isSelf ? "Você · acesso protegido" : member.role === "admin" ? "Pode gerenciar conta e equipe" : "Pode gerenciar eventos"}</p>
                </div>
                <label className="grid gap-1 text-xs font-medium text-ink-2">
                  Papel
                  <select aria-label={`Papel de ${member.email}`} className={field} disabled={isSelf || team.operation !== null} value={member.role} onChange={(event) => void team.updateRole(member.accountId, event.target.value as VendorRole)}>
                    <option value="staff">Equipe</option>
                    <option value="admin">Administrador</option>
                  </select>
                </label>
                {isSelf ? <span className="text-sm text-ink-3">Conta atual</span> : confirming === member.accountId ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={`${secondaryButton} border-critico text-critico`} disabled={changing} onClick={async () => { if (await team.remove(member.accountId)) setConfirming(null); }}>{changing ? "Removendo…" : "Confirmar"}</button>
                    <button type="button" className={secondaryButton} disabled={changing} onClick={() => setConfirming(null)}>Cancelar</button>
                  </div>
                ) : (
                  <button type="button" className={secondaryButton} disabled={team.operation !== null} onClick={() => setConfirming(member.accountId)}>Remover</button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
