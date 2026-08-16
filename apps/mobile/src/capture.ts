import {
  detectarTipo,
  isHeic,
  isVideoBytes,
  validarConteudo,
  validarDeclaracao,
  type Queue,
  type QueueItem,
} from "@albora/core";
import type { FileOps } from "./files";

const AVISO_HEIC =
  "Este aparelho não abre fotos HEIC. No iPhone: Ajustes → Câmera → Formatos → “Mais compatível”.";

export type CaptureSource = {
  uri: string;
  width?: number;
  height?: number;
};

export type CaptureResult =
  | { ok: true; id: string; caminho: string }
  | { ok: false; erro: string };

/**
 * Copia o still do cache da câmera para a fila em disco.
 * O URI temporário some; o URLSession só continua com arquivo (ADR 0008/0010).
 */
export async function persistCapture(input: {
  source: CaptureSource;
  eventoId: string;
  queue: Queue;
  files: FileOps;
  destDir: string;
  now?: () => number;
  id?: () => string;
}): Promise<CaptureResult> {
  if (input.eventoId.length === 0) {
    return { ok: false, erro: "Pareie de novo para tirar foto." };
  }

  const id = (input.id ?? defaultId)();
  const dest = `${input.destDir.replace(/\/$/, "")}/${id}.jpg`;

  try {
    await input.files.mkdir(input.destDir);
    await input.files.copy(input.source.uri, dest);

    const meta = await input.files.info(dest);
    if (!meta.exists || meta.size <= 0) {
      await input.files.remove(dest);
      return { ok: false, erro: "Não consegui guardar a foto. Tente de novo." };
    }

    const head = await input.files.readHead(dest, 32);

    if (isHeic(head)) {
      await input.files.remove(dest);
      return { ok: false, erro: AVISO_HEIC };
    }

    if (isVideoBytes(head)) {
      await input.files.remove(dest);
      return { ok: false, erro: "Por agora o app só tira foto. Vídeo continua na web." };
    }

    const mime = detectarTipo(head) ?? "image/jpeg";
    const declarado = validarDeclaracao(mime, meta.size);
    if (declarado) {
      await input.files.remove(dest);
      return { ok: false, erro: mensagem(declarado.code) };
    }

    const conteudo = validarConteudo(mime, head);
    if (conteudo) {
      await input.files.remove(dest);
      return { ok: false, erro: mensagem(conteudo.code) };
    }

    const criadoEm = (input.now ?? Date.now)();
    const item: QueueItem = {
      id,
      eventoId: input.eventoId,
      corpo: { tipo: "arquivo", caminho: dest, bytes: meta.size },
      mime,
      criadoEm,
      tentativas: 0,
      capturadaEm: criadoEm,
      ...(typeof input.source.width === "number" ? { largura: input.source.width } : {}),
      ...(typeof input.source.height === "number" ? { altura: input.source.height } : {}),
    };

    await input.queue.enqueue(item);
    return { ok: true, id, caminho: dest };
  } catch {
    await input.files.remove(dest).catch(() => undefined);
    return { ok: false, erro: "Não consegui guardar a foto. Tente de novo." };
  }
}

function mensagem(code: string): string {
  if (code === "midia.grande_demais") return "Essa foto é grande demais.";
  return "Essa foto não deu para guardar. Tente de novo.";
}

function defaultId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  throw new Error("sem uuid");
}
