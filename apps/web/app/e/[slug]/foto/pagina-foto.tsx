"use client";

import type { FiltroAplicado } from "@albora/core";
import { useEffect, useRef, useState } from "react";
import { AVISO_VIDEO, PLANO_ATUAL, usarEnvio } from "@/lib/usar-envio";
import { ArcoDeEnvio } from "./arco-de-envio";
import { Detalhes, type Lugar } from "./detalhes";
import { Editor } from "./editor";

/**
 * O caminho crítico inteiro, em cinco toques: consentir, nome, missão, câmera,
 * enviar. Legenda e lugar vêm depois e não contam — a subida já começou (§3.1).
 *
 * Não monta preview de câmera: `capture="environment"` abre a câmera nativa do
 * aparelho, que é a que o convidado já sabe usar e a única que funciona igual
 * em iPhone velho e Android novo. Preview próprio custaria HDR e modo noturno,
 * e às 22h no escuro é aí que a foto se ganha (N5.7).
 */

export type Missao = { id: string; titulo: string; feito: boolean };

export type Textos = {
  missaoTitulo: string;
  missaoLivre: string;
  lugarPergunta: string;
};

/**
 * Escondido do olho, presente no layout. `display: none` num input de arquivo
 * clicado por código já custou `capture` ignorado em Safari.
 */
const ESCONDIDO: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  opacity: 0,
  pointerEvents: "none",
};

const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** `Missão III` lê como convite; `Missão 03` lê como sistema (`DESIGN.md` §3). */
function romano(n: number): string {
  return ROMANOS[n - 1] ?? String(n);
}

type Etapa =
  | { nome: "missoes" }
  | { nome: "editor"; arquivo: File }
  | { nome: "detalhes"; uploadId: string; arquivo: File }
  | { nome: "pronto"; arquivo: File };

