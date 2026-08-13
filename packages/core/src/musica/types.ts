export const PROVEDORES = [
  "spotify",
  "youtube-music",
  "youtube",
  "apple-music",
  "deezer",
] as const;

export type Provedor = (typeof PROVEDORES)[number];

export type TipoDeConteudo = "faixa" | "album" | "playlist";

export type ErroMusica =
  | { code: "musica.url_ilegivel"; details: Record<string, never> }
  | { code: "musica.esquema_recusado"; details: { esquema: string } }
  | { code: "musica.credenciais_na_url"; details: Record<string, never> }
  | { code: "musica.porta_recusada"; details: { porta: string } }
  | { code: "musica.provedor_fora_da_lista"; details: { host: string } }
  | { code: "musica.conteudo_nao_suportado"; details: { provedor: Provedor } }
  | { code: "musica.identificador_invalido"; details: { provedor: Provedor } }
  | { code: "musica.interacao_fechada"; details: Record<string, never> }
  | { code: "musica.teto_de_sugestoes"; details: { teto: number } }
  | { code: "musica.midia_com_audio"; details: { mime: string } }
  | { code: "musica.saida_nao_e_imagem"; details: { mime: string } }
  | { code: "musica.campo_fora_do_contrato"; details: { campo: string } };

export type LinkDeMusica = {
  provedor: Provedor;
  tipo: TipoDeConteudo;
  identificador: string;
  regiao: string | null;
  url: string;
};

export type ResultadoDeLink =
  | { ok: true; link: LinkDeMusica }
  | { ok: false; erro: ErroMusica };

export type MetadadoDaMusica = {
  titulo: string;
  artista: string | null;
  capaUrl: string | null;
};

export type ExibicaoDaMusica = {
  rotulo: string;
  url: string;
  capaUrl: string | null;
  resolvida: boolean;
};

export type MusicaDoEvento = {
  link: LinkDeMusica;
  metadado: MetadadoDaMusica | null;
};

export type SugestaoDeCompartilhamento = {
  provedor: Provedor;
  rotulo: string;
  url: string;
};

export const CAMPOS_DA_SUGESTAO = ["provedor", "rotulo", "url"] as const;

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

export type FaixaSugerida = {
  chave: string;
  link: LinkDeMusica;
  sessoes: readonly string[];
  primeiroEm: number;
};

export type ResultadoDaSugestao =
  | { ok: true; fila: FaixaSugerida[] }
  | { ok: false; erro: ErroMusica };

export const TETO_DE_SUGESTOES_POR_SESSAO = 3;
