import type { JobExport } from "@albora/db";
import { ErroDriveApi, type DriveClient } from "./drive-client";

/** Laço de upload para Drive (spec §5.2/§7): dependências injetadas para ficar testável; série por vez — paralelismo multiplica 403 na cota do Drive. */

const EXTENSAO: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
};

/** Quantos itens no máximo por tick do worker — evita estourar CPU/timeout (spec §9). */
export const ITENS_POR_TICK_DRIVE = 25;

export type ResultadoExportDrive = {
  estado: "pronto" | "parcial";
  enviadas: number;
  total: number;
  quotaEsgotada: boolean;
};

export type ResultadoTickDrive = ResultadoExportDrive & {
  /** Não restam itens sem `uploadedAt` (sucesso ou falha definitiva neste job). */
  concluido: boolean;
  /** Parou cedo porque atingiu o teto do tick — o runner retoma depois. */
  pausadoNoTick: boolean;
};

export type LeitorDeObjeto = Uint8Array | ReadableStream<Uint8Array>;

export async function executarExportDrive(
  job: Pick<JobExport, "itens" | "driveFolderId">,
  driveClient: DriveClient,
  accessToken: string,
  ler: (chave: string) => Promise<LeitorDeObjeto | null>,
  marcarEnviado: (itemId: string, driveFileId: string) => Promise<void>,
): Promise<ResultadoExportDrive> {
  const tick = await avancarExportDrive(job, driveClient, accessToken, ler, marcarEnviado, {
    maxItens: Number.POSITIVE_INFINITY,
  });
  const { estado, enviadas, total, quotaEsgotada } = tick;
  return { estado, enviadas, total, quotaEsgotada };
}

/** Um tick do export: processa até `maxItens` pendentes e para — runner chama de novo até `concluido`. */
export async function avancarExportDrive(
  job: Pick<JobExport, "itens" | "driveFolderId">,
  driveClient: DriveClient,
  accessToken: string,
  ler: (chave: string) => Promise<LeitorDeObjeto | null>,
  marcarEnviado: (itemId: string, driveFileId: string) => Promise<void>,
  opts?: { maxItens?: number },
): Promise<ResultadoTickDrive> {
  if (!job.driveFolderId) throw new Error("job de Drive sem drive_folder_id");
  const folderId = job.driveFolderId;
  const maxItens = opts?.maxItens ?? ITENS_POR_TICK_DRIVE;

  let enviadas = job.itens.filter((i) => i.uploadedAt).length;
  let quotaEsgotada = false;
  let tentativasNesteTick = 0;
  let pausadoNoTick = false;

  for (const item of job.itens) {
    if (item.uploadedAt) continue;
    if (quotaEsgotada) break;
    if (tentativasNesteTick >= maxItens) {
      pausadoNoTick = true;
      break;
    }
    tentativasNesteTick += 1;

    const conteudo = await ler(item.chave).catch(() => null);
    if (!conteudo) continue;

    const nome = `foto-${item.id}${EXTENSAO[item.mime] ?? ".bin"}`;
    try {
      let fileId: string;
      if (conteudo instanceof ReadableStream && driveClient.uploadFileStream) {
        ({ fileId } = await driveClient.uploadFileStream(accessToken, folderId, nome, item.mime, item.bytes, conteudo));
      } else if (conteudo instanceof Uint8Array) {
        ({ fileId } = await driveClient.uploadFile(accessToken, folderId, nome, item.mime, conteudo));
      } else {
        continue;
      }
      await marcarEnviado(item.id, fileId);
      enviadas += 1;
    } catch (e) {
      if (e instanceof ErroDriveApi && e.code === "storageQuotaExceeded") {
        quotaEsgotada = true;
        break;
      }
      continue;
    }
  }

  const total = job.itens.length;
  const concluido = !pausadoNoTick;
  const estado: "pronto" | "parcial" = enviadas === total ? "pronto" : "parcial";
  return { estado, enviadas, total, quotaEsgotada, concluido, pausadoNoTick };
}

export function driveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}