export function PaginaFoto({
  eventoId,
  missoes: missoesIniciais,
  lugares,
  textos,
  filtroRecomendado,
  caminhoDoFeed,
}: {
  eventoId: string;
  missoes: Missao[];
  lugares: Lugar[];
  textos: Textos;
  filtroRecomendado: string | null;
  caminhoDoFeed: string;
}) {
  const { estado, enfileirarFoto, anotar } = usarEnvio(eventoId);
  const entradaCamera = useRef<HTMLInputElement>(null);
  const entradaRolo = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<Etapa>({ nome: "missoes" });
  const [missoes, setMissoes] = useState(missoesIniciais);
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [emLote, setEmLote] = useState(0);
  const [enviadas, setEnviadas] = useState(0);

  function abrirCamera(missaoId: string | null) {
    setEscolhida(missaoId);
    entradaCamera.current?.click();
  }

  function abrirRolo(missaoId: string | null) {
    setEscolhida(missaoId);
    entradaRolo.current?.click();
  }

  async function escolheu(ev: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = [...(ev.target.files ?? [])];
    // Zera antes de seguir: sem isso, fotografar a mesma coisa duas vezes
    // seguidas não dispara o evento na segunda.
    ev.target.value = "";

    const primeiro = arquivos[0];
    if (!primeiro) return;

    // Uma foto passa pelo editor. Um lote não: quem sobe dez do rolo no
    // domingo de manhã não quer escolher filtro dez vezes, e uma entrada de
    // fila por arquivo é o que a N5.6 pede.
    if (arquivos.length === 1) {
      setEtapa({ nome: "editor", arquivo: primeiro });
      return;
    }

    setEmLote(arquivos.length);
    for (const arquivo of arquivos) {
      const r = await enfileirarFoto({ arquivo, desafioId: escolhida });
      if (r.ok) setEnviadas((n) => n + 1);
      setEmLote((n) => n - 1);
    }
    setEtapa({ nome: "pronto", arquivo: primeiro });
  }

  async function enviar(arquivo: File, filtro: FiltroAplicado | undefined) {
    const r = await enfileirarFoto({ arquivo, filtro, desafioId: escolhida });
    if (!r.ok) return;

    setEnviadas((n) => n + 1);

    if (escolhida) {
      setMissoes((m) => m.map((x) => (x.id === escolhida ? { ...x, feito: true } : x)));
    }

    setEtapa({ nome: "detalhes", uploadId: r.id, arquivo });
  }

  if (etapa.nome === "editor") {
    return (
      <Editor
        arquivo={etapa.arquivo}
        recomendadoId={filtroRecomendado}
        onEnviar={(filtro) => void enviar(etapa.arquivo, filtro)}
        onDescartar={() => abrirCamera(escolhida)}
      />
    );
  }

  if (etapa.nome === "detalhes") {
    return (
      <Detalhes
        lugares={lugares}
        perguntaDoLugar={textos.lugarPergunta}
        onPronto={(detalhes) => {
          void anotar(etapa.uploadId, detalhes);
          setEtapa({ nome: "pronto", arquivo: etapa.arquivo });
        }}
      />
    );
  }

  if (etapa.nome === "pronto") {
    return (
      <Confirmacao
        arquivo={etapa.arquivo}
        numero={enviadas}
        pendentes={estado.pendentes}
        online={estado.online}
        onOutra={() => setEtapa({ nome: "missoes" })}
      />
    );
  }

  const restantes = missoes.filter((m) => !m.feito);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        padding: "1.75rem 2rem 2.25rem",
        gap: "1.5rem",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <style>{ESTILO}</style>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {/* Rótulo versalete: quem nomeia a lista é o pack, e o título da tela é
            a instrução, não o nome da coisa. */}
        {/* Discreto de propósito. O feed existe para o convidado voltar a
            fotografar (ADR 0009); um botão que compete com a câmera inverteria
            o que ele serve. */}
        <a href={caminhoDoFeed} style={ATALHO_DO_FEED}>
          {textos.missaoTitulo}
        </a>
        <ArcoDeEnvio
          pendentes={estado.pendentes}
          bytesPendentes={estado.bytesPendentes}
          online={estado.online}
        />
      </header>

      <section style={{ display: "grid", alignContent: "start", gap: "0.25rem" }}>
        {/* Terminar a lista não pode parecer o fim do produto: a madrugada é
            onde saem as melhores fotos (N5.5). */}
        <h1 className="foto-titulo">
          {missoes.length === 0 ? (
            "Modo livre"
          ) : restantes.length > 0 ? (
            "Escolhe uma."
          ) : (
            <>
              Você fez todas as {missoes.length}.
              <br />
              <em>Manda o que quiser.</em>
            </>
          )}
        </h1>

        {restantes.length > 0 && <p className="foto-lede">Ou manda o que quiser.</p>}

        {missoes.map((m, i) => (
          <div key={m.id} className={m.feito ? "missao pronta" : "missao"}>
            <button className="missao-alvo" onClick={() => abrirCamera(m.id)}>
              <span className="missao-num">{romano(i + 1)}</span>
              <span className="missao-texto">{m.titulo}</span>
              {m.feito && <span className="missao-feita">feita</span>}
            </button>

            {/* A missão abre a câmera num toque — o caminho crítico não comporta
                uma folha de escolha no meio. Esta porta existe para quem já tem
                a foto no rolo cumprir a missão mesmo assim. */}
            <button
              className="missao-rolo"
              onClick={() => abrirRolo(m.id)}
              aria-label={`Escolher do rolo para: ${m.titulo}`}
            >
              <IconeRolo />
            </button>
          </div>
        ))}

        {estado.ultimoErro && (
          <p role="alert" className="foto-recado">
            {estado.ultimoErro}
          </p>
        )}
      </section>

      {/* `hidden` é `display: none`, e input escondido assim tem histórico de
          ignorar `capture` quando o clique vem de código. Escondido no visual,
          presente no layout. */}
      <input
        ref={entradaCamera}
        type="file"
        accept="image/*"
        capture="environment"
        style={ESCONDIDO}
        onChange={escolheu}
      />
      {/* Sem `capture`: é a porta do rolo. Metade das fotos boas foi tirada
          antes de alguém abrir isto (N5.1), e quem sobe no dia seguinte sobe
          em lote (N5.6). */}
      <input
        ref={entradaRolo}
        type="file"
        accept="image/*"
        multiple
        style={ESCONDIDO}
        onChange={escolheu}
      />

      <div style={{ display: "grid", gap: "0.6rem" }}>
        <button
          className="foto-botao"
          onClick={() => abrirCamera(null)}
          disabled={estado.processando}
          style={{
            fontSize: "1.05rem",
            fontWeight: 500,
            // Alvo grande de propósito: é o único botão que importa, e a mão que
            // o aperta às 23h segura uma taça na outra.
            minHeight: "64px",
            border: "none",
            background: "var(--ink)",
            color: "var(--bg)",
            opacity: estado.processando ? 0.4 : 1,
          }}
        >
          {estado.processando
            ? "Preparando…"
            : emLote > 0
              ? `Guardando ${emLote}…`
              : textos.missaoLivre}
        </button>

        <button
          className="foto-botao"
          onClick={() => abrirRolo(null)}
          disabled={estado.processando}
          style={{
            fontSize: "0.97rem",
            fontWeight: 400,
            minHeight: "52px",
            border: "1px solid var(--linha)",
            background: "transparent",
            color: "var(--ink-2)",
          }}
        >
          Escolher do rolo
        </button>

        {/*
          Antes da captura, nunca depois: deixar gravar e recusar no envio
          destrói o momento, e o brinde não se refaz (N5.3).
        */}
        {PLANO_ATUAL === "gratis" && (
          <p
            style={{
              margin: "0.4rem 0 0",
              fontSize: "0.8rem",
              lineHeight: 1.6,
              textAlign: "center",
              color: "var(--ink-3)",
            }}
          >
            {AVISO_VIDEO}
          </p>
        )}
      </div>
    </main>
  );
}

