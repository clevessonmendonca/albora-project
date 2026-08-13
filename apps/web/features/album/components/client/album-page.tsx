"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFeed } from "@/features/feed/hooks/use-feed";
import {
  GuestHeader,
  GuestShell,
  EmptyState,
  GuestMain,
  SecondaryButton,
} from "@albora/ui-web";
import { Badge } from "@albora/ui-web";
import { viewerKeys, Viewer } from "@/features/feed/components/client/viewer";
import { AlbumGrid, AlbumGridLoading } from "./album-grid";

export type AlbumMission = { id: string; title: string };

const SEM_CHAVES: string[] = [];

export function AlbumPage({
  slug,
  missions,
  initialMission = null,
  cameraPath,
}: {
  slug: string;
  missions: AlbumMission[];
  initialMission?: string | null;
  cameraPath: string;
}) {
  const [missionId, setMissionId] = useState<string | null>(() => {
    if (initialMission && missions.some((m) => m.id === initialMission)) return initialMission;
    return null;
  });
  const { estado, carregarMais, recomecar, pedirChaves, atualizarReacoes } = useFeed(missionId);

  const [indiceAberto, setIndiceAberto] = useState<number | null>(null);
  const movimentoReduzido = usarMovimentoReduzido();

  const primeiraCarga = !estado.jaCarregou && estado.carregando;
  const vazio = estado.jaCarregou && estado.itens.length === 0 && estado.falha === null;
  const contagem = estado.itens.length > 0 ? String(estado.itens.length) : undefined;

  const janela = useMemo(
    () => (indiceAberto === null ? SEM_CHAVES : viewerKeys(estado.itens, indiceAberto)),
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
      <GuestShell>
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

        <GuestMain>
          <GuestHeader
            title="O álbum"
            homeHref={`/e/${encodeURIComponent(slug)}/cover`}
            action={contagem ? <Badge>{contagem}</Badge> : undefined}
          />

          {missions.length > 0 && (
            <Filters missions={missions} selected={missionId} onSelect={setMissionId} />
          )}

          {estado.midiaIndisponivel && (
            <p className="mb-4 mt-0 text-[0.85rem] text-ink-3">
              As fotos ainda não abriram. Elas aparecem sozinhas.
            </p>
          )}

          {primeiraCarga && <AlbumGridLoading />}

          {vazio && (
            <EmptyState
              title={missionId ? "Ninguém mandou essa ainda." : "Ainda não há fotos no álbum."}
              lede={missionId ? "A sua pode ser a primeira." : "Seja o primeiro a fotografar."}
              cameraPath={cameraPath}
            />
          )}

          {estado.itens.length > 0 && (
            <AlbumGrid
              itens={estado.itens}
              urls={estado.urls}
              onAbrir={setIndiceAberto}
            />
          )}

          <Rodape estado={estado} temItens={estado.itens.length > 0} onVerMais={carregarMais} onRecomecar={recomecar} />
        </GuestMain>
      </GuestShell>

      {indiceAberto !== null && estado.itens[indiceAberto] && (
        <Viewer
          itens={estado.itens}
          indice={indiceAberto}
          hora={horaAberta}
          urls={estado.urls}
          interacao={estado.interacao}
          cameraPath={cameraPath}
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

function Filters({
  missions,
  selected,
  onSelect,
}: {
  missions: AlbumMission[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filtrar o álbum"
      className="-mx-[calc(var(--espaco)*5)] mb-3.5 flex gap-[0.4375rem] overflow-x-auto px-[calc(var(--espaco)*5)] [scrollbar-width:none]"
    >
      <ButtonBadge active={selected === null} onClick={() => onSelect(null)}>
        Tudo
      </ButtonBadge>
      {missions.map((m) => (
        <ButtonBadge
          key={m.id}
          active={selected === m.id}
          onClick={() => onSelect(selected === m.id ? null : m.id)}
        >
          {m.title}
        </ButtonBadge>
      ))}
    </div>
  );
}

function ButtonBadge({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="shrink-0 cursor-pointer border-0 bg-transparent p-0 font-[inherit]"
    >
      <Badge tone={active ? "accent" : "neutral"}>{children}</Badge>
    </button>
  );
}

function Rodape({
  estado,
  temItens,
  onVerMais,
  onRecomecar,
}: {
  estado: ReturnType<typeof useFeed>["estado"];
  temItens: boolean;
  onVerMais: () => void;
  onRecomecar: () => void;
}) {
  if (estado.falha === "sessao") {
    return (
      <p className="mt-6 text-center text-[0.9rem] leading-relaxed text-ink-2">
        Sua entrada nessa festa expirou. Escaneie o QR da mesa de novo para continuar.
      </p>
    );
  }

  if (estado.falha !== null) {
    return (
      <div className="mt-6 text-center">
        <p className="mb-3 mt-0 text-[0.9rem] text-ink-2">
          Não consegui carregar o resto agora.
        </p>
        <SecondaryButton onClick={estado.falha === "cursor" || !temItens ? onRecomecar : onVerMais}>
          Tentar de novo
        </SecondaryButton>
      </div>
    );
  }

  if (estado.fim || estado.cursor === null) return null;

  return (
    <div className="mt-6">
      <SecondaryButton onClick={onVerMais} disabled={estado.carregando}>
        {estado.carregando ? "Carregando…" : "Ver mais"}
      </SecondaryButton>
    </div>
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
