/**
 * Se **este** aparelho decodifica **este** formato — perguntado ao decoder,
 * nunca ao user-agent.
 *
 * Safari abre HEIC nativamente e a conversão para JPEG sai de graça no
 * `processarFoto`; Chrome no desktop e a maioria dos Android, não. Mas
 * "Chrome não abre HEIC" é verdade hoje e não será amanhã, e a string do
 * user-agent erra nos dois sentidos: recusaria o aparelho que abre e deixaria
 * passar o que não abre. A única resposta confiável é tentar (N5.2).
 */

const suporte = new Set<string>();

/**
 * Memoiza **só o sucesso**, e de propósito.
 *
 * Um "sim" é capacidade do aparelho e não muda no meio da festa. Um "não" pode
 * ser o arquivo, não o aparelho — a primeira foto truncada pela galeria
 * cacheada como "não decodifica" recusaria todas as HEIC seguintes daquele
 * convidado, que é uma foto perdida por noite virando trinta.
 */
export async function aparelhoDecodifica(bytes: Uint8Array, mime: string): Promise<boolean> {
  if (suporte.has(mime)) return true;

  const conseguiu = await tentarDecodificar(bytes, mime);
  if (conseguiu) suporte.add(mime);

  return conseguiu;
}

async function tentarDecodificar(bytes: Uint8Array, mime: string): Promise<boolean> {
  const criar = globalThis.createImageBitmap;
  if (typeof criar !== "function") return false;

  try {
    // Recorte de 1×1: a pergunta é se o decoder aceita o formato, e um bitmap
    // do tamanho da foto custaria memória no aparelho mais fraco da festa.
    const bitmap = await criar(new Blob([bytes as BufferSource], { type: mime }), 0, 0, 1, 1);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

export function esquecerSuporte(): void {
  suporte.clear();
}
