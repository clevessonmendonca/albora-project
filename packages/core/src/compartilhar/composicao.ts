import { autorizarCompartilhamento } from "./autorizacao";
import { conteudoDaMoldura } from "./conteudo";
import {
  areaDaFoto,
  caixaDaFoto,
  faixaDaMarca,
  intersecta,
  molduraCorta,
  recorte,
  TOLERANCIA_PX,
} from "./moldura";
import type {
  Caixa,
  Composicao,
  EntradaDaComposicao,
  ProblemaDaComposicao,
  ResultadoDaComposicao,
} from "./types";
import {
  ALTURA_DA_COMPOSICAO,
  ESPACO_DA_COLAGEM,
  LARGURA_DA_COMPOSICAO,
  MAX_DA_COLAGEM,
} from "./types";

export function compor(entrada: EntradaDaComposicao): ResultadoDaComposicao {
  const { midia, sessao, evento, identidade, modelo, agora } = entrada;

  const autorizacao = autorizarCompartilhamento(midia, sessao, evento, agora);
  if (!autorizacao.pode) {
    return {
      autorizada: false,
      codigo: autorizacao.codigo,
      motivoDaModeracao: autorizacao.motivoDaModeracao,
      composicao: null,
    };
  }

  if (molduraCorta(modelo, midia)) {
    return {
      autorizada: false,
      codigo: "compartilhar.modelo_corta_a_foto",
      motivoDaModeracao: null,
      composicao: null,
    };
  }

  return {
    autorizada: true,
    codigo: "compartilhar.autorizado",
    composicao: {
      largura: LARGURA_DA_COMPOSICAO,
      altura: ALTURA_DA_COMPOSICAO,
      modelo,
      area: areaDaFoto(modelo),
      foto: caixaDaFoto(modelo, midia),
      faixa: faixaDaMarca(),
      conteudo: conteudoDaMoldura(identidade, midia, sessao, agora),
    },
  };
}

export function problemasDaComposicao(composicao: Composicao): ProblemaDaComposicao[] {
  const problemas: ProblemaDaComposicao[] = [];
  const perdido = recorte(composicao.foto, composicao.area);

  if (perdido.topo > TOLERANCIA_PX) problemas.push("recorte.topo");
  if (perdido.base > TOLERANCIA_PX) problemas.push("recorte.base");

  if (
    composicao.modelo !== "cheia" &&
    (perdido.esquerda > TOLERANCIA_PX || perdido.direita > TOLERANCIA_PX)
  ) {
    problemas.push("recorte.lateral");
  }

  if (intersecta(composicao.foto, composicao.faixa)) problemas.push("marca.sobre_a_foto");

  return problemas;
}

export function celulasDaColagem(quantidade: number): Caixa[] {
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > MAX_DA_COLAGEM) {
    return [];
  }

  const area = areaDaFoto("ambiente");
  const colunas = quantidade === 4 ? 2 : 1;
  const linhas = Math.ceil(quantidade / colunas);
  const largura = (area.largura - ESPACO_DA_COLAGEM * (colunas - 1)) / colunas;
  const altura = (area.altura - ESPACO_DA_COLAGEM * (linhas - 1)) / linhas;

  const celulas: Caixa[] = [];
  for (let i = 0; i < quantidade; i += 1) {
    celulas.push({
      x: area.x + (i % colunas) * (largura + ESPACO_DA_COLAGEM),
      y: area.y + Math.floor(i / colunas) * (altura + ESPACO_DA_COLAGEM),
      largura,
      altura,
    });
  }

  return celulas;
}
