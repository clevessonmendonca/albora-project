import { modoInteracao, type GateDeInteracao } from "./interacao";
import { tipoAceito } from "./midia";

/**
 * A música do evento (spec 018), na camada 1 do ADR 0011: **link e texto**.
 *
 * Guardar a faixa escolhida e exibi-la é metadado e hiperlink — não há áudio
 * nosso, não há obra derivada, não há licença envolvida. Embutir a música na
 * mídia compartilhada é a camada 3, e ela exige direito de sincronização que
 * ninguém neste fluxo tem. A fronteira não é um parágrafo no ADR: é
 * `validarSaidaDeCompartilhamento`, no caminho.
 *
 * Nada aqui toca rede. Resolver título e capa é enriquecimento e mora fora
 * deste módulo; sem metadado, `exibirMusica` cai para o link cru.
 */

/**
 * Conjunto fechado. Um provedor entra quando cumpre as três: base real no
 * Brasil, URL pública de compartilhamento que abre sem login, e identificador
 * no próprio caminho da URL.
 *
 * A terceira é a que exclui encurtador (`spotify.link`, `deezer.page.link`):
 * extrair a faixa dali exigiria seguir redirecionamento, e seguir
 * redirecionamento é transformar o link colado no admin em requisição de
 * saída para host que quem colou escolhe.
 */
export const PROVEDORES = [
  "spotify",
  "youtube-music",
  "youtube",
  "apple-music",
  "deezer",
] as const;

export type Provedor = (typeof PROVEDORES)[number];

export type TipoDeConteudo = "faixa" | "album" | "playlist";

/**
 * `Map`, e não objeto literal, nas três tabelas de consulta deste arquivo.
 *
 * `{}[chave]` responde para `constructor`, `__proto__` e `toString` com algo
 * herdado do protótipo — e o tipo `Record<string, T>` esconde isso, porque em
 * tempo de compilação o retorno já parece um `T`. Host chamado `constructor`
 * viraria provedor aceito.
 */
const HOSTS: ReadonlyMap<string, Provedor> = new Map([
  ["open.spotify.com", "spotify"],
  ["music.youtube.com", "youtube-music"],
  ["www.youtube.com", "youtube"],
  ["youtube.com", "youtube"],
  ["m.youtube.com", "youtube"],
  ["youtu.be", "youtube"],
  ["music.apple.com", "apple-music"],
  ["www.deezer.com", "deezer"],
  ["deezer.com", "deezer"],
] as const);

export const HOSTS_ACEITOS: readonly string[] = [...HOSTS.keys()];

export type ErroMusica =
  | { code: "musica.url_ilegivel"; details: Record<string, never> }
  | { code: "musica.esquema_recusado"; details: { esquema: string } }
  | { code: "musica.credenciais_na_url"; details: Record<string, never> }
  | { code: "musica.porta_recusada"; details: { porta: string } }
  | { code: "musica.provedor_fora_da_lista"; details: { host: string } }
  | { code: "musica.conteudo_nao_suportado"; details: { provedor: Provedor } }
  | { code: "musica.identificador_invalido"; details: { provedor: Provedor } }
  | { code: "musica.interacao_fechada"; details: Record<string, never> }
  | { code: "musica.midia_com_audio"; details: { mime: string } }
  | { code: "musica.saida_nao_e_imagem"; details: { mime: string } }
  | { code: "musica.campo_fora_do_contrato"; details: { campo: string } };

export type LinkDeMusica = {
  provedor: Provedor;
  tipo: TipoDeConteudo;
  identificador: string;
  /** Região do catálogo quando o provedor a exige na URL; `null` quando não. */
  regiao: string | null;
  /**
   * Recomposta a partir do identificador — **nunca** a string colada. O que
   * volta não carrega parâmetro de rastreamento, fragmento, nem nada que quem
   * colou tenha pendurado na query e 150 convidados vão abrir.
   */
  url: string;
};

export type ResultadoDeLink =
  | { ok: true; link: LinkDeMusica }
  | { ok: false; erro: ErroMusica };

function recusar(erro: ErroMusica): ResultadoDeLink {
  return { ok: false, erro };
}

