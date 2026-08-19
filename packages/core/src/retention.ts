/**
 * Plano de retenção pós-evento (doc de produto §4.6; spec drive-export §5/§6).
 *
 * D365 nunca deleta se o export do casal não cobrir o acervo publicado
 * inteiro — fail-closed. A aritmética soma milissegundos a um instante
 * absoluto (`events.ends_at`, `timestamptz`) e nunca cai em aritmética de
 * data-de-calendário: é o que evita o off-by-one clássico de fuso horário
 * (`new Date("2026-08-10")` interpretado em UTC vs. local). Qualquer PR
 * futuro que troque essa soma por manipulação de "dia local" reabre esse bug.
 */

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

/**
 * O melhor export candidato a cobrir o D365 — `null` quando não há nenhum.
 * `publishedSnapshot` é `export_jobs.published_snapshot`: quantas linhas de
 * `uploads` (state='published') existiam no instante em que o job nasceu.
 */
export type MelhorExportParaRetencao = {
  estado: "pronto" | "parcial" | "vazio";
  publishedSnapshot: number;
} | null;

export type MotivoRecusaD365 = "export_missing" | "export_parcial" | "export_desatualizado";

/**
 * O gate do D365 (spec drive-export §5.3) — mais estrito que "existe 1 export
 * com estado pronto". "Existe" não é a mesma coisa que "o casal tem uma cópia
 * completa e atual": um export de 200 fotos rodado no dia 2 não pode liberar
 * a deleção de um acervo de 3.000 fotos no dia 365.
 *
 * Só libera quando o export está `pronto` (nunca `parcial` — Drive quase
 * cheio no meio do envio não conta) E `publishedSnapshot === publishedAgora`
 * (nada foi publicado depois do export rodar — ex.: uma denúncia liberada
 * depois do job). `publishedSnapshot > publishedAgora` (mídia removida depois
 * do export) não bloqueia: o export continua cobrindo tudo que existe hoje.
 */
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

/**
 * Quando o runner pode de fato processar um job vencido.
 *
 * Avisos (`plus_48h`, `d330_drive`, `d358_warn`) processam assim que
 * `dueAt` vence — reversíveis, sem custo de errar por minutos. `d365_delete`
 * é irreversível: só processa 1h depois de vencido, absorvendo jitter de
 * cron, atraso de fila, relógio de servidor levemente errado — sempre na
 * direção que importa (atrasar é seguro, antecipar não é). Isso nunca move o
 * "dia 365" visível ao casal (o `d358_warn` já contou os dias reais antes) —
 * só adia a execução técnica da exclusão.
 */
export function podeProcessarAgora(job: { kind: RetentionKind; dueAt: Date }, agora: Date): boolean {
  if (job.kind !== "d365_delete") return agora.getTime() >= job.dueAt.getTime();
  return agora.getTime() >= job.dueAt.getTime() + GRACE_MINUTOS_DELETE * 60_000;
}

/**
 * "Faltam N dias" do aviso final (§6.4) — nunca hardcoded "7 dias", porque o
 * runner pode rodar atrasado e o texto tem de refletir o que resta de
 * verdade. Nunca negativo: já vencido mostra 0, não um número negativo.
 */
export function diasRestantesAteD365(dueAtD365: Date, agora: Date): number {
  const restante = dueAtD365.getTime() - agora.getTime();
  return Math.max(0, Math.ceil(restante / DIA_MS));
}
