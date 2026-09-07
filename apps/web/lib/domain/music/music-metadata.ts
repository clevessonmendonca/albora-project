import { HOSTS_ACEITOS, type LinkDeMusica, type MetadadoDaMusica } from "@albora/core";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export const TETO_DE_METADADO_MS = 2_500;
const TETO_DE_BYTES = 128_000;
const MAX_SALTOS = 3;
const TETO_TEXTO = 200;
const UA = "Albora/1.0 (metadata)";

export type PedidoDeMetadado = {
  formato: "oembed" | "og";
  url: string;
};

/** Só https nos hosts de `HOSTS_ACEITOS`. Redirect fora da lista não é seguido. */
export function hostPermitido(url: URL): boolean {
  return (
    url.protocol === "https:" &&
    url.username === "" &&
    url.password === "" &&
    url.port === "" &&
    (HOSTS_ACEITOS as readonly string[]).includes(url.hostname.toLowerCase())
  );
}

export function pedidoDeMetadado(link: LinkDeMusica): PedidoDeMetadado | null {
  let origem: URL;
  try {
    origem = new URL(link.url);
  } catch {
    return null;
  }
  if (!hostPermitido(origem)) return null;

  let raw: string;
  let formato: PedidoDeMetadado["formato"];

  switch (link.provedor) {
    case "spotify":
      raw = `https://open.spotify.com/oembed?url=${encodeURIComponent(origem.href)}`;
      formato = "oembed";
      break;
    case "youtube":
    case "youtube-music":
      raw = `https://www.youtube.com/oembed?url=${encodeURIComponent(origem.href)}&format=json`;
      formato = "oembed";
      break;
    case "apple-music":
    case "deezer":
      raw = origem.href;
      formato = "og";
      break;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!hostPermitido(url)) return null;
  return { formato, url: url.href };
}

export function destinoDoRedirect(origem: string, location: string): string | null {
  try {
    const next = new URL(location, origem);
    return hostPermitido(next) ? next.href : null;
  } catch {
    return null;
  }
}

function textoCurto(valor: string): string {
  return valor.replace(/\s+/g, " ").trim().slice(0, TETO_TEXTO);
}

export function lerOEmbed(corpo: unknown): MetadadoDaMusica | null {
  if (!corpo || typeof corpo !== "object") return null;
  const rec = corpo as { title?: unknown; author_name?: unknown };
  if (typeof rec.title !== "string") return null;
  const titulo = textoCurto(rec.title);
  if (titulo === "") return null;
  const artistaBruto = typeof rec.author_name === "string" ? textoCurto(rec.author_name) : "";
  return { titulo, artista: artistaBruto === "" ? null : artistaBruto, capaUrl: null };
}

function decodificarEntidade(bruto: string): string {
  return bruto
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function conteudoMeta(html: string, chave: string): string | null {
  const prop = chave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const a = new RegExp(
    `<meta\\s+[^>]*?(?:property|name)=["']${prop}["'][^>]*?content=["']([^"']*)["'][^>]*?>`,
    "i",
  );
  const b = new RegExp(
    `<meta\\s+[^>]*?content=["']([^"']*)["'][^>]*?(?:property|name)=["']${prop}["'][^>]*?>`,
    "i",
  );
  const bruto = a.exec(html)?.[1] ?? b.exec(html)?.[1];
  if (bruto === undefined) return null;
  const texto = textoCurto(decodificarEntidade(bruto));
  return texto === "" ? null : texto;
}

export function lerOpenGraph(html: string): MetadadoDaMusica | null {
  const titulo = conteudoMeta(html, "og:title") ?? conteudoMeta(html, "twitter:title");
  if (titulo === null) return null;
  const artista =
    conteudoMeta(html, "og:audio:artist") ??
    conteudoMeta(html, "music:musician") ??
    conteudoMeta(html, "twitter:audio:artist");
  return { titulo, artista, capaUrl: null };
}

async function lerCorpo(res: Response): Promise<string | null> {
  const declarado = Number(res.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > TETO_DE_BYTES) return null;
  const buf = await res.arrayBuffer();
  if (buf.byteLength > TETO_DE_BYTES) return null;
  return new TextDecoder("utf-8").decode(buf);
}

async function baixarPermitido(
  inicial: string,
  fetchImpl: FetchLike,
  signal: AbortSignal,
): Promise<string | null> {
  let atual = inicial;
  for (let salto = 0; salto < MAX_SALTOS; salto++) {
    let url: URL;
    try {
      url = new URL(atual);
    } catch {
      return null;
    }
    if (!hostPermitido(url)) return null;

    const res = await fetchImpl(atual, {
      method: "GET",
      redirect: "manual",
      credentials: "omit",
      signal,
      headers: {
        accept: "application/json, text/html;q=0.9, */*;q=0.1",
        "user-agent": UA,
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (location === null || location === "") return null;
      const proximo = destinoDoRedirect(atual, location);
      if (proximo === null) return null;
      atual = proximo;
      continue;
    }

    if (!res.ok) return null;
    return lerCorpo(res);
  }
  return null;
}

export async function buscarMetadadoDaMusica(
  link: LinkDeMusica,
  opts?: { fetch?: FetchLike; tetoMs?: number },
): Promise<MetadadoDaMusica | null> {
  const pedido = pedidoDeMetadado(link);
  if (!pedido) return null;

  const fetchImpl = opts?.fetch ?? fetch;
  const tetoMs = opts?.tetoMs ?? TETO_DE_METADADO_MS;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), tetoMs);

  try {
    const texto = await baixarPermitido(pedido.url, fetchImpl, ac.signal);
    if (texto === null) return null;
    if (pedido.formato === "oembed") {
      try {
        return lerOEmbed(JSON.parse(texto) as unknown);
      } catch {
        return null;
      }
    }
    return lerOpenGraph(texto);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