function aceitar(link: LinkDeMusica): ResultadoDeLink {
  return { ok: true, link };
}

/**
 * Segmentos do caminho, **sem decodificar**.
 *
 * `decodeURIComponent` aqui reabriria `%2e%2e%2f` e `%00` depois de o `URL`
 * já ter normalizado o caminho. Os identificadores são validados por conjunto
 * de caracteres que não inclui `%`, então percent-encoding não passa — é a
 * recusa que se quer, não um caso a tratar.
 */
function segmentos(url: URL): string[] {
  return url.pathname.split("/").filter((s) => s !== "");
}

const ID_SPOTIFY = /^[A-Za-z0-9]{22}$/;
const ID_VIDEO = /^[A-Za-z0-9_-]{11}$/;
const ID_LISTA = /^[A-Za-z0-9_-]{2,64}$/;
const ID_NUMERICO = /^[0-9]{1,12}$/;
const ID_PLAYLIST_APPLE = /^pl\.[A-Za-z0-9-]{1,64}$/;
const REGIAO = /^[a-z]{2}$/;

const TIPO_SPOTIFY: ReadonlyMap<string, TipoDeConteudo> = new Map([
  ["track", "faixa"],
  ["album", "album"],
  ["playlist", "playlist"],
] as const);

const TIPO_DEEZER: ReadonlyMap<string, TipoDeConteudo> = new Map([
  ["track", "faixa"],
  ["album", "album"],
  ["playlist", "playlist"],
] as const);

function lerSpotify(url: URL): ResultadoDeLink {
  const partes = segmentos(url);
  const semIdioma = partes[0]?.startsWith("intl-") === true ? partes.slice(1) : partes;
  const [rotulo, id] = semIdioma;

  const tipo = rotulo === undefined ? undefined : TIPO_SPOTIFY.get(rotulo);
  if (rotulo === undefined || tipo === undefined) {
    return recusar({ code: "musica.conteudo_nao_suportado", details: { provedor: "spotify" } });
  }
  if (id === undefined || !ID_SPOTIFY.test(id)) {
    return recusar({ code: "musica.identificador_invalido", details: { provedor: "spotify" } });
  }

  return aceitar({
    provedor: "spotify",
    tipo,
    identificador: id,
    regiao: null,
    url: `https://open.spotify.com/${rotulo}/${id}`,
  });
}

function lerYoutube(url: URL, provedor: "youtube" | "youtube-music"): ResultadoDeLink {
  const base = provedor === "youtube" ? "https://www.youtube.com" : "https://music.youtube.com";
  const partes = segmentos(url);

  if (url.hostname.toLowerCase() === "youtu.be") {
    const id = partes[0];
    if (partes.length !== 1 || id === undefined || !ID_VIDEO.test(id)) {
      return recusar({ code: "musica.identificador_invalido", details: { provedor } });
    }
    return aceitar({
      provedor,
      tipo: "faixa",
      identificador: id,
      regiao: null,
      url: `${base}/watch?v=${id}`,
    });
  }

  const rotulo = partes[0];

  // `?v=` ganha de `?list=`: quem compartilhou estava ouvindo uma faixa dentro
  // de uma lista, e o que ele escolheu foi a faixa.
  if (rotulo === "watch" && partes.length === 1) {
    const id = url.searchParams.get("v");
    if (id === null || !ID_VIDEO.test(id)) {
      return recusar({ code: "musica.identificador_invalido", details: { provedor } });
    }
    return aceitar({
      provedor,
      tipo: "faixa",
      identificador: id,
      regiao: null,
      url: `${base}/watch?v=${id}`,
    });
  }

  if (rotulo === "playlist" && partes.length === 1) {
    const id = url.searchParams.get("list");
    if (id === null || !ID_LISTA.test(id)) {
      return recusar({ code: "musica.identificador_invalido", details: { provedor } });
    }
    return aceitar({
      provedor,
      tipo: "playlist",
      identificador: id,
      regiao: null,
      url: `${base}/playlist?list=${id}`,
    });
  }

  return recusar({ code: "musica.conteudo_nao_suportado", details: { provedor } });
}

