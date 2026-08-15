import { TETO_DE_SUGESTOES_POR_SESSAO } from "@albora/core";

const ROTULO_PROVEDOR: Record<string, string> = {
  spotify: "Spotify",
  "youtube-music": "YouTube Music",
  youtube: "YouTube",
  "apple-music": "Apple Music",
  deezer: "Deezer",
};

const ROTULO_TIPO: Record<string, string> = {
  faixa: "faixa",
  album: "álbum",
  playlist: "playlist",
};

export function rotuloDoProvedor(provedor: string): string {
  return ROTULO_PROVEDOR[provedor] ?? provedor;
}

export function rotuloDoTipo(tipo: string): string {
  return ROTULO_TIPO[tipo] ?? tipo;
}

export function mensagemDaSugestao(
  code: string,
  details?: Record<string, unknown>,
): string {
  if (code === "musica.teto_de_sugestoes") {
    const teto =
      typeof details?.teto === "number" ? details.teto : TETO_DE_SUGESTOES_POR_SESSAO;
    return `Você já sugeriu ${teto} faixas. Pode votar nas que já estão na lista.`;
  }

  switch (code) {
    case "musica.interacao_fechada":
      return "A interação ainda não abriu";
    case "musica.provedor_fora_da_lista":
    case "musica.conteudo_nao_suportado":
    case "musica.identificador_invalido":
    case "musica.url_ilegivel":
    case "musica.esquema_recusado":
    case "musica.credenciais_na_url":
    case "musica.porta_recusada":
      return "Link não aceito. Use Spotify, YouTube Music, Apple Music ou Deezer.";
    case "validation_error":
      return "Cole o link da faixa";
    case "limite.excedido":
      return "Espere um instante e tente de novo.";
    default:
      return "Não deu agora. Tente de novo.";
  }
}
