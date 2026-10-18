import type { QueueDetails } from "@albora/core";

export const LIMITE_LOTE = 8;

export type PedidoDoLote = {
  arquivo: File;
  desafioId: string | null;
  promptKey: string | null;
};

export type ResultadoEnfileirar = { ok: true; id: string } | { ok: false; erro: string };

export function limitarLote(arquivos: File[]): { arquivos: File[]; excedeu: boolean } {
  return {
    arquivos: arquivos.slice(0, LIMITE_LOTE),
    excedeu: arquivos.length > LIMITE_LOTE,
  };
}

/** Cada arquivo percorre o mesmo `enfileirarFoto` do envio de uma foto (EXIF/GPS removidos no cliente, fila persistente); o momento e a legenda do lote só viajam como `QueueDetails`, igual à tela de detalhes. */
export async function enviarLote({
  arquivos,
  detalhes,
  desafioId,
  promptKey,
  enfileirar,
  anotar,
  aoEnfileirar,
}: {
  arquivos: File[];
  detalhes: QueueDetails;
  desafioId: string | null;
  promptKey: string | null;
  enfileirar: (pedido: PedidoDoLote) => Promise<ResultadoEnfileirar>;
  anotar: (id: string, detalhes: QueueDetails) => Promise<void>;
  aoEnfileirar?: (arquivo: File) => void;
}): Promise<{ enfileiradas: File[]; falhas: number; ultimoErro: string | null }> {
  const enfileiradas: File[] = [];
  let falhas = 0;
  let ultimoErro: string | null = null;
  const temDetalhes = !!detalhes.legenda || !!detalhes.lugar;

  for (const arquivo of limitarLote(arquivos).arquivos) {
    const r = await enfileirar({ arquivo, desafioId, promptKey });
    if (!r.ok) {
      falhas += 1;
      ultimoErro = r.erro;
      continue;
    }
    enfileiradas.push(arquivo);
    aoEnfileirar?.(arquivo);
    if (temDetalhes) await anotar(r.id, detalhes);
  }

  return { enfileiradas, falhas, ultimoErro };
}
