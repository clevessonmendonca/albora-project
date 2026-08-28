/** Chave derivada no servidor — cliente nunca informa nem escolhe (nem no presign, nem no confirm). Centralizado aqui para evitar cópias divergentes. */
export function derivarChaveMidia(
  eventoId: string,
  uuid: string,
  variante: "full" | "thumb",
): string {
  const agora = new Date();
  const ano = agora.getUTCFullYear();
  const mes = String(agora.getUTCMonth() + 1).padStart(2, "0");
  return `events/${eventoId}/${ano}/${mes}/${uuid}/${variante}`;
}

/** Toda chave do produto começa aqui. Usado pelo guard de isolamento. */
export function prefixoDoEvento(eventoId: string): string {
  return `events/${eventoId}/`;
}

/** Imagem de capa do evento — uma por evento, chave fixa. */
export function derivarChaveImagemCapa(eventoId: string): string {
  return `events/${eventoId}/cover/image`;
}

export function chaveImagemCapaValida(eventoId: string, chave: string): boolean {
  if (!UUID_RE.test(eventoId)) return false;
  return chave === `events/${eventoId}/cover/image`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A rota de leitura do feed não assina o que mora aqui — separação intencional do recado dos anfitriões. */
export function derivarChaveRecado(eventoId: string, uuid: string): string {
  return `events/${eventoId}/recado/${uuid}`;
}

export function chaveRecadoValida(eventoId: string, chave: string): boolean {
  if (!UUID_RE.test(eventoId)) return false;
  const prefixo = `events/${eventoId}/recado/`;
  if (!chave.startsWith(prefixo)) return false;
  return UUID_RE.test(chave.slice(prefixo.length));
}

/** Deriva a chave `/thumb` a partir da `/full` já persistida. */
export function chaveThumbDeFull(chaveFull: string): string {
  if (chaveFull.endsWith("/full")) {
    return `${chaveFull.slice(0, -"/full".length)}/thumb`;
  }
  return `${chaveFull}/thumb`;
}

/** `export/` fica ao lado da mídia do convidado mas fora do conjunto que o feed assina — o lote de URLs recusa essa forma de propósito. */
export function derivarChaveExport(eventoId: string, jobId: string): string {
  return `events/${eventoId}/export/${jobId}.zip`;
}

export function chaveExportValida(eventoId: string, chave: string): boolean {
  if (!UUID_RE.test(eventoId)) return false;
  const prefixo = `events/${eventoId}/export/`;
  if (!chave.startsWith(prefixo) || !chave.endsWith(".zip")) return false;
  const jobId = chave.slice(prefixo.length, -".zip".length);
  return UUID_RE.test(jobId) && !jobId.includes("/");
}
