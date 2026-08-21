import {
  detectarTipo,
  isHeic,
  isVideoBytes,
  processarFoto,
  temGeolocalizacao,
  validarConteudo,
  validarDeclaracao,
  type Bitmap,
  type Desenhista,
  type FiltroAplicado,
  type Plan,
  type Queue,
  type QueueItem,
} from "@albora/core";
import { bufferDrawer } from "./drawer";
import type { FileOps } from "./files";

const AVISO_HEIC =
  "Este aparelho não abre fotos HEIC. No iPhone: Ajustes → Câmera → Formatos → “Mais compatível”.";

export type CaptureSource = {
  uri: string;
  width?: number;
  height?: number;
};

export type CaptureResult =
  | { ok: true; id: string; caminho: string; tinhaGeolocalizacao: boolean }
  | { ok: false; erro: string };

/**
 * Copia o still, processa (orientação + resize + reencode) e enfileira.
 * O reencode tira EXIF/GPS — o URLSession só continua com arquivo (ADR 0008/0010).
 * `filtro` é a escolha do convidado na tira de presets; ausente = sem cor.
 */
export async function persistCapture(input: {
  source: CaptureSource;
  eventoId: string;
  queue: Queue;
  files: FileOps;
  destDir: string;
  plan?: Plan;
  device?: { memoryGb: number; cores: number };
  filtro?: FiltroAplicado;
  desafioId?: string | null;
  now?: () => number;
  id?: () => string;
  /** Rede de segurança: converte URI HEIC → URI JPEG antes de rejeitar. */
  convertHeic?: (uri: string) => Promise<string>;
  /**
   * Desenhista a usar para decode/resize/encode/filtro.
   * Padrão: `bufferDrawer` (jpeg-js) — compatível com Node e testes.
   * Em produção: injetar `skiaDrawer` para qualidade bicúbica no resize.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TSaida=Uint8Array; TImagem é opaco dentro do pipeline
  desenhista?: Desenhista<any, Uint8Array>;
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
      if (input.convertHeic) {
        try {
          const jpegUri = await input.convertHeic(input.source.uri);
          const { convertHeic: _conv, ...rest } = input;
          return persistCapture({ ...rest, source: { uri: jpegUri } });
        } catch {
          return { ok: false, erro: AVISO_HEIC };
        }
      }
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

    const brutos = await input.files.readAll(dest);
    const drawer = input.desenhista ?? (bufferDrawer as Desenhista<Bitmap, Uint8Array>);
    const processada = await processarFoto(brutos, mime, drawer, {
      plan: input.plan ?? "gratis",
      device: input.device ?? { memoryGb: 4, cores: 4 },
      ...(input.filtro ? { filtro: input.filtro } : {}),
    });

    if (!input.files.write) {
      await input.files.remove(dest);
      return { ok: false, erro: "Não consegui guardar a foto. Tente de novo." };
    }
    await input.files.write(dest, processada.full);

    const depois = await input.files.info(dest);
    if (!depois.exists || depois.size <= 0) {
      await input.files.remove(dest);
      return { ok: false, erro: "Não consegui guardar a foto. Tente de novo." };
    }

    // Rede de segurança: se o reencode falhar em silêncio, não sobe GPS.
    if (temGeolocalizacao(processada.full)) {
      await input.files.remove(dest);
      return {
        ok: false,
        erro:
          "Esta foto contém localização GPS e não pode ser enviada. " +
          "Tire nova foto com a câmera do app.",
      };
    }

    const criadoEm = (input.now ?? Date.now)();
    const capturadaEm =
      processada.capturadaEm !== null ? processada.capturadaEm.getTime() : criadoEm;

    const item: QueueItem = {
      id,
      eventoId: input.eventoId,
      corpo: { tipo: "arquivo", caminho: dest, bytes: depois.size },
      mime: "image/jpeg",
      criadoEm,
      tentativas: 0,
      capturadaEm,
      ...(processada.capturadaEm !== null ? { capturadaEmParede: true } : {}),
      largura: processada.largura,
      altura: processada.altura,
      ...(input.desafioId != null ? { desafioId: input.desafioId } : {}),
    };

    await input.queue.enqueue(item);
    return {
      ok: true,
      id,
      caminho: dest,
      tinhaGeolocalizacao: processada.tinhaGeolocalizacao,
    };
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
