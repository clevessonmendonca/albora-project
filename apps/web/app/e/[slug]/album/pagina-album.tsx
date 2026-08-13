"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usarFeed } from "@/lib/usar-feed";
import {
  CabecalhoConvidado,
  ChaoConvidado,
  EstadoVazio,
  MioloConvidado,
} from "../../../telas/shell-convidado";
import { Pilula } from "../../../telas/pecas-de-tela";
import { chavesDoReprodutor, Reprodutor } from "../feed/reprodutor";
import { GradeAlbum, GradeAlbumCarregando } from "./grade-album";

export type MissaoDoAlbum = { id: string; titulo: string };

const TOQUE_MINIMO = "48px";
const SEM_CHAVES: string[] = [];

export function PaginaAlbum({
  missoes,
  caminhoDaCamera,
}: {
  missoes: MissaoDoAlbum[];
  caminhoDaCamera: string;
}) {
  const [missaoId, setMissaoId] = useState<string | null>(null);
  const { estado, carregarMais, recomecar, pedirChaves, atualizarReacoes } = usarFeed(missaoId);

  const [indiceAberto, setIndiceAberto] = useState<number | null>(null);
  const movimentoReduzido = usarMovimentoReduzido();

  const primeiraCarga = !estado.jaCarregou && estado.carregando;
  const vazio = estado.jaCarregou && estado.itens.length === 0 && estado.falha === null;
  const contagem = estado.itens.length > 0 ? String(estado.itens.length) : undefined;

  const janela = useMemo(
    () => (indiceAberto === null ? SEM_CHAVES : chavesDoReprodutor(estado.itens, indiceAberto)),
    [indiceAberto, estado.itens],
  );

  useEffect(() => {
    pedirChaves(janela);
  }, [pedirChaves, janela]);

  const irPara = useCallback(
    (i: number) => {
      if (i < 0 || i >= estado.itens.length) return;
      setIndiceAberto(i);
    },
    [estado.itens.length],
  );

  const sair = useCallback(() => setIndiceAberto(null), []);

  useEffect(() => {
    if (indiceAberto === null) return;

    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [indiceAberto]);

  useEffect(() => {
    if (indiceAberto !== null && indiceAberto >= estado.itens.length) {
      setIndiceAberto(null);
    }
  }, [indiceAberto, estado.itens.length]);

  const horaAberta =
    indiceAberto !== null && estado.itens[indiceAberto]
      ? new Date(estado.itens[indiceAberto].criadaEm).getHours()
      : 0;

  return (
    <>
      <ChaoConvidado>
        <style>{`
          @keyframes album-respirar {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.55; }
          }
          .album-esperando { animation: album-respirar 1900ms var(--curva) infinite; }
          @media (prefers-reduced-motion: reduce) {
            .album-esperando { animation: none !important; }
          }
        `}</style>

        <MioloConvidado>
          <CabecalhoConvidado
            titulo="O álbum"
            acao={contagem ? <Pilula>{contagem}</Pilula> : undefined}
          />

          {missoes.length > 0 && (
            <Filtros missoes={missoes} escolhida={missaoId} onEscolher={setMissaoId} />
          )}

          {estado.midiaIndisponivel && (
            <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--ink-3)" }}>
              As fotos ainda não abriram. Elas aparecem sozinhas.
            </p>
          )}

          {primeiraCarga && <GradeAlbumCarregando />}

          {vazio && (
            <EstadoVazio
              titulo={missaoId ? "Ninguém mandou essa ainda." : "Ainda não há fotos no álbum."}
              lede={missaoId ? "A sua pode ser a primeira." : "Seja o primeiro a fotografar."}
              caminhoDaCamera={caminhoDaCamera}
            />
          )}

          {estado.itens.length > 0 && (
            <GradeAlbum
              itens={estado.itens}
              urls={estado.urls}
              onAbrir={setIndiceAberto}
            />
          )}

          <Rodape estado={estado} temItens={estado.itens.length > 0} onVerMais={carregarMais} onRecomecar={recomecar} />
        </MioloConvidado>
      </ChaoConvidado>

      {indiceAberto !== null && estado.itens[indiceAberto] && (
        <Reprodutor
          itens={estado.itens}
          indice={indiceAberto}
          hora={horaAberta}
          urls={estado.urls}
          interacao={estado.interacao}
          caminhoDaCamera={caminhoDaCamera}
          movimentoReduzido={movimentoReduzido}
          onIr={irPara}
          onSair={sair}
          onReacoes={atualizarReacoes}
          onBloqueado={recomecar}
        />
      )}
    </>
  );
}

function Filtros({
  missoes,
  escolhida,
  onEscolher,
}: {
  missoes: MissaoDoAlbum[];
  escolhida: string | null;
  onEscolher: (id: string | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filtrar o álbum"
      style={{
        display: "flex",
        gap: "0.4375rem",
        overflowX: "auto",
        scrollbarWidth: "none",
        margin: "0 calc(var(--espaco) * -5) 0.875rem",
        padding: "0 calc(var(--espaco) * 5)",
      }}
    >
      <BotaoPilula ativa={escolhida === null} onClick={() => onEscolher(null)}>
        Tudo
      </BotaoPilula>
      {missoes.map((m) => (
        <BotaoPilula
          key={m.id}
          ativa={escolhida === m.id}
          onClick={() => onEscolher(escolhida === m.id ? null : m.id)}
        >
          {m.titulo}
        </BotaoPilula>
      ))}
    </div>
  );
}

function BotaoPilula({
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
      aria-pressed={ativa}
      onClick={onClick}
      style={{
        font: "inherit",
        flex: "none",
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
      }}
    >
      <Pilula ativa={ativa}>{children}</Pilula>
    </button>
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
      <p
        style={{
          margin: "1.5rem 0 0",
          fontSize: "0.9rem",
          lineHeight: 1.6,
          textAlign: "center",
          color: "var(--ink-2)",
        }}
      >
        Sua entrada nessa festa expirou. Escaneie o QR da mesa de novo para continuar.
      </p>
    );
  }

  if (estado.falha !== null) {
    return (
      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", color: "var(--ink-2)" }}>
          Não consegui carregar o resto agora.
        </p>
        <Secundario onClick={estado.falha === "cursor" || !temItens ? onRecomecar : onVerMais}>
          Tentar de novo
        </Secundario>
      </div>
    );
  }

  if (estado.fim || estado.cursor === null) return null;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <Secundario onClick={onVerMais} desabilitado={estado.carregando}>
        {estado.carregando ? "Carregando…" : "Ver mais"}
      </Secundario>
    </div>
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
        borderRadius: "var(--raio-pilula)",
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
