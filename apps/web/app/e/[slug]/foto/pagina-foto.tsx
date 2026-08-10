"use client";

import type { FiltroAplicado } from "@albora/core";
import { useEffect, useRef, useState } from "react";
import { AVISO_VIDEO, PLANO_ATUAL, usarEnvio } from "@/lib/usar-envio";
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
}: {
  eventoId: string;
  missoes: Missao[];
  lugares: Lugar[];
  textos: Textos;
  filtroRecomendado: string | null;
}) {
  const { estado, enfileirarFoto, anotar } = usarEnvio(eventoId);
  const entrada = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<Etapa>({ nome: "missoes" });
  const [missoes, setMissoes] = useState(missoesIniciais);
  const [escolhida, setEscolhida] = useState<string | null>(null);

  function abrirCamera(missaoId: string | null) {
    setEscolhida(missaoId);
    entrada.current?.click();
  }

  function escolheu(ev: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = ev.target.files?.[0];
    // Zera antes de seguir: sem isso, fotografar a mesma coisa duas vezes
    // seguidas não dispara o evento na segunda.
    ev.target.value = "";
    if (arquivo) setEtapa({ nome: "editor", arquivo });
  }

  async function enviar(arquivo: File, filtro: FiltroAplicado | undefined) {
    const r = await enfileirarFoto({ arquivo, filtro, desafioId: escolhida });
    if (!r.ok) return;

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
        pendentes={estado.pendentes}
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
        padding: "1.5rem",
        gap: "1.25rem",
        background: "var(--fundo)",
        color: "var(--frente)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontFamily: "var(--fonte-titulo)", fontSize: "1.3rem", fontWeight: 500, margin: 0 }}>
          {restantes.length > 0 ? textos.missaoTitulo : "Modo livre"}
        </h1>
        <Estado pendentes={estado.pendentes} online={estado.online} />
      </header>

      <section style={{ display: "grid", alignContent: "start", gap: "0.5rem" }}>
        {restantes.length === 0 && missoes.length > 0 && (
          // Terminar a lista não pode parecer o fim do produto: a madrugada é
          // onde saem as melhores fotos (N5.5).
          <p style={{ margin: "0 0 0.5rem", opacity: 0.6, lineHeight: 1.6 }}>
            Você fez todas as {missoes.length}. Agora manda o que quiser.
          </p>
        )}

        {missoes.map((m) => (
          <button
            key={m.id}
            onClick={() => abrirCamera(m.id)}
            style={{
              font: "inherit",
              fontSize: "1rem",
              textAlign: "left",
              minHeight: "56px",
              padding: "0.9rem 1rem",
              borderRadius: "var(--raio)",
              cursor: "pointer",
              background: "transparent",
              color: "var(--frente)",
              border: "1px solid color-mix(in srgb, var(--frente) 18%, transparent)",
              opacity: m.feito ? 0.4 : 1,
              display: "flex",
              justifyContent: "space-between",
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            <span>{m.titulo}</span>
            {m.feito && <span style={{ fontSize: "0.78rem" }}>feita</span>}
          </button>
        ))}

        {estado.ultimoErro && (
          <p role="alert" style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "var(--acento)" }}>
            {estado.ultimoErro}
          </p>
        )}
      </section>

      <input ref={entrada} type="file" accept="image/*" capture="environment" hidden onChange={escolheu} />

      <div style={{ display: "grid", gap: "0.55rem" }}>
        <button
          onClick={() => abrirCamera(null)}
          disabled={estado.processando}
          style={{
            font: "inherit",
            fontSize: "1.05rem",
            fontWeight: 500,
            // Alvo grande de propósito: é o único botão que importa, e a mão que
            // o aperta às 23h segura uma taça na outra.
            minHeight: "64px",
            borderRadius: "var(--raio)",
            border: "none",
            background: "var(--frente)",
            color: "var(--fundo)",
            opacity: estado.processando ? 0.5 : 1,
            cursor: estado.processando ? "default" : "pointer",
          }}
        >
          {estado.processando ? "Preparando…" : textos.missaoLivre}
        </button>

        {/*
          Antes da captura, nunca depois: deixar gravar e recusar no envio
          destrói o momento, e o brinde não se refaz (N5.3).
        */}
        {PLANO_ATUAL === "gratis" && (
          <p style={{ margin: 0, fontSize: "0.78rem", opacity: 0.5, textAlign: "center" }}>
            {AVISO_VIDEO}
          </p>
        )}
      </div>
    </main>
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
  pendentes,
  onOutra,
}: {
  arquivo: File;
  pendentes: number;
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
        display: "grid",
        alignContent: "center",
        justifyItems: "center",
        gap: "1.25rem",
        padding: "2rem 1.5rem",
        textAlign: "center",
        background: "var(--fundo)",
        color: "var(--frente)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <style>{`
        @keyframes amanhecer {
          from { opacity: 0; filter: brightness(0.35) saturate(0.5); transform: scale(1.03); }
          to   { opacity: 1; filter: none; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .amanhece { animation: none !important; }
        }
      `}</style>

      {url && (
        <img
          className="amanhece"
          src={url}
          alt=""
          style={{
            width: "min(58vw, 15rem)",
            aspectRatio: "3 / 4",
            objectFit: "cover",
            borderRadius: "var(--raio)",
            animation: "amanhecer 900ms ease-out both",
          }}
        />
      )}

      <div>
        <p style={{ margin: "0 0 0.35rem", fontFamily: "var(--fonte-titulo)", fontSize: "1.35rem" }}>
          {pendentes > 0 ? "Guardada" : "Já está no álbum"}
        </p>
        <p style={{ margin: 0, opacity: 0.6, lineHeight: 1.6 }}>
          {pendentes > 0
            ? "Vai subir sozinha assim que o sinal voltar."
            : "E já pode aparecer no telão."}
        </p>
      </div>

      <button
        onClick={onOutra}
        style={{
          font: "inherit",
          fontSize: "1rem",
          fontWeight: 500,
          minHeight: "52px",
          padding: "0 1.75rem",
          borderRadius: "var(--raio)",
          border: "none",
          background: "var(--frente)",
          color: "var(--fundo)",
          cursor: "pointer",
        }}
      >
        Tirar outra
      </button>

      {/*
        O convite para o app só aparece com a fila vazia. Com foto pendente ele
        competiria com a coisa que o convidado ainda está esperando terminar —
        e o produto pediria instalação antes de ter entregado nada.
      */}
      {pendentes === 0 && (
        <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.5, maxWidth: "18rem", lineHeight: 1.6 }}>
          No app você acompanha as fotos dos outros e recebe as suas depois da festa.
        </p>
      )}
    </main>
  );
}

function Estado({ pendentes, online }: { pendentes: number; online: boolean }) {
  if (pendentes === 0 && online) return null;

  // Só aparece quando há o que dizer. Um contador permanente vira laço de
  // checagem, que é o que o ADR 0009 mantém fora da festa.
  return (
    <span style={{ fontSize: "0.78rem", opacity: 0.55 }}>
      {!online && "sem sinal · "}
      {pendentes > 0 && `${pendentes} esperando`}
    </span>
  );
}
