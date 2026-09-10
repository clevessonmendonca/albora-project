import { ehVertical } from "../wall-display";
import type { Caixa, Dimensoes, FormatoDaMoldura, ModeloDeMoldura, Recorte } from "./types";
import {
  DIMENSOES_DO_FORMATO,
  MAX_PERDA_LATERAL,
  MODELOS_DE_MOLDURA,
} from "./types";

const TOLERANCIA_PX = 0.5;

export function faixaDaMarca(formato: FormatoDaMoldura = "story"): Caixa {
  const dim = DIMENSOES_DO_FORMATO[formato];
  return {
    x: 0,
    y: dim.altura - dim.faixa,
    largura: dim.largura,
    altura: dim.faixa,
  };
}

export function areaDaFoto(modelo: ModeloDeMoldura, formato: FormatoDaMoldura = "story"): Caixa {
  const dim = DIMENSOES_DO_FORMATO[formato];
  const teto = dim.altura - dim.faixa;

  if (modelo === "polaroide") {
    return {
      x: dim.margem,
      y: dim.margem,
      largura: dim.largura - 2 * dim.margem,
      altura: teto - 2 * dim.margem,
    };
  }

  return { x: 0, y: 0, largura: dim.largura, altura: teto };
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

export function modelosDeMolduraPermitidos(
  foto: Dimensoes,
  formato: FormatoDaMoldura = "story",
): ModeloDeMoldura[] {
  if (!dimensoesValidas(foto)) return [];
  return MODELOS_DE_MOLDURA.filter(
    (m) => m !== "cheia" || cobreSemPerderTopo(foto, areaDaFoto("cheia", formato)),
  );
}

export function molduraCorta(
  modelo: ModeloDeMoldura,
  foto: Dimensoes,
  formato: FormatoDaMoldura = "story",
): boolean {
  return !modelosDeMolduraPermitidos(foto, formato).includes(modelo);
}

export function modeloRecomendado(
  foto: Dimensoes,
  formato: FormatoDaMoldura = "story",
): ModeloDeMoldura {
  if (!molduraCorta("cheia", foto, formato)) return "cheia";
  return ehVertical(foto) ? "ambiente" : "polaroide";
}

export function caixaDaFoto(
  modelo: ModeloDeMoldura,
  foto: Dimensoes,
  formato: FormatoDaMoldura = "story",
): Caixa {
  const area = areaDaFoto(modelo, formato);
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
