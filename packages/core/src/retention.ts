/** D365 fail-closed: soma ms a timestamptz absoluto, nunca aritmética de calendário — evita off-by-one de fuso. */
export type RetentionKind = "plus_48h" | "d330_drive" | "d358_warn" | "d365_delete";

export type RetentionPlanItem = {
  kind: RetentionKind;
  dueAt: Date;
};

const DIA_MS = 24 * 3600 * 1000;

export function planRetention(endsAt: Date, now = new Date()): RetentionPlanItem[] {
  const end = endsAt.getTime();
  const items: RetentionPlanItem[] = [
    { kind: "plus_48h", dueAt: new Date(end + 48 * 3600 * 1000) },
    { kind: "d330_drive", dueAt: new Date(end + 330 * DIA_MS) },
    { kind: "d358_warn", dueAt: new Date(end + 358 * DIA_MS) },
    { kind: "d365_delete", dueAt: new Date(end + 365 * DIA_MS) },
  ];
  return items.filter((i) => i.dueAt.getTime() > now.getTime() - DIA_MS);
}

export type MelhorExportParaRetencao = {
  estado: "pronto" | "parcial" | "vazio";
  publishedSnapshot: number;
} | null;

export type MotivoRecusaD365 = "export_missing" | "export_parcial" | "export_desatualizado";

/** Gate D365: só libera se export `pronto` E `publishedSnapshot >= publishedAgora` — parcial ou desatualizado bloqueia. */
export function mayDeleteAtD365(opts: {
  bestExport: MelhorExportParaRetencao;
  publishedAgora: number;
}): { ok: true } | { ok: false; reason: MotivoRecusaD365 } {
  const { bestExport, publishedAgora } = opts;

  if (bestExport === null) return { ok: false, reason: "export_missing" };
  if (bestExport.estado !== "pronto") return { ok: false, reason: "export_parcial" };
  if (bestExport.publishedSnapshot < publishedAgora) {
    return { ok: false, reason: "export_desatualizado" };
  }
  return { ok: true };
}

/** A folga do D365 — nunca cedo, atraso é seguro (spec §6.2). */
export const GRACE_MINUTOS_DELETE = 60;

/** d365_delete aguarda GRACE_MINUTOS_DELETE extra: atrasar é seguro, antecipar não. Avisos processam imediato. */
export function podeProcessarAgora(job: { kind: RetentionKind; dueAt: Date }, agora: Date): boolean {
  if (job.kind !== "d365_delete") return agora.getTime() >= job.dueAt.getTime();
  return agora.getTime() >= job.dueAt.getTime() + GRACE_MINUTOS_DELETE * 60_000;
}

export function diasRestantesAteD365(dueAtD365: Date, agora: Date): number {
  const restante = dueAtD365.getTime() - agora.getTime();
  return Math.max(0, Math.ceil(restante / DIA_MS));
}
