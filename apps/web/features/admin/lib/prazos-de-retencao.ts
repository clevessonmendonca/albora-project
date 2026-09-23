export type JobLido = {
  kind: string;
  status: string;
  dueAt: Date;
  completedAt: Date | null;
};

export type PrazosDeRetencao = {
  /** Quando as fotos vão para a nuvem do casal. `null` = não há job pendente que prometa isso. */
  exportaEm: Date | null;
  /** Quando saem daqui. `null` = não há exclusão agendada. */
  apagaEm: Date | null;
  jaExportou: boolean;
  exportouEm: Date | null;
};

/** Só job pendente vira promessa. Job pulado ou falho não pode virar data na tela do casal: a retenção é cumprida por job, e prometer o que o runner não vai fazer é mentir com data. */
export function prazosDeRetencao(jobs: readonly JobLido[]): PrazosDeRetencao {
  const drive = jobs.find((j) => j.kind === "d330_drive");
  const exclusao = jobs.find((j) => j.kind === "d365_delete");

  const pendente = (j: JobLido | undefined) =>
    j && (j.status === "pending" || j.status === "running" || j.status === "failed") ? j.dueAt : null;

  return {
    exportaEm: drive?.status === "done" ? null : pendente(drive),
    apagaEm: pendente(exclusao),
    jaExportou: drive?.status === "done",
    exportouEm: drive?.status === "done" ? drive.completedAt : null,
  };
}
