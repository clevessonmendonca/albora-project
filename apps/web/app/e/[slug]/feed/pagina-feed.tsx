"use client";

import { useState } from "react";
import { usarFeed } from "@/lib/usar-feed";
import { Moldura, MolduraCarregando } from "./moldura";

/**
 * O feed do convidado.
 *
 * Ele existe para uma coisa só: o convidado ver o que os outros mandaram e,
 * por isso, mandar mais (ADR 0009). Duas decisões de tela saem direto daí, e
 * nenhuma é estética:
 *
 * - **A próxima página só vem a pedido.** Rolagem infinita é o desenho que
 *   prende, e prender é o oposto do que esta tela serve. Aqui ela termina, e
 *   quem quiser mais toca.
 * - **O botão de câmera é fixo.** Ele não sai da tela em nenhum estado — nem
 *   no vazio, nem no erro, nem no fim da lista.
 *
 * Nada de contagem: antes do gate ela nem chega do servidor, e depois dele
 * quem a mostra é outra tarefa.
 */

export type MissaoDoFiltro = { id: string; titulo: string };

export type TextosDoFeed = {
  /** Como esta festa chama a lista de missões. Vem resolvido do pack. */
  missaoTitulo: string;
};

const TOQUE_MINIMO = "48px";

export function PaginaFeed({
  missoes,
  textos,
  caminhoDaCamera,
}: {
  missoes: MissaoDoFiltro[];
  textos: TextosDoFeed;
  caminhoDaCamera: string;
}) {
  const [missaoId, setMissaoId] = useState<string | null>(null);
  const { estado, carregarMais, recomecar } = usarFeed(missaoId);

  const primeiraCarga = !estado.jaCarregou && estado.carregando;
  const vazio = estado.jaCarregou && estado.itens.length === 0 && estado.falha === null;

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "calc(var(--espaco) * 6) calc(var(--espaco) * 5)",
        paddingBottom: "calc(7rem + env(safe-area-inset-bottom))",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <style>{`
        @keyframes feed-amanhecer {
          from { opacity: 0; filter: brightness(0.4) saturate(0.6); }
          to   { opacity: 1; filter: none; }
        }
        @keyframes feed-respirar {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
        .feed-amanhece { animation: feed-amanhecer 620ms ease-out both; }
        .feed-esperando { animation: feed-respirar 1900ms ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .feed-amanhece, .feed-esperando { animation: none !important; }
        }
      `}</style>

      <header style={{ marginBottom: "calc(var(--espaco) * 6)" }}>
        <h1
          style={{
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.7rem",
            fontWeight: 500,
            lineHeight: 1.2,
            margin: "0 0 0.35rem",
            textWrap: "balance",
          }}
        >
          Olha o que já chegou.
        </h1>
        <p style={{ margin: 0, lineHeight: 1.6, color: "var(--ink-2)" }}>
          A sua próxima entra aqui do lado.
        </p>
      </header>

      {missoes.length > 0 && (
        <Filtro
          rotulo={textos.missaoTitulo}
          missoes={missoes}
          escolhida={missaoId}
          onEscolher={setMissaoId}
        />
      )}

      {estado.midiaIndisponivel && (
        <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--ink-3)" }}>
          As fotos ainda não abriram. Elas aparecem sozinhas.
        </p>
      )}

      {primeiraCarga && <Grade>{[0, 1, 2, 3, 4, 5].map((i) => <MolduraCarregando key={i} />)}</Grade>}

      {vazio && <Vazio comFiltro={missaoId !== null} />}

      {estado.itens.length > 0 && (
        <Grade>
          {estado.itens.map((item) => (
            <Moldura
              key={item.id}
              url={estado.urls.get(item.chaveThumb)?.url ?? null}
              autor={item.autor}
              legenda={item.legenda}
            />
          ))}
        </Grade>
      )}

      <Rodape
        estado={estado}
        temItens={estado.itens.length > 0}
        onVerMais={carregarMais}
        onRecomecar={recomecar}
      />

      {/* Fixo em todos os estados: a tela não pode terminar sem a porta de volta
          para a câmera, que é a única coisa que ela existe para provocar. */}
      <div
        style={{
          position: "fixed",
          insetInline: 0,
          bottom: 0,
          padding: "calc(var(--espaco) * 3) calc(var(--espaco) * 5)",
          paddingBottom: "calc(var(--espaco) * 3 + env(safe-area-inset-bottom))",
          borderTop: "1px solid var(--linha)",
          background: "var(--bg)",
        }}
      >
        <a
          href={caminhoDaCamera}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "56px",
            borderRadius: "var(--raio)",
            fontSize: "1.05rem",
            fontWeight: 500,
            textDecoration: "none",
            background: "var(--ink)",
            color: "var(--bg)",
          }}
        >
          Mandar uma foto
        </a>
      </div>
    </main>
  );
}

function Grade({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(8.5rem, 1fr))",
        gap: "calc(var(--espaco) * 3)",
        alignItems: "start",
      }}
    >
      {children}
    </div>
  );
}