/** O rolo do aparelho. Sem rótulo ao lado: a linha inteira já diz a missão. */
function IconeRolo() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="14" height="11" rx="2.5" />
      <circle cx="7.6" cy="9.2" r="1.1" />
      <path d="M3.4 14.2l3.4-2.9 2.9 2.3 2.6-2.1 4.7 3.7" />
      <path d="M20.6 8.6v7.9a3 3 0 0 1-3 3H7.4" />
    </svg>
  );
}

/**
 * A confirmação. A foto **amanhece**: entra escura e clareia até a cor cheia.
 *
 * Não é enfeite — é o retorno visual de que aquele arquivo virou uma foto no
 * álbum, no único instante em que o convidado está olhando para saber isso.
 */
function Confirmacao({
  arquivo,
  numero,
  pendentes,
  online,
  onOutra,
}: {
  arquivo: File;
  numero: number;
  pendentes: number;
  online: boolean;
  onOutra: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(arquivo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        padding: "2.5rem 2rem 2.25rem",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <style>{ESTILO}</style>

      {url && (
        <img
          className="amanhece"
          src={url}
          alt=""
          style={{
            flex: "none",
            width: "min(62vw, 16rem)",
            aspectRatio: "3 / 4",
            objectFit: "cover",
            borderRadius: "var(--raio-superficie)",
            marginBottom: "1.75rem",
          }}
        />
      )}

      <p className="foto-titulo" style={{ margin: 0 }}>
        {!online ? (
          <>
            Sem sinal.
            <br />
            <em>Suas fotos sobem sozinhas.</em>
          </>
        ) : pendentes > 0 ? (
          <>
            Foto {numero}.
            <br />
            <em>Já está subindo.</em>
          </>
        ) : (
          <>
            Foto {numero}.
            <br />
            <em>Já tá no telão.</em>
          </>
        )}
      </p>

      {!online && <p className="foto-lede">Pode fechar. A gente cuida.</p>}

      <span style={{ flex: "1 1 auto", minHeight: "1.5rem" }} />

      {/*
        O convite para o app só aparece com a fila vazia. Com foto pendente ele
        competiria com a coisa que o convidado ainda está esperando terminar —
        e o produto pediria instalação antes de ter entregado nada.
      */}
      {pendentes === 0 && (
        <p
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "0.75rem",
            margin: "0 0 1.25rem",
            maxWidth: "34ch",
            fontSize: "0.88rem",
            lineHeight: 1.68,
            color: "var(--ink-2)",
          }}
        >
          <span
            style={{
              flex: "none",
              fontFamily: "var(--fonte-titulo)",
              fontSize: "0.68rem",
              fontWeight: 400,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--acento-texto)",
            }}
          >
            App
          </span>
          Instale e receba suas fotos depois da festa
        </p>
      )}

      <button
        className="foto-botao"
        onClick={onOutra}
        style={{
          flex: "none",
          fontSize: "0.97rem",
          fontWeight: 500,
          minHeight: "56px",
          border: "none",
          background: "var(--ink)",
          color: "var(--bg)",
        }}
      >
        Continuar tirando
      </button>
    </main>
  );
}

