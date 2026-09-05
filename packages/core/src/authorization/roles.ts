import type { Capability, StaffRole } from "./types";

const OWNER_CAPABILITIES = [
  "analytics.platform.read", "accounts.read", "accounts.pii.reveal", "events.read",
  "tickets.read", "tickets.write", "tickets.assign",
  "subscription.read", "subscription.mutate", "subscription.refund",
  "subscription.refund.approve",
  "lgpd.dsar.read", "lgpd.dsar.execute", "lgpd.delete_account",
  "retention.read", "impersonate.request", "impersonate.approve",
  "staff.manage", "audit.read", "security.read",
] as const satisfies readonly Capability[];

// Se `Capability` ganhar um membro sem entrar aqui, esta linha para de
// compilar — owner precisa ser "todas", não "todas as que alguém lembrou".
type AssertaCompleto<T extends readonly Capability[]> = Capability extends T[number] ? T : never;
const OWNER_COMPLETO: AssertaCompleto<typeof OWNER_CAPABILITIES> = OWNER_CAPABILITIES;

export const ROLE_CAPABILITIES: Readonly<Record<StaffRole, readonly Capability[]>> = {
  owner: OWNER_COMPLETO,
  support: [
    "analytics.platform.read", "accounts.read", "accounts.pii.reveal", "events.read",
    "tickets.read", "tickets.write", "tickets.assign",
    "subscription.read", "impersonate.request",
  ],
  finance: [
    "analytics.platform.read", "accounts.read",
    "subscription.read", "subscription.mutate", "subscription.refund",
    "tickets.read",
  ],
  compliance: [
    "accounts.read", "accounts.pii.reveal",
    "lgpd.dsar.read", "lgpd.dsar.execute", "lgpd.delete_account",
    "retention.read", "audit.read", "security.read", "events.read",
  ],
  engineering: [
    "analytics.platform.read", "events.read", "retention.read", "tickets.read", "security.read",
  ],
};