function lerAppleMusic(url: URL): ResultadoDeLink {
  const partes = segmentos(url);
  const [regiao, rotulo, ...resto] = partes;

  if (regiao === undefined || !REGIAO.test(regiao) || rotulo === undefined) {
    return recusar({ code: "musica.conteudo_nao_suportado", details: { provedor: "apple-music" } });
  }
  if (rotulo !== "album" && rotulo !== "song" && rotulo !== "playlist") {
    return recusar({ code: "musica.conteudo_nao_suportado", details: { provedor: "apple-music" } });
  }

  const id = resto[resto.length - 1];
  if (id === undefined) {
    return recusar({ code: "musica.identificador_invalido", details: { provedor: "apple-music" } });
  }

  if (rotulo === "playlist") {
    if (!ID_PLAYLIST_APPLE.test(id)) {
      return recusar({
        code: "musica.identificador_invalido",
        details: { provedor: "apple-music" },
      });
    }
    return aceitar({
      provedor: "apple-music",
      tipo: "playlist",
      identificador: id,
      regiao,
      url: `https://music.apple.com/${regiao}/playlist/${id}`,
    });
  }

  // Faixa dentro de álbum: o id da faixa vem em `?i=`, e é ele que identifica
  // o que o anfitrião escolheu — o id do caminho é o do álbum inteiro.
  const faixa = url.searchParams.get("i");
  if (rotulo === "album" && faixa !== null) {
    if (!ID_NUMERICO.test(faixa)) {
      return recusar({
        code: "musica.identificador_invalido",
        details: { provedor: "apple-music" },
      });
    }
    return aceitar({
      provedor: "apple-music",
      tipo: "faixa",
      identificador: faixa,
      regiao,
      url: `https://music.apple.com/${regiao}/song/${faixa}`,
    });
  }

  if (!ID_NUMERICO.test(id)) {
    return recusar({ code: "musica.identificador_invalido", details: { provedor: "apple-music" } });
  }

  return aceitar({
    provedor: "apple-music",
    tipo: rotulo === "song" ? "faixa" : "album",
    identificador: id,
    regiao,
    url: `https://music.apple.com/${regiao}/${rotulo}/${id}`,
  });
}

function lerDeezer(url: URL): ResultadoDeLink {
  const partes = segmentos(url);
  const primeiro = partes[0];
  const semRegiao =
    primeiro !== undefined && REGIAO.test(primeiro) ? partes.slice(1) : partes;
  const [rotulo, id] = semRegiao;

  const tipo = rotulo === undefined ? undefined : TIPO_DEEZER.get(rotulo);
  if (rotulo === undefined || tipo === undefined) {
    return recusar({ code: "musica.conteudo_nao_suportado", details: { provedor: "deezer" } });
  }
  if (id === undefined || !ID_NUMERICO.test(id)) {
    return recusar({ code: "musica.identificador_invalido", details: { provedor: "deezer" } });
  }

  return aceitar({
    provedor: "deezer",
    tipo,
    identificador: id,
    regiao: null,
    url: `https://www.deezer.com/${rotulo}/${id}`,
  });
}

/**
 * Lê o link colado no admin. Falha fechada: host fora da lista é recusado com
 * motivo, nunca salvo para quebrar depois.
 *
 * Nada é executado, nada é buscado e nenhum redirecionamento é seguido — o
 * identificador sai do caminho da própria URL ou não sai.
 */
