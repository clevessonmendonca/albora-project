/**
 * Plano de retenção pós-evento (doc de produto §4.6).
 *
 * D365 nunca deleta se o export do casal falhou — fail-closed.
 */

export type RetentionKind = "plus_48h" | "d330_drive" | "d365_delete";

export type RetentionPlanItem = {
  kind: RetentionKind;
  dueAt: Date;
};

export function planRetention(endsAt: Date, now = new Date()): RetentionPlanItem[] {
  const end = endsAt.getTime();
  const items: RetentionPlanItem[] = [
    { kind: "plus_48h", dueAt: new Date(end + 48 * 3600 * 1000) },
    { kind: "d330_drive", dueAt: new Date(end + 330 * 24 * 3600 * 1000) },
    { kind: "d365_delete", dueAt: new Date(end + 365 * 24 * 3600 * 1000) },
  ];
  return items.filter((i) => i.dueAt.getTime() > now.getTime() - 24 * 3600 * 1000);
}

/**
 * D365 só segue se houve export bem-sucedido (ZIP/Drive).
 * Sem evidência de export → skip (nunca apaga).
 */
export function mayDeleteAtD365(opts: {
  exportSucceeded: boolean;
  driveStubDone: boolean;
}): { ok: true } | { ok: false; reason: "export_missing" } {
  if (!opts.exportSucceeded && !opts.driveStubDone) {
    return { ok: false, reason: "export_missing" };
  }
  return { ok: true };
}
