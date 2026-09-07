import type { PoolClient } from "pg";
import type { Actor, Capability } from "@albora/core";
import type { AuditEntry } from "@albora/db";

export type ExecuteCommandInput<T> = {
  actor: Actor;
  capability: Capability;
  reason: string;
  target: { kind: AuditEntry["targetKind"]; id?: string | null };
  action: string;
  context?: Record<string, unknown>;
  resource?: { kind: string; id: string };
  metadata?: Record<string, unknown>;
  run: (tx: PoolClient) => Promise<T>;
};

export type ExecuteQueryInput<T> = {
  actor: Actor;
  capability: Capability;
  run: () => Promise<T>;
};
