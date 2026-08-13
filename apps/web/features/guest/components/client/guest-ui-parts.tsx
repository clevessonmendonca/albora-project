"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  BarraDeAbas as TabBarPreview,
  BarraDeStatus,
  BotaoFlutuante,
  Estrela,
  Etiqueta,
  IconeCamera,
  IconeComentario,
  IconeCompartilhar,
  IconeGrade,
  IconeMais,
  IconePessoa,
  IconePilha,
  IconeVoltar,
} from "@albora/ui-web";

/** Compat: a pílula legada mapeia para `Etiqueta`. */
export function Pilula({
  children,
  ativa,
  style,
}: {
  children: ReactNode;
  ativa?: boolean;
  style?: CSSProperties;
}) {
  const conteudo = <Etiqueta tom={ativa ? "acento" : "neutro"}>{children}</Etiqueta>;
  if (!style) return conteudo;
  return <span style={style}>{conteudo}</span>;
}

export {
  BarraDeStatus,
  BotaoFlutuante,
  Estrela,
  IconeCamera,
  IconeComentario,
  IconeCompartilhar,
  IconeGrade,
  IconeMais,
  IconePessoa,
  IconePilha,
  IconeVoltar,
  TabBarPreview,
};
