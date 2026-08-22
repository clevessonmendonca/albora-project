import type { QueueItem } from "@albora/core";
import { shouldGiveUp } from "@albora/core";

export type LinhaFila = {
  id: string;
  tipo: "Foto" | "Vídeo";
  estado: string;
  falhou: boolean;
  caminhoPreview: string | null;
};

export function tipoMidiaFila(mime: string): "Foto" | "Vídeo" {
  return mime.startsWith("video/") ? "Vídeo" : "Foto";
}

export function caminhoPreviewItem(item: QueueItem): string | null {
  if (item.thumb?.tipo === "arquivo") return item.thumb.caminho;
  if (item.poster?.tipo === "arquivo") return item.poster.caminho;
  if (item.corpo.tipo === "arquivo") return item.corpo.caminho;
  return null;
}

/** Rótulos da tela Fila — espelha o catálogo `/telas`. */
export function rotuloEstadoFila(
  item: QueueItem,
  opts: { enviandoAgora?: boolean; online?: boolean },
): Pick<LinhaFila, "estado" | "falhou"> {
  if (shouldGiveUp(item)) {
    return { estado: "Falhou · tentar de novo", falhou: true };
  }
  if (opts.enviandoAgora) {
    return { estado: "Enviando…", falhou: false };
  }
  if (opts.online === false) {
    return {
      estado: item.tentativas > 0 ? "Na fila · sem sinal" : "Na fila · offline",
      falhou: false,
    };
  }
  if (item.tentativas > 0) {
    return { estado: "Na fila · sem sinal", falhou: false };
  }
  return { estado: "Na fila", falhou: false };
}

export function linhasDaFila(
  itens: QueueItem[],
  opts: { enviandoId?: string | null; online?: boolean },
): LinhaFila[] {
  const ordenados = [...itens].sort((a, b) => b.criadoEm - a.criadoEm);
  return ordenados.map((item, index) => {
    const enviandoAgora = opts.enviandoId === item.id || (index === 0 && opts.enviandoId === "primeiro");
    const { estado, falhou } = rotuloEstadoFila(item, {
      enviandoAgora,
      online: opts.online,
    });
    return {
      id: item.id,
      tipo: tipoMidiaFila(item.mime),
      estado,
      falhou,
      caminhoPreview: caminhoPreviewItem(item),
    };
  });
}