const ROTULO_BASE: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--fonte-titulo)",
  fontSize: "0.7rem",
  fontWeight: 400,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
};

/** O mesmo rótulo, agora clicável. Herda para os dois não divergirem. */
const ATALHO_DO_FEED: React.CSSProperties = {
  ...ROTULO_BASE,
  textDecoration: "none",
  // O rótulo tem 11px de altura; o dedo não.
  display: "inline-flex",
  alignItems: "center",
  minHeight: "48px",
};

const ESTILO = `
.foto-titulo {
  font-family: var(--fonte-titulo);
  font-size: clamp(1.6rem, 7.6vw, 1.9375rem);
  font-weight: 500;
  line-height: 1.14;
  letter-spacing: var(--tracking-titulo);
  margin: 0 0 0.4rem;
  text-wrap: balance;
}
.foto-titulo em { font-weight: 400; }

.foto-lede {
  margin: 0 0 1.1rem;
  max-width: 34ch;
  font-size: 0.94rem;
  line-height: 1.68;
  color: var(--ink-2);
}

.foto-recado {
  margin: 0.9rem 0 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--critico);
}

.missao {
  display: flex;
  align-items: stretch;
  gap: 0.25rem;
  border-bottom: 1px solid var(--linha);
  transition: opacity var(--tempo-rapido) var(--curva);
}
.missao:last-of-type { border-bottom: none; }
.missao.pronta { opacity: 0.35; }

.missao-alvo {
  font: inherit;
  flex: 1 1 auto;
  min-width: 0;
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr) auto;
  gap: 0.5rem;
  align-items: baseline;
  text-align: left;
  min-height: 62px;
  padding: 1.15rem 0.125rem;
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
}

.missao-num {
  font-family: var(--fonte-titulo);
  font-size: 0.72rem;
  font-weight: 400;
  letter-spacing: 0.2em;
  color: var(--acento-texto);
}
.missao.pronta .missao-num { color: var(--ink-3); }

.missao-texto {
  font-family: var(--fonte-titulo);
  font-size: 1.0625rem;
  font-weight: 500;
  line-height: 1.32;
  letter-spacing: var(--tracking-titulo);
}

.missao-feita {
  font-family: var(--fonte-titulo);
  font-size: 0.6rem;
  font-weight: 400;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.missao-rolo {
  flex: none;
  width: 3rem;
  min-height: 62px;
  display: grid;
  place-items: center;
  background: none;
  border: 0;
  border-radius: var(--raio-pilula);
  color: var(--ink-3);
  cursor: pointer;
  transition: color var(--tempo-rapido) var(--curva), transform var(--tempo-rapido) var(--curva);
}
.missao-rolo:active { transform: scale(0.94); }

.foto-botao {
  font: inherit;
  letter-spacing: var(--tracking-rotulo);
  border-radius: var(--raio-pilula);
  padding: 0 1.5rem;
  cursor: pointer;
  transition: transform var(--tempo-rapido) var(--curva), opacity var(--tempo-rapido) var(--curva);
}
.foto-botao:disabled { cursor: default; }
.foto-botao:active:not(:disabled) { transform: scale(0.972); }

.missao-alvo:focus-visible,
.missao-rolo:focus-visible,
.foto-botao:focus-visible {
  outline: 1px solid var(--acento);
  outline-offset: 5px;
}

@keyframes amanhecer {
  from { opacity: 0; filter: brightness(0.35) saturate(0.5); transform: scale(1.03); }
  to   { opacity: 1; filter: none; transform: none; }
}
.amanhece { animation: amanhecer calc(var(--tempo-lento) * 2) var(--curva) both; }

@media (prefers-reduced-motion: reduce) {
  .amanhece { animation: none; }
  .missao, .missao-rolo, .foto-botao { transition: none; }
  .missao-rolo:active, .foto-botao:active:not(:disabled) { transform: none; }
}
`;
