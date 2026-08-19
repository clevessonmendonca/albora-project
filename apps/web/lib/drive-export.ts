import type { JobExport } from "@albora/db";
import { ErroDriveApi, type DriveClient } from "./drive-client";

/**
 * O laço de upload em si (spec drive-export §5.2/§7) — dependências
 * injetadas (`DriveClient`, leitor de bytes, marcador de progresso) para
 * ficar testável sem rede nem banco. Roda em série, um arquivo por vez —
 * mesma razão da drenagem em série do convidado (`architecture.md` §5.4):
 * é a cota de escrita do Drive por usuário, paralelismo só multiplica 403.
 *
 * Síncrono por ora (spec §9, fase 4: "sem fila ainda, para eventos pequenos
 * de teste") — o encadeamento por fila (Cloudflare Queues, ADR 0006) é a
 * fase seguinte; esta função já está pronta para ser chamada em lote por um
 * consumer futuro (um item por invocação, ou N itens até o teto de CPU).
 */

const EXTENSAO: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
};

export type ResultadoExportDrive = {
  estado: "pronto" | "parcial";
  enviadas: number;
  total: number;
  quotaEsgotada: boolean;
};

export async function executarExportDrive(
  job: Pick<JobExport, "itens" | "driveFolderId">,
  driveClient: DriveClient,
  accessToken: string,
  ler: (chave: string) => Promise<Uint8Array | null>,
  marcarEnviado: (itemId: string, driveFileId: string) => Promise<void>,
): Promise<ResultadoExportDrive> {
  if (!job.driveFolderId) throw new Error("job de Drive sem drive_folder_id");
  const folderId = job.driveFolderId;

  let enviadas = job.itens.filter((i) => i.uploadedAt).length;
  let quotaEsgotada = false;

  for (const item of job.itens) {
    if (item.uploadedAt) continue;
    if (quotaEsgotada) break;

    const bytes = await ler(item.chave).catch(() => null);
    if (!bytes) continue; // item ilegível — erro é valor, não trava o laço

    const nome = `foto-${item.id}${EXTENSAO[item.mime] ?? ".bin"}`;
    try {
      const { fileId } = await driveClient.uploadFile(accessToken, folderId, nome, item.mime, bytes);
      await marcarEnviado(item.id, fileId);
      enviadas += 1;
    } catch (e) {
      if (e instanceof ErroDriveApi && e.code === "storageQuotaExceeded") {
        // O Drive esvaziou no meio do lote — para de enfileirar, preserva
        // o que já subiu (spec §5.2). Nunca retenta indefinidamente aqui.
        quotaEsgotada = true;
        break;
      }
      // Falha definitiva deste item específico — segue para o próximo.
      continue;
    }
  }

  const total = job.itens.length;
  const estado: "pronto" | "parcial" = enviadas === total ? "pronto" : "parcial";
  return { estado, enviadas, total, quotaEsgotada };
}

export function driveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}
