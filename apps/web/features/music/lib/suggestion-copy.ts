import { TETO_DE_SUGESTOES_POR_SESSAO } from "@albora/core";

const PROVIDER_LABEL: Record<string, string> = {
  spotify: "Spotify",
  "youtube-music": "YouTube Music",
  youtube: "YouTube",
  "apple-music": "Apple Music",
  deezer: "Deezer",
};

const TYPE_LABEL: Record<string, string> = {
  faixa: "faixa",
  album: "álbum",
  playlist: "playlist",
};

export function providerLabel(provedor: string): string {
  return PROVIDER_LABEL[provedor] ?? provedor;
}

export function typeLabel(tipo: string): string {
  return TYPE_LABEL[tipo] ?? tipo;
}

export function suggestionMessage(
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
