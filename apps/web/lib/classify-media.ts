import {
  chaveThumbDeFull,
  classificarImagem,
  provedorDeImagemDoAmbiente,
  type EntradaDeImagem,
  type VeredictoDoClassificador,
} from "@albora/core";
import {
  comEvento,
  gravarVeredictoUpload,
  listarUploadsPendentesDeClassificacao,
  type UploadPendenteDeClassificacao,
} from "@albora/db";
import { getPool } from "@/lib/db";
import { readThumb } from "@/lib/r2";

const TETO = 8;
const ESPERA_THUMB_MS = 30_000;

const emCurso = new Set<string>();

export type DependenciasDoClassificador = {
  listar: (eventoId: string) => Promise<UploadPendenteDeClassificacao[]>;
  lerThumb: (chave: string) => Promise<Uint8Array | null>;
  gravar: (
    eventoId: string,
    uploadId: string,
    veredicto: VeredictoDoClassificador,
  ) => Promise<void>;
  classificar: (entrada: EntradaDeImagem) => Promise<VeredictoDoClassificador>;
  agora?: () => number;
};

/**
 * Classifica thumbs pendentes de um evento. Fora do confirm, fora do caminho
 * crítico: o poll da parede chama isto em fire-and-forget.
 */
export async function classificarPendentesDoEvento(
  eventoId: string,
  deps: DependenciasDoClassificador,
  teto = TETO,
): Promise<number> {
  const pendentes = (await deps.listar(eventoId)).slice(0, teto);
  const agora = deps.agora ?? Date.now;
  let processados = 0;

  for (const p of pendentes) {
    const chaveThumb = chaveThumbDeFull(p.chaveFull);
    let bytes: Uint8Array | null;
    try {
      bytes = await deps.lerThumb(chaveThumb);
    } catch {
      await deps.gravar(eventoId, p.id, "sem-resposta");
      processados += 1;
      continue;
    }

    if (bytes === null) {
      if (agora() - p.criadaEm.getTime() >= ESPERA_THUMB_MS) {
        await deps.gravar(eventoId, p.id, "sem-resposta");
        processados += 1;
      }
      continue;
    }

    const veredicto = await deps.classificar({ bytes, mime: p.mime });
    await deps.gravar(eventoId, p.id, veredicto);
    processados += 1;
  }

  return processados;
}

/** Dispara o lote e não espera — o próximo poll da parede já lê o veredicto. */
export function classifyMediaAfter(eventoId: string): void {
  if (emCurso.has(eventoId)) return;
  emCurso.add(eventoId);
  void classificarPendentesDoEvento(eventoId, dependenciasDeProducao())
    .catch(() => {
      console.warn("midia.classificador_falhou", { eventoId });
    })
    .finally(() => {
      emCurso.delete(eventoId);
    });
}

function dependenciasDeProducao(): DependenciasDoClassificador {
  const pool = getPool();
  const provedor = provedorDeImagemDoAmbiente();
  return {
    listar: (eventoId) =>
      comEvento(pool, eventoId, (c) => listarUploadsPendentesDeClassificacao(c, eventoId)),
    lerThumb: readThumb,
    gravar: (eventoId, uploadId, veredicto) =>
      comEvento(pool, eventoId, (c) => gravarVeredictoUpload(c, uploadId, veredicto)).then(
        () => undefined,
      ),
    classificar: (entrada) => classificarImagem(entrada, provedor),
  };
}
