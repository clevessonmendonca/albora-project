"use client";

import {
  AJUSTES_NEUTROS,
  NEUTRO,
  ordenarComRecomendado,
  saoNeutros,
  type FiltroAplicado,
  type Preset,
} from "@albora/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EditorCanvas } from "./editor-canvas";
import { EditorControls, EditorHeader, EditorStyles } from "./editor-controls";
import { carregarImagemEditor, type Escolha } from "./editor-lut";

export type { Escolha };

/**
 * O editor. A foto já foi tirada pela câmera nativa; aqui só se escolhe cor.
 *
 * Cada miniatura da tira mostra **a foto do próprio convidado**, não uma
 * amostra genérica: escolher filtro olhando a foto de outra pessoa é escolher
 * no escuro. E as miniaturas saem de uma redução de 150 px feita uma vez —
 * oito cópias do original travaram o aparelho no protótipo.
 *
 * Filtro e ajustes se alternam em duas abas porque a tira de oito miniaturas e
 * os quatro controles não cabem juntos na tela de um celular sem empurrar a
 * prévia para fora — e é a prévia que decide a escolha.
 */

type Aba = "filtros" | "ajustes";

export function Editor({
  arquivo,
  recomendadoId,
  onEnviar,
  onDescartar,
  missao,
}: {
  arquivo: File;
  recomendadoId: string | null;
  onEnviar: (filtro: FiltroAplicado | undefined) => void;
  onDescartar: () => void;
  missao?: { indice: number; total: number; title: string } | null;
}) {
  const [previa, setPrevia] = useState<ImageBitmap | null>(null);
  const [tiras, setTiras] = useState<Map<string, string>>(new Map());
  const [escolhido, setEscolhido] = useState<Preset | null>(null);
  const [intensidade, setIntensidade] = useState(1);
  const [ajustes, setAjustes] = useState(AJUSTES_NEUTROS);
  const [aba, setAba] = useState<Aba>("filtros");
  const [degradar, setDegradar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const presets = useMemo(() => ordenarComRecomendado(recomendadoId), [recomendadoId]);

  useEffect(() => {
    let vivo = true;
    let urls: string[] = [];

    (async () => {
      try {
        const resultado = await carregarImagemEditor(arquivo, presets);
        urls = resultado.urls;
        if (!vivo) return;
        setPrevia(resultado.previa);
        setTiras(resultado.tiras);
      } catch {
        setErro("Não consegui abrir essa foto. Tente outra.");
      }
    })();

    return () => {
      vivo = false;
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [arquivo, presets]);

  const handleDegradar = useCallback(() => setDegradar(true), []);

  function enviar() {
    const manuais = saoNeutros(ajustes) ? null : ajustes;

    if (!escolhido && !manuais) return onEnviar(undefined);

    onEnviar({
      ajustes: escolhido ? escolhido.ajustes : NEUTRO,
      porPixel: !!escolhido?.porPixel && !degradar,
      intensidade: escolhido ? intensidade : 0,
      ...(manuais ? { manuais } : {}),
    });
  }

  return (
    <div className="grid h-dvh grid-rows-[auto_1fr_auto] gap-3">
      <EditorStyles />

      <EditorHeader
        escolhido={escolhido}
        onDescartar={onDescartar}
        onSemFiltro={() => setEscolhido(null)}
      />

      <EditorCanvas
        previa={previa}
        escolhido={escolhido}
        intensidade={intensidade}
        degradar={degradar}
        ajustes={ajustes}
        erro={erro}
        missao={missao}
        onDegradar={handleDegradar}
      />

      <EditorControls
        aba={aba}
        onAba={setAba}
        ajustes={ajustes}
        onAjustes={setAjustes}
        escolhido={escolhido}
        onEscolhido={setEscolhido}
        intensidade={intensidade}
        onIntensidade={setIntensidade}
        presets={presets}
        recomendadoId={recomendadoId}
        tiras={tiras}
        previaPronta={!!previa}
        onEnviar={enviar}
      />
    </div>
  );
}