function Filtro({
  rotulo,
  missoes,
  escolhida,
  onEscolher,
}: {
  rotulo: string;
  missoes: MissaoDoFiltro[];
  escolhida: string | null;
  onEscolher: (id: string | null) => void;
}) {
  return (
    <section style={{ marginBottom: "calc(var(--espaco) * 5)" }}>
      <p
        style={{
          margin: "0 0 calc(var(--espaco) * 2)",
          fontFamily: "var(--fonte-titulo)",
          fontSize: "0.68rem",
          fontWeight: 400,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
        }}
      >
        {rotulo}
      </p>

      <div
        style={{
          display: "flex",
          gap: "calc(var(--espaco) * 2)",
          overflowX: "auto",
          scrollbarWidth: "none",
          // A faixa sangra até a borda da tela para o último item não parecer o fim.
          margin: "0 calc(var(--espaco) * -5)",
          padding: "0 calc(var(--espaco) * 5)",
        }}
      >
        <Etiqueta ativa={escolhida === null} onClick={() => onEscolher(null)}>
          Tudo
        </Etiqueta>

        {missoes.map((m) => (
          <Etiqueta
            key={m.id}
            ativa={escolhida === m.id}
            onClick={() => onEscolher(escolhida === m.id ? null : m.id)}
          >
            {m.titulo}
          </Etiqueta>
        ))}
      </div>
    </section>
  );
}

function Etiqueta({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativa}
      style={{
        font: "inherit",
        flex: "none",
        maxWidth: "14rem",
        minHeight: TOQUE_MINIMO,
        padding: "0 calc(var(--espaco) * 4)",
        borderRadius: "var(--raio)",
        cursor: "pointer",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontSize: "0.9rem",
        // O acento entra como filete, nunca como preenchimento, e o estado
        // ativo não copia o botão da câmera: só um alvo desta tela é o
        // principal, e não é o filtro.
        border: ativa ? "1px solid var(--acento)" : "1px solid var(--linha)",
        background: ativa ? "var(--superficie-alta)" : "transparent",
        color: ativa ? "var(--ink)" : "var(--ink-2)",
      }}
    >
      {children}
    </button>
  );
}

function Vazio({ comFiltro }: { comFiltro: boolean }) {
  return (
    <div style={{ padding: "calc(var(--espaco) * 10) 0", textAlign: "center" }}>
      <p
        style={{
          margin: "0 0 0.4rem",
          fontFamily: "var(--fonte-titulo)",
          fontSize: "1.3rem",
          fontWeight: 500,
          lineHeight: 1.25,
          textWrap: "balance",
        }}
      >
        {comFiltro ? "Ninguém mandou essa ainda." : "Ainda não tem nada aqui."}
      </p>
      <p style={{ margin: 0, lineHeight: 1.6, color: "var(--ink-2)" }}>
        A sua pode ser a primeira.
      </p>
    </div>
  );
}

function Rodape({
  estado,
  temItens,
  onVerMais,
  onRecomecar,
}: {
  estado: ReturnType<typeof usarFeed>["estado"];
  temItens: boolean;
  onVerMais: () => void;
  onRecomecar: () => void;
}) {
  if (estado.falha === "sessao") {
    return (
      <Recado texto="Sua entrada nessa festa expirou. Escaneie o QR da mesa de novo para continuar." />
    );
  }

  if (estado.falha !== null) {
    return (
      <div style={{ marginTop: "calc(var(--espaco) * 6)", textAlign: "center" }}>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", color: "var(--ink-2)" }}>
          Não consegui carregar o resto agora.
        </p>
        {/* Recomeçar do topo é toque do convidado, nunca efeito colateral do
            erro: uma lista que se rebobina sozinha perde o lugar de quem rolou. */}
        <Secundario onClick={estado.falha === "cursor" || !temItens ? onRecomecar : onVerMais}>
          Tentar de novo
        </Secundario>
      </div>
    );
  }

  if (estado.fim || estado.cursor === null) return null;

  return (
    <div style={{ marginTop: "calc(var(--espaco) * 6)" }}>
      <Secundario onClick={onVerMais} desabilitado={estado.carregando}>
        {estado.carregando ? "Carregando…" : "Ver mais"}
      </Secundario>
    </div>
  );
}

function Recado({ texto }: { texto: string }) {
  return (
    <p
      style={{
        margin: "calc(var(--espaco) * 6) 0 0",
        fontSize: "0.9rem",
        lineHeight: 1.6,
        textAlign: "center",
        color: "var(--ink-2)",
      }}
    >
      {texto}
    </p>
  );
}

function Secundario({
  onClick,
  desabilitado,
  children,
}: {
  onClick: () => void;
  desabilitado?: boolean | undefined;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado ?? false}
      style={{
        font: "inherit",
        width: "100%",
        minHeight: TOQUE_MINIMO,
        borderRadius: "var(--raio)",
        border: "1px solid var(--linha)",
        background: "transparent",
        color: "var(--ink-2)",
        fontSize: "0.95rem",
        cursor: desabilitado ? "default" : "pointer",
        opacity: desabilitado ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