export function lerLinkDeMusica(colado: string): ResultadoDeLink {
  let url: URL;
  try {
    url = new URL(colado.trim());
  } catch {
    return recusar({ code: "musica.url_ilegivel", details: {} });
  }

  if (url.protocol !== "https:") {
    return recusar({ code: "musica.esquema_recusado", details: { esquema: url.protocol } });
  }
  // `https://open.spotify.com@evil.com/x` tem host `evil.com` e parece o
  // contrário para quem lê. A comparação de host já recusa; isto recusa antes,
  // com motivo que o admin consegue mostrar.
  if (url.username !== "" || url.password !== "") {
    return recusar({ code: "musica.credenciais_na_url", details: {} });
  }
  if (url.port !== "") {
    return recusar({ code: "musica.porta_recusada", details: { porta: url.port } });
  }

  const host = url.hostname.toLowerCase();
  const provedor = HOSTS.get(host);
  if (provedor === undefined) {
    return recusar({ code: "musica.provedor_fora_da_lista", details: { host } });
  }

  switch (provedor) {
    case "spotify":
      return lerSpotify(url);
    case "youtube":
    case "youtube-music":
      return lerYoutube(url, provedor);
    case "apple-music":
      return lerAppleMusic(url);
    case "deezer":
      return lerDeezer(url);
  }
}

/* ── exibição ───────────────────────────────────────────────────────── */

export type MetadadoDaMusica = {
  titulo: string;
  artista: string | null;
  capaUrl: string | null;
};

export type ExibicaoDaMusica = {
  rotulo: string;
  url: string;
  capaUrl: string | null;
  /** `false` quando o metadado não veio e a exibição caiu para o link cru. */
  resolvida: boolean;
};

function capaSegura(capaUrl: string | null): string | null {
  if (capaUrl === null) return null;
  try {
    return new URL(capaUrl).protocol === "https:" ? capaUrl : null;
  } catch {
    return null;
  }
}

/**
 * O que telão, confirmação e álbum desenham.
 *
 * O metadado é enriquecimento: provedor fora do ar não segura salvamento nem
 * carregamento, e a exibição degrada para o link cru. Devolve rótulo sem
 * prosa — a frase em volta é do pack, nunca do núcleo.
 */
export function exibirMusica(
  link: LinkDeMusica,
  metadado: MetadadoDaMusica | null,
): ExibicaoDaMusica {
  const titulo = metadado?.titulo.trim() ?? "";
  if (titulo === "") {
    return { rotulo: link.url, url: link.url, capaUrl: null, resolvida: false };
  }

  const artista = metadado?.artista?.trim() ?? "";
  return {
    rotulo: artista === "" ? titulo : `${titulo} — ${artista}`,
    url: link.url,
    capaUrl: capaSegura(metadado?.capaUrl ?? null),
    resolvida: true,
  };
}

/* ── compartilhamento ───────────────────────────────────────────────── */

export type MusicaDoEvento = {
  link: LinkDeMusica;
  metadado: MetadadoDaMusica | null;
};

export type SugestaoDeCompartilhamento = {
  provedor: Provedor;
  rotulo: string;
  url: string;
};

/**
 * O contrato inteiro do que sai no compartilhamento: de onde é, o que é, e
 * para onde aponta. Não há e não haverá campo de bytes aqui — quem oferece
 * adicionar a música é a plataforma de destino, que tem licença para isso.
 */
export const CAMPOS_DA_SUGESTAO = ["provedor", "rotulo", "url"] as const;

export function montarSugestaoDeCompartilhamento(
  musica: MusicaDoEvento | null,
): SugestaoDeCompartilhamento | null {
  if (musica === null) return null;

  const exibicao = exibirMusica(musica.link, musica.metadado);
  return {
    provedor: musica.link.provedor,
    rotulo: exibicao.rotulo,
    url: exibicao.url,
  };
}

/**
 * A fronteira do ADR 0011, em forma que um teste consegue apontar.
 *
 * A camada 3 — vídeo com a foto do convidado e a música embutida — é obra
 * derivada com sincronização, e sincronização exige direito que não temos.
 * O que separa a camada 2 da 3 é uma frase só: **nós nunca produzimos arquivo
 * que contenha áudio de terceiro.**
 */
export const FRONTEIRA_ADR_0011 = {
  adr: "0011",
  camadaProibida: "audio-embutido-na-midia",
  produzArquivoComAudio: false,
  saidaPermitida: ["imagem", "texto", "link"],
} as const;

export type SaidaDeCompartilhamento = {
  mime: string;
  musica: SugestaoDeCompartilhamento | null;
};

