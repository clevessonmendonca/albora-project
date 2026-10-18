// Substitui pdf-lib no build enxuto do Worker (CF_SEM_PDF=1): a geração de PDF fica desligada nesse ambiente.
function indisponivel(): never {
  throw new Error("pdf.indisponivel_neste_ambiente");
}

export const PDFDocument = { create: indisponivel, load: indisponivel };
export const rgb = indisponivel;
