import { tipoAceito } from "../midia";
import { exibirMusica } from "./exibicao";
import { CAMPOS_DA_SUGESTAO } from "./types";
import type { ErroMusica, MusicaDoEvento, SaidaDeCompartilhamento, SugestaoDeCompartilhamento } from "./types";

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
