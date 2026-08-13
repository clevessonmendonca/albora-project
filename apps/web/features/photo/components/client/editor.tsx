"use client";

import {
  AJUSTES_NEUTROS,
  aplicarAjustes,
  aplicarIntensidade,
  aplicarPorPixel,
  NEUTRO,
  ordenarComRecomendado,
  paraFiltroCss,
  saoNeutros,
  TETO_POR_PIXEL_MS,
  type AjustesManuais,
  type FiltroAplicado,
  type Preset,
} from "@albora/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaixaMissao } from "@/features/guest/components/client/guest-shell";

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

const LADO_PREVIA = 1000;
const LADO_TIRA = 150;
const SEM_FILTRO = "__sem";

/** Escala visível de luz, calor e contraste. O contrato é −1 a 1. */
const PASSOS_BIPOLAR = 50;
/** Escala visível de vinheta e intensidade. O contrato é 0 a 1. */
const PASSOS_UNIPOLAR = 100;

export type Escolha = { preset: Preset | null; intensidade: number };

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
  const telaPrevia = useRef<HTMLCanvasElement>(null);
  const [previa, setPrevia] = useState<ImageBitmap | null>(null);
  const [tiras, setTiras] = useState<Map<string, string>>(new Map());
  const [escolhido, setEscolhido] = useState<Preset | null>(null);
  const [intensidade, setIntensidade] = useState(1);
  const [ajustes, setAjustes] = useState<AjustesManuais>(AJUSTES_NEUTROS);
  const [aba, setAba] = useState<Aba>("filtros");
  const [degradar, setDegradar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const comPreset = useRef<{ chave: string; quadro: ImageData } | null>(null);
  const rascunho = useRef<ImageData | null>(null);
  const quadroAgendado = useRef<number | null>(null);

  const presets = useMemo(() => ordenarComRecomendado(recomendadoId), [recomendadoId]);
  const podeZerar = !saoNeutros(ajustes);

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

  useEffect(() => {
    comPreset.current = null;
    rascunho.current = null;
  }, [previa]);

  const desenharPrevia = useCallback(() => {
    const tela = telaPrevia.current;
    if (!tela || !previa) return;

    if (tela.width !== previa.width || tela.height !== previa.height) {
      tela.width = previa.width;
      tela.height = previa.height;
      comPreset.current = null;
      rascunho.current = null;
    }

    const ctx = tela.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const porPixel = !!escolhido?.porPixel && !degradar;
    const chave = `${escolhido?.id ?? SEM_FILTRO}|${porPixel}|${intensidade}`;
    const guardado = comPreset.current;

    let fonte: ImageData;

    // O resultado do preset fica guardado porque arrastar Vinheta não muda o
    // preset: sem isto, cada quadro refaria também a passagem por pixel do
    // 35 mm, que é uma varredura inteira da imagem por nada.
    if (guardado && guardado.chave === chave) {
      fonte = guardado.quadro;
    } else {
      ctx.filter =
        escolhido && !porPixel
          ? paraFiltroCss(aplicarIntensidade(escolhido.ajustes, intensidade))
          : "none";
      ctx.drawImage(previa, 0, 0);
      ctx.filter = "none";

      fonte = ctx.getImageData(0, 0, previa.width, previa.height);

      if (porPixel) {
        const antes = performance.now();
        aplicarPorPixel(fonte.data, previa.width, previa.height, intensidade);
        const gasto = performance.now() - antes;

        // A medida é do trabalho de verdade, não de uma sonda à parte. Se a
        // projeção para o tamanho cheio passa do teto, o preset cai para a
        // aproximação em CSS e a foto sai parecida em vez de sair tarde.
        const projecao = (gasto * 2500 * 1875) / (previa.width * previa.height);
        if (projecao > TETO_POR_PIXEL_MS) setDegradar(true);
      }

      comPreset.current = { chave, quadro: fonte };
    }

    if (saoNeutros(ajustes)) {
      ctx.putImageData(fonte, 0, 0);
      return;
    }

    let sobre = rascunho.current;
    if (!sobre || sobre.width !== fonte.width || sobre.height !== fonte.height) {
      sobre = new ImageData(fonte.width, fonte.height);
      rascunho.current = sobre;
    }

    sobre.data.set(fonte.data);
    aplicarAjustes(sobre.data, fonte.width, fonte.height, ajustes);
    ctx.putImageData(sobre, 0, 0);
  }, [previa, escolhido, intensidade, degradar, ajustes]);

  useEffect(() => {
    // Um desenho por quadro, sempre o último. Arrastar um slider dispara
    // dezenas de eventos por segundo e cada desenho varre a imagem inteira:
    // sem a coalescência o Android de entrada acumula trabalho e a prévia
    // parece morta, que é o convidado desistindo da foto.
    quadroAgendado.current = requestAnimationFrame(() => {
      quadroAgendado.current = null;
      desenharPrevia();
    });

    return () => {
      if (quadroAgendado.current !== null) {
        cancelAnimationFrame(quadroAgendado.current);
        quadroAgendado.current = null;
      }
    };
  }, [desenharPrevia]);

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
    <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "100dvh", gap: "0.75rem" }}>
      <style>{ESTILO}</style>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1.5rem 0" }}>
        <button className="ed-texto" onClick={onDescartar}>
          Tirar outra
        </button>
        {escolhido && (
          <button className="ed-texto" onClick={() => setEscolhido(null)}>
            Sem filtro
          </button>
        )}
      </header>

      <section style={{ display: "grid", placeItems: "center", overflow: "hidden", padding: "0 1.25rem", position: "relative" }}>
        {missao && (
          <div
            style={{
              position: "absolute",
              top: "0.875rem",
              left: "0.875rem",
              right: "0.875rem",
              zIndex: 1,
            }}
          >
            <FaixaMissao indice={missao.indice} total={missao.total} titulo={missao.title} />
          </div>
        )}
        {erro ? (
          <p role="alert" style={{ color: "var(--critico)", textAlign: "center", lineHeight: 1.68 }}>
            {erro}
          </p>
        ) : (
          <canvas
            ref={telaPrevia}
            style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: "var(--raio-superficie)" }}
          />
        )}
      </section>

      <footer style={{ display: "grid", gap: "0.7rem", padding: "0 1.5rem 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
          <span />
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <BotaoAba rotulo="Filtros" ativa={aba === "filtros"} onClick={() => setAba("filtros")} />
            <BotaoAba rotulo="Ajustes" ativa={aba === "ajustes"} onClick={() => setAba("ajustes")} />
          </div>
          {podeZerar ? (
            <button
              className="ed-zerar"
              aria-label="Zerar os ajustes"
              onClick={() => setAjustes(AJUSTES_NEUTROS)}
            >
              Zerar
            </button>
          ) : (
            <span />
          )}
        </div>

        {aba === "filtros" ? (
          <>
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

            {escolhido && (
              <Deslizante
                rotulo="Intensidade"
                min={0}
                max={PASSOS_UNIPOLAR}
                valor={intensidade}
                onMudar={setIntensidade}
              />
            )}
          </>
        ) : (
          <div>
            <Deslizante
              rotulo="Luz"
              min={-PASSOS_BIPOLAR}
              max={PASSOS_BIPOLAR}
              valor={ajustes.luz}
              onMudar={(v) => setAjustes((a) => ({ ...a, luz: v }))}
            />
            <Deslizante
              rotulo="Calor"
              min={-PASSOS_BIPOLAR}
              max={PASSOS_BIPOLAR}
              valor={ajustes.calor}
              onMudar={(v) => setAjustes((a) => ({ ...a, calor: v }))}
            />
            <Deslizante
              rotulo="Contraste"
              min={-PASSOS_BIPOLAR}
              max={PASSOS_BIPOLAR}
              valor={ajustes.contraste}
              onMudar={(v) => setAjustes((a) => ({ ...a, contraste: v }))}
            />
            <Deslizante
              rotulo="Vinheta"
              min={0}
              max={PASSOS_UNIPOLAR}
              valor={ajustes.vinheta}
              onMudar={(v) => setAjustes((a) => ({ ...a, vinheta: v }))}
            />
          </div>
        )}

        <button className="ed-primario" onClick={enviar} disabled={!previa}>
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

function BotaoAba({
  rotulo,
  ativa,
  onClick,
}: {
  rotulo: string;
  ativa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="ed-aba"
      aria-pressed={ativa}
      onClick={onClick}
      style={{
        color: ativa ? "var(--acento-texto)" : "var(--ink-3)",
        borderBottomColor: ativa ? "var(--acento)" : "transparent",
      }}
    >
      {rotulo}
    </button>
  );
}

/**
 * Um controle contínuo. `valor` chega e sai em unidade de contrato (−1 a 1 ou
 * 0 a 1); `min` e `max` são a escala que o convidado lê.
 */
function Deslizante({
  rotulo,
  min,
  max,
  valor,
  onMudar,
}: {
  rotulo: string;
  min: number;
  max: number;
  valor: number;
  onMudar: (valor: number) => void;
}) {
  const bruto = Math.round(valor * max);
  const posicao = ((bruto - min) / (max - min)) * 100;
  // O preenchimento nasce no neutro, não na ponta esquerda: num controle que
  // vai de −50 a 50 é o desvio que interessa, e é ele que a barra mostra.
  const neutro = min < 0 ? ((0 - min) / (max - min)) * 100 : 0;

  const de = Math.min(neutro, posicao);
  const ate = Math.max(neutro, posicao);

  return (
    <label className="ed-linha">
      <span className="ed-rotulo">{rotulo}</span>
      <input
        className="ed-faixa"
        type="range"
        min={min}
        max={max}
        value={bruto}
        onChange={(e) => onMudar(Number(e.target.value) / max)}
        style={
          {
            "--trilho": `linear-gradient(to right, var(--linha) 0 ${de}%, var(--acento) ${de}% ${ate}%, var(--linha) ${ate}% 100%)`,
          } as React.CSSProperties
        }
      />
      <output className="ed-valor">{bruto}</output>
    </label>
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
      className={ativo ? "ed-chip ativo" : "ed-chip"}
      onClick={onClick}
      aria-pressed={ativo}
      style={{ color: ativo || sugerido ? "var(--acento-texto)" : "var(--ink-3)" }}
    >
      <span
        className="ed-mini"
        style={{
          backgroundImage: miniatura ? `url(${miniatura})` : undefined,
        }}
      >
        {/* O selo do filtro que os noivos sugerem. Disco pequeno, não etiqueta:
            âmbar entra como metal, e o primeiro lugar na tira já é o destaque. */}
        {sugerido && <span className="ed-selo" aria-hidden="true" />}
      </span>
      <span className="ed-nome">{rotulo}</span>
    </button>
  );
}

/**
 * Vive num `<style>` e não em estilo inline porque trilho e botão do controle
 * só existem como pseudo-elemento. As regras `-webkit-` e `-moz-` ficam
 * separadas de propósito: juntas, o pseudo-elemento desconhecido invalidaria a
 * regra inteira nos dois navegadores.
 */
const ESTILO = `
  .ed-texto {
    font: inherit;
    font-family: var(--fonte-titulo);
    font-size: 0.68rem;
    font-weight: 400;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    background: none;
    border: 0;
    min-height: 48px;
    padding: 0 0.125rem;
    color: var(--ink-2);
    cursor: pointer;
    transition: color var(--tempo-rapido) var(--curva);
  }

  .ed-aba {
    font: inherit;
    font-family: var(--fonte-titulo);
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    background: none;
    border: 0;
    border-bottom: 1px solid transparent;
    min-height: 48px;
    padding: 0 0.25rem;
    cursor: pointer;
    transition: color var(--tempo-rapido) var(--curva), border-color var(--tempo-rapido) var(--curva);
  }

  .ed-zerar {
    font: inherit;
    font-family: var(--fonte-titulo);
    font-size: 0.62rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    background: none;
    border: 0;
    color: var(--ink-3);
    min-height: 48px;
    padding: 0 0.25rem;
    justify-self: end;
    cursor: pointer;
  }

  .ed-chip {
    font: inherit;
    flex: 0 0 auto;
    width: 62px;
    display: grid;
    gap: 0.4rem;
    justify-items: center;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
  }

  .ed-mini {
    position: relative;
    display: block;
    width: 62px;
    height: 62px;
    border-radius: var(--raio);
    overflow: hidden;
    background-color: var(--superficie-alta);
    background-size: cover;
    background-position: center;
    box-shadow: inset 0 0 0 1px var(--linha);
    transition: box-shadow var(--tempo-rapido) var(--curva);
  }
  .ed-chip.ativo .ed-mini { box-shadow: inset 0 0 0 2px var(--acento); }

  .ed-selo {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 9px;
    height: 9px;
    border-radius: var(--raio-pilula);
    background: var(--acento);
  }

  .ed-nome {
    max-width: 100%;
    font-family: var(--fonte-titulo);
    font-size: 0.58rem;
    font-weight: 400;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ed-primario {
    font: inherit;
    font-size: 0.97rem;
    font-weight: 500;
    letter-spacing: var(--tracking-rotulo);
    min-height: 56px;
    padding: 0 1.5rem;
    border: 0;
    border-radius: var(--raio-pilula);
    background: var(--ink);
    color: var(--bg);
    cursor: pointer;
    transition: transform var(--tempo-rapido) var(--curva), opacity var(--tempo-rapido) var(--curva);
  }
  .ed-primario:disabled { opacity: 0.4; cursor: default; }
  .ed-primario:active:not(:disabled) { transform: scale(0.972); }

  .ed-texto:focus-visible,
  .ed-aba:focus-visible,
  .ed-zerar:focus-visible,
  .ed-chip:focus-visible,
  .ed-primario:focus-visible {
    outline: 1px solid var(--acento);
    outline-offset: 5px;
  }

  .ed-linha {
    display: grid;
    grid-template-columns: 5.4rem 1fr 2.4rem;
    gap: 0.75rem;
    align-items: center;
  }

  .ed-rotulo {
    font-family: var(--fonte-titulo);
    font-size: 0.62rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--ink-2);
  }

  .ed-valor {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.68rem;
    color: var(--ink-3);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .ed-faixa {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 48px;
    margin: 0;
    background: transparent;
    outline: none;
  }

  /*
    Trilho de 1,5px: progresso é filete, não barra. O botão continua largo
    porque quem arrasta está de pé, no escuro — a área de toque é o input
    inteiro, de 48px de altura.
  */
  .ed-faixa::-webkit-slider-runnable-track {
    height: 1.5px;
    background: var(--trilho);
  }

  .ed-faixa::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    margin-top: -11.25px;
    border: 0;
    border-radius: var(--raio-pilula);
    background: var(--ink);
    cursor: pointer;
  }

  .ed-faixa::-moz-range-track {
    height: 1.5px;
    background: var(--trilho);
  }

  .ed-faixa::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: var(--raio-pilula);
    background: var(--ink);
    cursor: pointer;
  }

  .ed-faixa:focus-visible::-webkit-slider-thumb {
    outline: 2px solid var(--acento);
    outline-offset: 2px;
  }

  .ed-faixa:focus-visible::-moz-range-thumb {
    outline: 2px solid var(--acento);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .ed-texto, .ed-aba, .ed-mini, .ed-primario { transition: none; }
    .ed-primario:active:not(:disabled) { transform: none; }
  }
`;
