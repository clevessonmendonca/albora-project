import { ehVertical } from "../wall-display";
import type { Caixa, Dimensoes, ModeloDeMoldura, Recorte } from "./types";
import {
  ALTURA_DA_COMPOSICAO,
  ALTURA_DA_FAIXA,
  LARGURA_DA_COMPOSICAO,
  MARGEM,
  MAX_PERDA_LATERAL,
  MODELOS_DE_MOLDURA,
} from "./types";

const TOLERANCIA_PX = 0.5;

export function faixaDaMarca(): Caixa {
  return {
    x: 0,
    y: ALTURA_DA_COMPOSICAO - ALTURA_DA_FAIXA,
    largura: LARGURA_DA_COMPOSICAO,
    altura: ALTURA_DA_FAIXA,
  };
}

export function areaDaFoto(modelo: ModeloDeMoldura): Caixa {
  const teto = ALTURA_DA_COMPOSICAO - ALTURA_DA_FAIXA;

  if (modelo === "polaroide") {
    return {
      x: MARGEM,
      y: MARGEM,
      largura: LARGURA_DA_COMPOSICAO - 2 * MARGEM,
      altura: teto - 2 * MARGEM,
    };
  }

  return { x: 0, y: 0, largura: LARGURA_DA_COMPOSICAO, altura: teto };
}

function dimensoesValidas(d: Dimensoes): boolean {
  return (
    Number.isFinite(d.largura) &&
    Number.isFinite(d.altura) &&
    d.largura > 0 &&
    d.altura > 0
  );
}

function escalar(foto: Dimensoes, area: Caixa, fator: number): Caixa {
  const largura = foto.largura * fator;
  const altura = foto.altura * fator;
  return {
    x: area.x + (area.largura - largura) / 2,
    y: area.y + (area.altura - altura) / 2,
    largura,
    altura,
  };
}

export function encaixar(foto: Dimensoes, area: Caixa): Caixa {
  return escalar(foto, area, Math.min(area.largura / foto.largura, area.altura / foto.altura));
}

function cobrir(foto: Dimensoes, area: Caixa): Caixa {
  return escalar(foto, area, Math.max(area.largura / foto.largura, area.altura / foto.altura));
}

export function cobreSemPerderTopo(foto: Dimensoes, area: Dimensoes): boolean {
  if (!dimensoesValidas(foto) || !dimensoesValidas(area)) return false;

  const larguraDesenhada = (foto.largura * area.altura) / foto.altura;
  if (larguraDesenhada < area.largura) return false;

  return (larguraDesenhada - area.largura) / larguraDesenhada <= MAX_PERDA_LATERAL;
}

export function modelosDeMolduraPermitidos(foto: Dimensoes): ModeloDeMoldura[] {
  if (!dimensoesValidas(foto)) return [];
  return MODELOS_DE_MOLDURA.filter(
    (m) => m !== "cheia" || cobreSemPerderTopo(foto, areaDaFoto("cheia")),
  );
}

export function molduraCorta(modelo: ModeloDeMoldura, foto: Dimensoes): boolean {
  return !modelosDeMolduraPermitidos(foto).includes(modelo);
}

export function modeloRecomendado(foto: Dimensoes): ModeloDeMoldura {
  if (!molduraCorta("cheia", foto)) return "cheia";
  return ehVertical(foto) ? "ambiente" : "polaroide";
}

export function caixaDaFoto(modelo: ModeloDeMoldura, foto: Dimensoes): Caixa {
  const area = areaDaFoto(modelo);
  return modelo === "cheia" ? cobrir(foto, area) : encaixar(foto, area);
}

export function recorte(caixa: Caixa, area: Caixa): Recorte {
  return {
    topo: Math.max(0, area.y - caixa.y),
    base: Math.max(0, caixa.y + caixa.altura - (area.y + area.altura)),
    esquerda: Math.max(0, area.x - caixa.x),
    direita: Math.max(0, caixa.x + caixa.largura - (area.x + area.largura)),
  };
}

export function intersecta(a: Caixa, b: Caixa): boolean {
  return (
    a.x < b.x + b.largura - TOLERANCIA_PX &&
    b.x < a.x + a.largura - TOLERANCIA_PX &&
    a.y < b.y + b.altura - TOLERANCIA_PX &&
    b.y < a.y + a.altura - TOLERANCIA_PX
  );
}

export { TOLERANCIA_PX };
