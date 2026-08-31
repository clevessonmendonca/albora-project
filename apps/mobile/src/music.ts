import { apiOrigin, cookieHeader, type GuestSession } from "./session";

export type ModoInteracao = "espelho" | "completo";

export type FaixaDoCasal = {
  provedor: string;
  rotulo: string;
  url: string;
  capaUrl: string | null;
};

export type Sugestao = {
  id: string;
  provedor: string;
  tipo: string;
  url: string;
  votos: number;
  titulo: string | null;
  artista: string | null;
};

export type MusicaResult = {
  faixa: FaixaDoCasal | null;
  sugestoes: Sugestao[];
  interacao: ModoInteracao;
};

export type ErroSugestao =
  | { tipo: "rede" }
  | { tipo: "sessao" }
  | { tipo: "recusada"; code: string; mensagem: string };

export type ResultadoSugestao =
  | { ok: true; sugestoes: Sugestao[] }
  | { ok: false; erro: ErroSugestao };

function lerFaixa(value: unknown): FaixaDoCasal | null {
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  if (
    typeof m.provedor !== "string" ||
    typeof m.rotulo !== "string" ||
    typeof m.url !== "string"
  ) {
    return null;
  }
  return {
    provedor: m.provedor,
    rotulo: m.rotulo,
    url: m.url,
    capaUrl: typeof m.capaUrl === "string" ? m.capaUrl : null,
  };
}

function lerSugestoes(value: unknown): Sugestao[] {
  if (!Array.isArray(value)) return [];
  const out: Sugestao[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.provedor === "string" &&
      typeof item.tipo === "string" &&
      typeof item.url === "string"
    ) {
      out.push({
        id: item.id,
        provedor: item.provedor,
        tipo: item.tipo,
        url: item.url,
        votos: typeof item.votos === "number" ? item.votos : 0,
        titulo: typeof item.titulo === "string" ? item.titulo : null,
        artista: typeof item.artista === "string" ? item.artista : null,
      });
    }
  }
  return out;
}

export async function fetchMusica(
  session: GuestSession,
  fetchFn: typeof fetch = fetch,
): Promise<MusicaResult> {
  const url = new URL(`${apiOrigin()}/api/music`);
  url.searchParams.set("eventoId", session.eventoId);

  const res = await fetchFn(url.toString(), {
    headers: { cookie: cookieHeader(session.token) },
  });

  if (!res.ok) throw new Error(`music ${res.status}`);

  const data = (await res.json()) as Record<string, unknown>;
  const interacao: ModoInteracao =
    data.interacao === "completo" ? "completo" : "espelho";

  return {
    faixa: lerFaixa(data.musica),
    sugestoes: lerSugestoes(data.sugestoes),
    interacao,
  };
}

const MENSAGEM_ERRO: Record<string, string> = {
  "musica.interacao_fechada": "A interação ainda não abriu.",
  "musica.teto_de_sugestoes": "Você já atingiu o limite de sugestões.",
  "musica.provedor_fora_da_lista": "Link não aceito. Use Spotify, YouTube Music, Apple Music ou Deezer.",
  "musica.conteudo_nao_suportado": "Link não aceito. Use Spotify, YouTube Music, Apple Music ou Deezer.",
  "musica.identificador_invalido": "Link não aceito. Use Spotify, YouTube Music, Apple Music ou Deezer.",
  "musica.url_ilegivel": "Link não aceito. Use Spotify, YouTube Music, Apple Music ou Deezer.",
  "musica.esquema_recusado": "Link não aceito. Use Spotify, YouTube Music, Apple Music ou Deezer.",
  "musica.credenciais_na_url": "Link não aceito. Use Spotify, YouTube Music, Apple Music ou Deezer.",
  "musica.porta_recusada": "Link não aceito. Use Spotify, YouTube Music, Apple Music ou Deezer.",
  "validation_error": "Cole o link da faixa.",
  "limite.excedido": "Espere um instante e tente de novo.",
};

function mensagemErro(code: string): string {
  return MENSAGEM_ERRO[code] ?? "Não deu agora. Tente de novo.";
}

export async function sugerirMusica(
  session: GuestSession,
  url: string,
  fetchFn: typeof fetch = fetch,
): Promise<ResultadoSugestao> {
  let res: Response;
  try {
    res = await fetchFn(`${apiOrigin()}/api/music`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader(session.token),
      },
      body: JSON.stringify({ url, evento: session.eventoId }),
    });
  } catch {
    return { ok: false, erro: { tipo: "rede" } };
  }

  if (res.status === 401 || res.status === 403) {
    let body: Record<string, unknown> = {};
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      /* sem corpo */
    }
    const code = typeof body.code === "string" ? body.code : "";
    if (code === "musica.interacao_fechada" || res.status === 403) {
      const mensagem = mensagemErro(code || "musica.interacao_fechada");
      return { ok: false, erro: { tipo: "recusada", code: code || "musica.interacao_fechada", mensagem } };
    }
    return { ok: false, erro: { tipo: "sessao" } };
  }

  let body: Record<string, unknown>;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, erro: { tipo: "rede" } };
  }

  if (res.ok) {
    return { ok: true, sugestoes: lerSugestoes(body.sugestoes) };
  }

  const code = typeof body.code === "string" ? body.code : "erro.interno";
  if (code === "musica.evento_divergente") {
    return { ok: false, erro: { tipo: "sessao" } };
  }

  return {
    ok: false,
    erro: { tipo: "recusada", code, mensagem: mensagemErro(code) },
  };
}
