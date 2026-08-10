/**
 * O conteúdo de um QR é dado de terceiro.
 *
 * A placa fica seis horas numa mesa sem ninguém olhando, e um adesivo colado
 * por cima do original é ataque real. Por isso nada aqui devolve URL: o máximo
 * que sai é um slug já validado contra formato fechado, e quem navega monta o
 * caminho do próprio produto com ele. O host do QR nunca é destino.
 */

/** Minúscula, dígito e hífen entre blocos. Sem hífen na ponta, sem hífen duplo. */
const FORMATO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const TAMANHO_MINIMO = 2;
const TAMANHO_MAXIMO = 64;

/** Um QR guarda alguns milhares de caracteres. Nada legítimo chega perto. */
const LIMITE_CONTEUDO = 2048;

/** Marcas de acento na forma decomposta — `NFD` separa a letra do acento. */
const ACENTOS = /[\u0300-\u036f]/g;

export function slugValido(valor: string): boolean {
  return (
    valor.length >= TAMANHO_MINIMO &&
    valor.length <= TAMANHO_MAXIMO &&
    FORMATO.test(valor)
  );
}

/**
 * Extrai o slug do que veio do QR ou do que a pessoa digitou.
 *
 * Aceita URL completa, URL curta impressa (N1.4) e o código sozinho. Devolve
 * `null` para qualquer coisa que não passe no formato — nunca o conteúdo cru.
 */
export function extrairSlug(conteudo: string): string | null {
  const bruto = conteudo.trim();
  if (bruto.length === 0 || bruto.length > LIMITE_CONTEUDO) return null;

  const url = comoUrl(bruto);

  // `javascript:` e `data:` também são URL válida, e o que decide não é isto —
  // é o formato fechado lá embaixo. Recusar aqui só evita que um esquema
  // exótico chegue à extração de caminho parecendo legítimo.
  if (url !== null && url.protocol !== "https:" && url.protocol !== "http:") return null;

  const candidato = url === null ? bruto : segmentoDoEvento(url);
  if (candidato === null) return null;

  const slug = normalizar(candidato);
  return slugValido(slug) ? slug : null;
}

/** O único lugar que monta o destino. O slug entra já validado. */
export function caminhoDoEvento(slug: string): string {
  return `/e/${encodeURIComponent(slug)}`;
}

function comoUrl(bruto: string): URL | null {
  try {
    return new URL(bruto);
  } catch {
    // Pode ser a URL curta impressa sem esquema — `albora.com.br/anaejoao`.
  }

  if (!bruto.includes("/") && !bruto.includes(".")) return null;

  try {
    return new URL(`https://${bruto}`);
  } catch {
    return null;
  }
}

function segmentoDoEvento(url: URL): string | null {
  const partes = url.pathname.split("/").filter((p) => p.length > 0);
  const primeira = partes[0];
  if (primeira === undefined) return null;

  // `/e/{slug}` é a rota do produto; `/{slug}` é a URL curta que vai impressa
  // abaixo do QR. As duas existem no material, então as duas entram.
  const cru = primeira === "e" ? partes[1] : primeira;
  return cru === undefined ? null : decodificar(cru);
}

function decodificar(valor: string): string {
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

function normalizar(valor: string): string {
  return valor.trim().normalize("NFD").replace(ACENTOS, "").toLowerCase();
}
