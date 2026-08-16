/**
 * A chave de storage é derivada no servidor. Sempre.
 *
 * O cliente nunca informa e nunca escolhe — nem no presign, nem no confirm
 * (ADR 0002, ADR 0004). Está aqui em vez de dentro da rota porque a rota é
 * camada fina de transporte: se a derivação morar lá, a segunda rota que
 * precisar dela vai copiar, e a cópia vai divergir.
 */
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Áudio do recado dos anfitriões (spec 019). Conjunto fechado, separado da
 * foto do convidado: a rota de leitura do feed não assina o que mora aqui.
 */
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

/**
 * ZIP do acervo (spec 016). Mora ao lado da mídia do convidado, mas fora do
 * conjunto que a rota de leitura do feed assina — `export/` não é `full` nem
 * `thumb`, e o lote de URLs do convidado recusa essa forma de propósito.
 */
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
