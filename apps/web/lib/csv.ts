/**
 * Serialização CSV compartilhada pelos exports do admin.
 *
 * BOM UTF-8 na frente do arquivo é obrigatório para o Excel reconhecer
 * acentuação sem pedir escolha manual de encoding na importação.
 */

const BOM = "﻿";

/** Escapa uma célula: aspas quando o valor contém vírgula, aspas ou quebra de linha. */
export function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Monta uma linha CSV a partir de células brutas, escapando cada uma. */
export function csvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvCell).join(",");
}

/** Junta linhas já montadas (csvRow) num arquivo CSV com BOM UTF-8 e CRLF. */
export function buildCsv(rows: string[]): string {
  return BOM + rows.join("\r\n") + "\r\n";
}