/**
 * Recusa qualquer saída de compartilhamento que não seja imagem mais texto e
 * link. É a verificação 7 da spec 018 rodando no caminho, e não na revisão.
 *
 * O portão é o conjunto fechado de `midia.ts`: o que não está lá não sai. A
 * checagem de `audio/` e `video/` antes dele só existe para nomear o defeito
 * — remover essa linha não afrouxa nada.
 */
export function validarSaidaDeCompartilhamento(saida: SaidaDeCompartilhamento): ErroMusica | null {
  if (/^(audio|video)\//i.test(saida.mime)) {
    return { code: "musica.midia_com_audio", details: { mime: saida.mime } };
  }
  if (!tipoAceito(saida.mime)) {
    return { code: "musica.saida_nao_e_imagem", details: { mime: saida.mime } };
  }
  if (saida.musica === null) return null;

  for (const campo of Object.keys(saida.musica)) {
    if (!(CAMPOS_DA_SUGESTAO as readonly string[]).includes(campo)) {
      return { code: "musica.campo_fora_do_contrato", details: { campo } };
    }
  }
  return null;
}

/* ── sugestão do convidado ──────────────────────────────────────────── */

export type FaixaSugerida = {
  chave: string;
  link: LinkDeMusica;
  /** Ids opacos de sessão. Nunca nome. O tamanho é a contagem de votos. */
  sessoes: readonly string[];
  /** Instante da primeira sugestão. Desempate estável na ordenação. */
  primeiroEm: number;
};

export function chaveDaFaixa(link: LinkDeMusica): string {
  return `${link.provedor}:${link.tipo}:${link.identificador}`;
}

export function votos(faixa: FaixaSugerida): number {
  return faixa.sessoes.length;
}

export function podeSugerir(evento: GateDeInteracao, agora: Date): boolean {
  return modoInteracao(evento, agora) === "completo";
}

export type ResultadoDaSugestao =
  | { ok: true; fila: FaixaSugerida[] }
  | { ok: false; erro: ErroMusica };

/**
 * Enfileira a sugestão de um convidado, deduplicando por faixa.
 *
 * A mesma faixa vinda de dez pessoas é uma linha com dez votos: dez linhas
 * iguais transformariam a lista num lugar onde o repetido afunda o resto. A
 * mesma sessão sugerindo duas vezes continua valendo um — idempotente por
 * `(chave, sessaoId)`, pelo mesmo motivo da reação em `galeria.ts`.
 *
 * Passa pelo gate do ADR 0009: quem decide quando a interação abre são os
 * anfitriões, e gate fechado (`interacaoAbreEm === null`) recusa.
 */
export function registrarSugestao(
  fila: readonly FaixaSugerida[],
  sugestao: { sessaoId: string; link: LinkDeMusica },
  evento: GateDeInteracao,
  agora: Date,
): ResultadoDaSugestao {
  if (!podeSugerir(evento, agora)) {
    return { ok: false, erro: { code: "musica.interacao_fechada", details: {} } };
  }

  const chave = chaveDaFaixa(sugestao.link);
  const existente = fila.find((f) => f.chave === chave);

  if (existente === undefined) {
    return {
      ok: true,
      fila: [
        ...fila,
        {
          chave,
          link: sugestao.link,
          sessoes: [sugestao.sessaoId],
          primeiroEm: agora.getTime(),
        },
      ],
    };
  }

  if (existente.sessoes.includes(sugestao.sessaoId)) {
    return { ok: true, fila: [...fila] };
  }

  return {
    ok: true,
    fila: fila.map((f) =>
      f.chave === chave ? { ...f, sessoes: [...f.sessoes, sugestao.sessaoId] } : f,
    ),
  };
}

/**
 * Mais votada primeiro; empate pela que chegou antes.
 *
 * O desempate por chegada é o que impede a lista de se reordenar sozinha entre
 * dois desenhos com os mesmos dados — no telão isso apareceria como linha
 * pulando de lugar sem ninguém ter votado.
 */
export function ordenarSugestoes(fila: readonly FaixaSugerida[]): FaixaSugerida[] {
  return [...fila].sort((a, b) => votos(b) - votos(a) || a.primeiroEm - b.primeiroEm);
}
