export type Capability =
  | "analytics.platform.read" | "accounts.read" | "accounts.pii.reveal" | "events.read"
  | "tickets.read" | "tickets.write" | "tickets.assign"
  | "subscription.read" | "subscription.mutate" | "subscription.refund"
  | "subscription.refund.approve"
  | "lgpd.dsar.read" | "lgpd.dsar.execute" | "lgpd.delete_account"
  | "retention.read" | "impersonate.request" | "impersonate.approve"
  | "staff.manage" | "audit.read" | "security.read";

export type StaffRole = "owner" | "support" | "finance" | "compliance" | "engineering";

export type Actor = {
  staffUserId: string;
  roles: readonly StaffRole[];
  sessionId: string;
  requestId: string;
  reauthenticatedAt: Date | null;
};

export type Decision =
  | { kind: "allowed" }
  | { kind: "denied"; reason: string }
  | { kind: "needsApproval"; approverCapability: Capability }
  | { kind: "needsReauth"; maxAgeSeconds: number };

export type AuthorizationRequest = {
  actor: Actor;
  capability: Capability;
  resource?: { kind: string; id: string };
  context?: Record<string, unknown>;
  now?: Date;
};

export type Policy = (req: AuthorizationRequest) => Decision;
