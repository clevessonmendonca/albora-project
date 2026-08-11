"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { agruparPorHora, rotuloDeHora, type GrupoDeHora } from "@/lib/agrupar-por-hora";
import { Capa } from "./quadro";
import { Reprodutor } from "./reprodutor";
import { usarStories, type ItemDoFeed } from "./usar-stories";
import { usarUrls } from "./usar-urls";

/**
 * Stories: as fotos da festa em 9:16, agrupadas por hora.
 *
 * Duas telas, e a ordem entre elas é o produto: a lista de horas é onde a
 * pessoa entra e para onde ela volta quando a hora acaba — e a ação primária
 * dela é a câmera. O reprodutor é onde a hora corre.
 *
 * Nada de reação, contagem, comentário ou galeria aqui. O gate de interação é
 * decidido no servidor, e esta tela mostra o que a rota devolveu.
 */

/** Identidade estável: `[]` novo a cada render reabriria efeito à toa. */
const SEM_ITENS: ItemDoFeed[] = [];

export type TextosDosStories = {
  /** Resolvido pelo pack no servidor. Nenhuma string de domínio entra aqui. */
  vazio: string;
};

type Aberto = { inicio: number; itemId: string };

export function Stories({ slug, textos }: { slug: string; textos: TextosDosStories }) {
  const { itens, temMais, carregando, falhou, carregarMais, tentarDeNovo } = usarStories();

  const [aberto, setAberto] = useState<Aberto | null>(null);
  const [preparando, setPreparando] = useState<number | null>(null);
  const movimentoReduzido = usarMovimentoReduzido();

  const grupos = useMemo(() => agruparPorHora(itens, { temMais }), [itens, temMais]);

  const grupoAberto = aberto
    ? grupos.find((g) => g.inicio.getTime() === aberto.inicio)
    : undefined;

  const itensAbertos = grupoAberto?.itens ?? SEM_ITENS;
  const achado = grupoAberto ? itensAbertos.findIndex((i) => i.id === aberto?.itemId) : -1;
  const indice = achado >= 0 ? achado : 0;

  const chaves = useMemo(
    () =>
      grupoAberto ? chavesDoReprodutor(itensAbertos, indice) : chavesDaLista(grupos),
    [grupoAberto, itensAbertos, indice, grupos],
  );

  const { urls } = usarUrls(chaves);

  const irPara = useCallback(
    (i: number) => {
      const alvo = itensAbertos[i];
      if (!alvo) return;
      setAberto((atual) => (atual ? { inicio: atual.inicio, itemId: alvo.id } : atual));
    },
    [itensAbertos],
  );

  const sair = useCallback(() => setAberto(null), []);

  /**
   * Uma hora incompleta é fechada **antes** de abrir.
   *
   * O feed vem do mais novo para o mais velho, então a hora mais antiga da lista
   * é a única que ainda pode receber foto. Começar a tocar no meio dela faria a
   * fila reordenar embaixo do dedo enquanto a próxima página chega.
   */
  useEffect(() => {
    if (preparando === null) return;

    const grupo = grupos.find((g) => g.inicio.getTime() === preparando);
    if (!grupo) {
      setPreparando(null);
      return;
    }

    if (!grupo.completo) {
      if (!carregando) carregarMais();
      return;
    }

    const primeiro = grupo.itens[0];
    setPreparando(null);
    if (primeiro) setAberto({ inicio: preparando, itemId: primeiro.id });
  }, [preparando, grupos, carregando, carregarMais]);

  // A foto pode sair do feed pelo botão de pânico enquanto alguém a olha. Some
  // do grupo, o grupo some da lista, e a tela volta para onde há saída.
  useEffect(() => {
    if (aberto && !grupoAberto) setAberto(null);
  }, [aberto, grupoAberto]);

  function abrir(grupo: GrupoDeHora<ItemDoFeed>) {
    const inicio = grupo.inicio.getTime();
    const primeiro = grupo.itens[0];

    if (grupo.completo && primeiro) setAberto({ inicio, itemId: primeiro.id });
    else setPreparando(inicio);
  }

  if (grupoAberto) {
    return (
      <Reprodutor
        itens={itensAbertos}
        indice={indice}
        hora={grupoAberto.hora}
        urls={urls}
        slug={slug}
        movimentoReduzido={movimentoReduzido}
        onIr={irPara}
        onSair={sair}
      />
    );
  }

  const vazio = grupos.length === 0;

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: "1.25rem",
        padding: "1.5rem",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <header style={{ display: "grid", gap: "0.5rem" }}>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--fonte-titulo)",
            fontSize: "0.7rem",
            fontWeight: 400,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          Hora a hora
        </p>

        <h1
          style={{
            margin: 0,
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.7rem",
            fontWeight: 500,
            lineHeight: 1.2,
            textWrap: "balance",
          }}
        >
          {vazio ? (
            textos.vazio
          ) : (
            <>
              A festa até agora.
              <br />
              <em>Depois manda a sua.</em>
            </>
          )}
        </h1>
      </header>

      <section style={{ display: "grid", alignContent: "start", gap: "0.25rem" }}>
        {vazio && carregando && (
          <p style={{ margin: 0, color: "var(--ink-3)" }}>Buscando as fotos da festa…</p>
        )}

        {vazio && !carregando && !falhou && (
          <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6 }}>Seja o primeiro.</p>
        )}

        {grupos.map((grupo) => {
          const inicio = grupo.inicio.getTime();
          const capa = grupo.itens[grupo.itens.length - 1];
          const urlCapa = capa ? urls.get(capa.chaveThumb)?.url : undefined;

          return (
            <button
              key={inicio}
              type="button"
              onClick={() => abrir(grupo)}
              disabled={preparando !== null}
              style={{
                font: "inherit",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                alignItems: "center",
                gap: "0.9rem",
                width: "100%",
                minHeight: "58px",
                padding: "0.6rem 0.25rem",
                textAlign: "left",
                background: "transparent",
                color: "var(--ink)",
                border: "none",
                borderBottom: "1px solid var(--linha)",
                cursor: preparando !== null ? "default" : "pointer",
                opacity: preparando !== null && preparando !== inicio ? 0.45 : 1,
              }}
            >
              <Capa url={urlCapa} />

              <span
                style={{
                  fontFamily: "var(--fonte-titulo)",
                  fontSize: "1.05rem",
                  fontWeight: 400,
                  letterSpacing: "0.06em",
                  color: "var(--acento-texto)",
                }}
              >
                {rotuloDeHora(grupo.hora)}
              </span>

              <span style={{ color: "var(--ink-3)", fontSize: "1.1rem" }} aria-hidden>
                {preparando === inicio ? "…" : "›"}
              </span>
            </button>
          );
        })}

        {falhou && (
          <p role="alert" style={{ margin: "0.75rem 0 0", fontSize: "0.9rem", color: "var(--critico)" }}>
            Não deu para buscar o resto agora.{" "}
            <button
              type="button"
              onClick={tentarDeNovo}
              style={{
                font: "inherit",
                minHeight: "48px",
                padding: "0 0.25rem",
                background: "transparent",
                border: "none",
                color: "var(--acento-texto)",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Tentar de novo
            </button>
          </p>
        )}

        {!vazio && temMais && (
          <button
            type="button"
            onClick={carregarMais}
            disabled={carregando}
            style={{
              font: "inherit",
              justifySelf: "start",
              minHeight: "48px",
              marginTop: "0.75rem",
              padding: "0 0.25rem",
              background: "transparent",
              border: "none",
              borderBottom: "1px solid var(--linha)",
              color: "var(--ink-2)",
              fontSize: "0.9rem",
              cursor: carregando ? "default" : "pointer",
            }}
          >
            {carregando ? "Buscando…" : "Horas anteriores"}
          </button>
        )}
      </section>

      <Link
        href={`/e/${slug}/foto`}
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "54px",
          borderRadius: "var(--raio)",
          background: "var(--acento)",
          color: "var(--bg)",
          fontSize: "1.05rem",
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        Tirar foto
      </Link>
    </main>
  );
}

/**
 * A janela do reprodutor, em ordem de urgência: o que está na tela, o que
 * chega no próximo toque, e só então a vizinhança.
 */
function chavesDoReprodutor(itens: ItemDoFeed[], indice: number): string[] {
  const chaves: string[] = [];
  const atual = itens[indice];

  if (atual) {
    chaves.push(atual.chaveThumb, atual.chaveFull);
  }

  for (const passo of [1, 2]) {
    const proximo = itens[indice + passo];
    if (proximo) chaves.push(proximo.chaveThumb, proximo.chaveFull);
  }

  for (const passo of [-1, 3, 4]) {
    const vizinho = itens[indice + passo];
    if (vizinho) chaves.push(vizinho.chaveThumb);
  }

  return [...new Set(chaves)];
}

/** Uma miniatura por hora: a lista é escolha, não exibição. */
function chavesDaLista(grupos: GrupoDeHora<ItemDoFeed>[]): string[] {
  const chaves: string[] = [];

  for (const grupo of grupos) {
    const capa = grupo.itens[grupo.itens.length - 1];
    if (capa) chaves.push(capa.chaveThumb);
  }

  return chaves;
}

function usarMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => setReduzido(consulta.matches);

    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  return reduzido;
}
