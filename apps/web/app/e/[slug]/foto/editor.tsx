"use client";

import {
  aplicarIntensidade,
  aplicarPorPixel,
  ordenarComRecomendado,
  paraFiltroCss,
  TETO_POR_PIXEL_MS,
  type FiltroAplicado,
  type Preset,
} from "@albora/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * O editor. A foto já foi tirada pela câmera nativa; aqui só se escolhe cor.
 *
 * Cada miniatura da tira mostra **a foto do próprio convidado**, não uma
 * amostra genérica: escolher filtro olhando a foto de outra pessoa é escolher
 * no escuro. E as miniaturas saem de uma redução de 150 px feita uma vez —
 * oito cópias do original travaram o aparelho no protótipo.
 */

const LADO_PREVIA = 1000;
const LADO_TIRA = 150;
const SEM_FILTRO = "__sem";

export type Escolha = { preset: Preset | null; intensidade: number };

export function Editor({
  arquivo,
  recomendadoId,
  onEnviar,
  onDescartar,
}: {
  arquivo: File;
  recomendadoId: string | null;
  onEnviar: (filtro: FiltroAplicado | undefined) => void;
  onDescartar: () => void;
}) {
  const telaPrevia = useRef<HTMLCanvasElement>(null);
  const [previa, setPrevia] = useState<ImageBitmap | null>(null);
  const [tiras, setTiras] = useState<Map<string, string>>(new Map());
  const [escolhido, setEscolhido] = useState<Preset | null>(null);
  const [intensidade, setIntensidade] = useState(1);
  const [degradar, setDegradar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const presets = useMemo(() => ordenarComRecomendado(recomendadoId), [recomendadoId]);

  useEffect(() => {
    let vivo = true;
    const urls: string[] = [];

    (async () => {
      try {
        const bitmap = await createImageBitmap(arquivo);
        const escala = LADO_PREVIA / Math.max(bitmap.width, bitmap.height);

        const paraPrevia = await createImageBitmap(bitmap, {
          resizeWidth: Math.round(bitmap.width * Math.min(1, escala)),
          resizeQuality: "high",
        });
        if (!vivo) return;
        setPrevia(paraPrevia);

        // Uma redução, oito usos. É a correção do que travou no protótipo.
        const escalaTira = LADO_TIRA / Math.max(bitmap.width, bitmap.height);
        const base = await createImageBitmap(bitmap, {
          resizeWidth: Math.max(1, Math.round(bitmap.width * escalaTira)),
          resizeQuality: "medium",
        });

        const mapa = new Map<string, string>();

        const semFiltro = await miniatura(base, null);
        urls.push(semFiltro);
        mapa.set(SEM_FILTRO, semFiltro);

        for (const p of presets) {
          const url = await miniatura(base, p);
          urls.push(url);
          mapa.set(p.id, url);
        }
        if (!vivo) return;
        setTiras(mapa);
      } catch {
        setErro("Não consegui abrir essa foto. Tente outra.");
      }
    })();

    return () => {
      vivo = false;
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [arquivo, presets]);

  const desenharPrevia = useCallback(() => {
    const tela = telaPrevia.current;
    if (!tela || !previa) return;

    tela.width = previa.width;
    tela.height = previa.height;

    const ctx = tela.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const porPixel = !!escolhido?.porPixel && !degradar;

    if (!escolhido) {
      ctx.filter = "none";
      ctx.drawImage(previa, 0, 0);
      return;
    }

    if (!porPixel) {
      ctx.filter = paraFiltroCss(aplicarIntensidade(escolhido.ajustes, intensidade));
      ctx.drawImage(previa, 0, 0);
      return;
    }

    ctx.filter = "none";
    ctx.drawImage(previa, 0, 0);

    const quadro = ctx.getImageData(0, 0, previa.width, previa.height);
    const antes = performance.now();
    aplicarPorPixel(quadro.data, previa.width, previa.height, intensidade);
    const gasto = performance.now() - antes;
    ctx.putImageData(quadro, 0, 0);

    // A medida é do trabalho de verdade, não de uma sonda à parte. Se a
    // projeção para o tamanho cheio passa do teto, o preset cai para a
    // aproximação em CSS e a foto sai parecida em vez de sair tarde.
    const projecao = (gasto * 2500 * 1875) / (previa.width * previa.height);
    if (projecao > TETO_POR_PIXEL_MS) setDegradar(true);
  }, [previa, escolhido, intensidade, degradar]);

  useEffect(desenharPrevia, [desenharPrevia]);

  function enviar() {
    if (!escolhido) return onEnviar(undefined);

    onEnviar({
      ajustes: escolhido.ajustes,
      porPixel: !!escolhido.porPixel && !degradar,
      intensidade,
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100dvh", gap: "0.75rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem 0" }}>
        <button onClick={onDescartar} style={estiloTexto}>
          Tirar outra
        </button>
        {escolhido && (
          <button onClick={() => setEscolhido(null)} style={estiloTexto}>
            Sem filtro
          </button>
        )}
      </header>

      <section style={{ display: "grid", placeItems: "center", overflow: "hidden", padding: "0 1rem" }}>
        {erro ? (
          <p role="alert" style={{ color: "var(--acento)", textAlign: "center" }}>
            {erro}
          </p>
        ) : (
          <canvas
            ref={telaPrevia}
            style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: "var(--raio)" }}
          />
        )}
      </section>

      <footer style={{ display: "grid", gap: "0.9rem", padding: "0 1.25rem 1.25rem" }}>
        {escolhido && (
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.78rem", opacity: 0.55 }}>
              Intensidade {Math.round(intensidade * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(intensidade * 100)}
              onChange={(e) => setIntensidade(Number(e.target.value) / 100)}
              style={{ width: "100%", accentColor: "var(--frente)" }}
            />
          </label>
        )}

        <div
          style={{
            display: "flex",
            gap: "0.6rem",
            overflowX: "auto",
            paddingBottom: "0.25rem",
            scrollbarWidth: "none",
          }}
        >
          <Chip
            rotulo="Original"
            miniatura={tiras.get(SEM_FILTRO)}
            ativo={escolhido === null}
            onClick={() => setEscolhido(null)}
          />
          {presets.map((p) => (
            <Chip
              key={p.id}
              rotulo={p.nome}
              miniatura={tiras.get(p.id)}
              ativo={escolhido?.id === p.id}
              sugerido={p.id === recomendadoId}
              onClick={() => {
                setEscolhido(p);
                setIntensidade(1);
              }}
            />
          ))}
        </div>

        <button onClick={enviar} disabled={!previa} style={estiloPrimario(!previa)}>
          Enviar
        </button>
      </footer>
    </div>
  );
}

/**
 * Uma miniatura por preset, gerada uma vez.
 *
 * Vai como blob e não como `filter` de CSS na tag porque o 35 mm não existe em
 * CSS — e uma tira onde sete chips mostram a verdade e um mostra outra coisa é
 * pior do que não ter tira.
 */
async function miniatura(base: ImageBitmap, preset: Preset | null): Promise<string> {
  const tela = document.createElement("canvas");
  tela.width = base.width;
  tela.height = base.height;

  const ctx = tela.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";

  if (!preset) {
    ctx.drawImage(base, 0, 0);
  } else if (preset.porPixel) {
    ctx.drawImage(base, 0, 0);
    const quadro = ctx.getImageData(0, 0, base.width, base.height);
    aplicarPorPixel(quadro.data, base.width, base.height, 1);
    ctx.putImageData(quadro, 0, 0);
  } else {
    ctx.filter = paraFiltroCss(preset.ajustes);
    ctx.drawImage(base, 0, 0);
  }

  return await new Promise<string>((ok) =>
    tela.toBlob((b) => ok(b ? URL.createObjectURL(b) : ""), "image/jpeg", 0.7),
  );
}

function Chip({
  rotulo,
  miniatura,
  ativo,
  sugerido,
  onClick,
}: {
  rotulo: string;
  miniatura?: string | undefined;
  ativo: boolean;
  sugerido?: boolean | undefined;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={ativo}
      style={{
        font: "inherit",
        flex: "0 0 auto",
        display: "grid",
        gap: "0.3rem",
        justifyItems: "center",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        color: "var(--frente)",
        opacity: ativo ? 1 : 0.62,
      }}
    >
      <span
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "var(--raio)",
          overflow: "hidden",
          display: "block",
          background: "color-mix(in srgb, var(--frente) 10%, transparent)",
          outline: ativo ? "2px solid var(--frente)" : "none",
          outlineOffset: "2px",
          backgroundImage: miniatura ? `url(${miniatura})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <span style={{ fontSize: "0.68rem", whiteSpace: "nowrap" }}>
        {sugerido && "★ "}
        {rotulo}
      </span>
    </button>
  );
}

const estiloTexto: React.CSSProperties = {
  font: "inherit",
  fontSize: "0.9rem",
  background: "none",
  border: "none",
  padding: "0.4rem 0",
  color: "var(--frente)",
  opacity: 0.7,
  cursor: "pointer",
};

function estiloPrimario(desabilitado: boolean): React.CSSProperties {
  return {
    font: "inherit",
    fontSize: "1.05rem",
    fontWeight: 500,
    minHeight: "56px",
    borderRadius: "var(--raio)",
    border: "none",
    background: "var(--frente)",
    color: "var(--fundo)",
    opacity: desabilitado ? 0.5 : 1,
    cursor: desabilitado ? "default" : "pointer",
  };
}
