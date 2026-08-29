"use client";

import { isVideoMime } from "@albora/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { groupByHour } from "@/features/feed/lib/group-by-hour";
import { useFeed, podeCarregarMais } from "@/features/feed/hooks/use-feed";
import { useInfiniteScroll } from "@/features/feed/hooks/use-infinite-scroll";
import { useFeedViewer } from "@/features/feed/hooks/use-feed-viewer";
import { useFeedFilter, type FilterMission as FilterMissionType } from "@/features/feed/hooks/use-feed-filter";
import { HostMessageCard } from "@/features/guest/components/client/host-message-card";
import { useShare } from "@/features/my-photos/hooks/use-share";
import { ShareConsentSheet } from "@/features/my-photos/components/client/share-consent-sheet";
import {
  FloatingNav,
  GateNotice,
  GuestHeader,
  GuestShell,
  EmptyState,
  GuestMain,
  SecondaryButton,
  ErrorMessage,
  cn,
} from "@albora/ui-web";
import { Badge } from "@albora/ui-web";
import { Post, PostLoading } from "./post";
import { MirrorGrid, MirrorGridLoading } from "./mirror-grid";
import { viewerKeys, Viewer } from "./viewer";
import { HourStrip, HourStripLoading } from "./hour-strip";

/** Scroll infinito substitui "toque" (design doc §5.4). Câmera fixa — ação primária que some embaixo não existe. Ao sair do visualizador volta ao feed. */

/** @deprecated Use FilterMissionType from use-feed-filter */
export type FilterMission = FilterMissionType;

export type FeedCopy = {
  /** Como esta festa chama a lista de missões. Vem resolvido do pack. */
  missionTitle: string;
};

/** Identidade estável: `[]` novo a cada render reabriria o efeito à toa. */
const SEM_CHAVES: string[] = [];

export function FeedPage({
  slug,
  eventTitle,
  missions,
  copy,
  cameraPath,
  hostMessageLabel,
  anfitriaoPlural,
  eventoId,
  sessaoId,
}: {
  slug: string;
  eventTitle: string;
  missions: FilterMission[];
  copy: FeedCopy;
  cameraPath: string;
  hostMessageLabel: string;
  anfitriaoPlural: string;
  eventoId: string;
  sessaoId: string;
}) {
  const base = `/e/${encodeURIComponent(slug)}`;
  const router = useRouter();
  
  // Hooks de dados e estado
  const filtro = useFeedFilter(missions);
  const { estado, carregarMais, recomecar, pedirChaves, atualizarReacoes } = useFeed(filtro.missionId);
  const compartilhar = useShare(eventoId, sessaoId);
  const movimentoReduzido = usarMovimentoReduzido();

  // Derivações de estado
  const primeiraCarga = !estado.jaCarregou && estado.carregando;
  const vazio = estado.jaCarregou && estado.itens.length === 0 && estado.falha === null;
  const temMais = !estado.fim && estado.falha === null;
  
  const grupos = useMemo(
    () => groupByHour(estado.itens, { temMais }),
    [estado.itens, temMais],
  );

  // Hook de viewer (gerencia estado do visualizador)
  const viewer = useFeedViewer(grupos);
  
  // Janela de URLs para pre-fetch
  const janela = useMemo(
    () => (viewer.grupoAberto ? viewerKeys(viewer.itensAbertos, viewer.indiceAtual) : SEM_CHAVES),
    [viewer.grupoAberto, viewer.itensAbertos, viewer.indiceAtual],
  );

  useEffect(() => {
    pedirChaves(janela);
  }, [pedirChaves, janela]);
  
  // Handler de carregamento quando grupo incompleto está preparando
  useEffect(() => {
    if (viewer.preparando === null) return;
    if (estado.carregando) return;
    
    const grupo = grupos.find((g) => g.inicio.getTime() === viewer.preparando);
    if (grupo && !grupo.completo) {
      carregarMais();
    }
  }, [viewer.preparando, grupos, estado.carregando, carregarMais]);

  const espelho = estado.interacao === "espelho";
  const completo = !espelho;
  const contagem = estado.itens.length > 0 ? `${estado.itens.length} fotos` : undefined;

  // Gate de interação
  const [gateAbriu, setGateAbriu] = useState(false);
  const interacaoAnterior = useRef<string | null>(null);

  // Novos itens no topo
  const prevFirstId = useRef<string | null>(null);
  const [novosNoTopo, setNovosNoTopo] = useState(false);
  const firstItemId = estado.itens[0]?.id ?? null;

  useEffect(() => {
    if (interacaoAnterior.current === "espelho" && estado.interacao === "completo") {
      setGateAbriu(true);
    }
    interacaoAnterior.current = estado.interacao;
  }, [estado.interacao]);

  useEffect(() => {
    if (!gateAbriu) return;
    const id = setTimeout(() => setGateAbriu(false), 6000);
    return () => clearTimeout(id);
  }, [gateAbriu]);

  useEffect(() => {
    const prev = prevFirstId.current;
    prevFirstId.current = firstItemId;
    if (prev !== null && firstItemId !== null && firstItemId !== prev) {
      setNovosNoTopo(true);
    }
  }, [firstItemId]);

  useEffect(() => {
    if (!novosNoTopo) return;
    const handle = () => {
      if (window.scrollY < 120) setNovosNoTopo(false);
    };
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, [novosNoTopo]);

  return (
    <>
      {gateAbriu && (
        <GateAbertoOverlay
          onFechar={() => setGateAbriu(false)}
          cameraPath={cameraPath}
        />
      )}
      <GuestShell>
        <style>{`
          @keyframes feed-amanhecer {
            from { opacity: 0; filter: brightness(0.4) saturate(0.6); }
            to   { opacity: 1; filter: none; }
          }
          @keyframes feed-respirar {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.55; }
          }
          .feed-amanhece { animation: feed-amanhecer var(--tempo-lento) var(--curva) both; }
          .feed-esperando { animation: feed-respirar 1900ms var(--curva) infinite; }
          @keyframes feed-pill-entra {
            from { transform: translate(-50%, -2.5rem); opacity: 0 }
            to   { transform: translate(-50%, 0);       opacity: 1 }
          }
          .feed-pill { animation: feed-pill-entra 280ms var(--curva) both }
          @media (prefers-reduced-motion: reduce) {
            .feed-amanhece, .feed-esperando { animation: none !important; }
            .feed-pill { animation: none !important; }
          }
        `}</style>

        {novosNoTopo && !viewer.grupoAberto && (
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setNovosNoTopo(false);
            }}
            className="feed-pill fixed left-1/2 top-16 z-30 flex cursor-pointer items-center gap-1.5 rounded-pilula border-none bg-acento px-4 py-2 text-[0.8125rem] text-sobre-acento shadow-md"
          >
            ↑ Novas fotos
          </button>
        )}

        <GuestMain>
          <GuestHeader
            title={eventTitle}
            homeHref={`/e/${encodeURIComponent(slug)}/cover`}
            action={contagem ? <Badge>{contagem}</Badge> : undefined}
          />

          <HostMessageCard label={hostMessageLabel} hostName={eventTitle} />

          {espelho && estado.jaCarregou && (
            <GateNotice>
              Comentários abrem no horário escolhido por {anfitriaoPlural}. Pode curtir à vontade —
              continue fotografando, tudo já está no álbum.
            </GateNotice>
          )}

          {primeiraCarga && completo && <HourStripLoading />}
          {primeiraCarga && espelho && <MirrorGridLoading />}

          {completo && grupos.length > 0 && (
            <HourStrip
              grupos={grupos}
              urls={estado.urls}
              vistos={viewer.vistos}
              preparando={viewer.preparando}
              rotulo="Horas da festa"
              onAbrir={viewer.abrir}
            />
          )}

          {completo && missions.length > 0 && (
            <Filtro
              rotulo={copy.missionTitle}
              missions={missions}
              escolhida={filtro.missionId}
              onEscolher={(id) => filtro.setFiltro(id === filtro.missionId ? null : id)}
            />
          )}

          {estado.midiaIndisponivel && (
            <p className="mb-4 text-[0.9rem] leading-relaxed text-ink-2">
              As fotos ainda não abriram. Elas aparecem sozinhas quando {anfitriaoPlural} liberarem.
            </p>
          )}

          {compartilhar.erro && <ErrorMessage>{compartilhar.erro}</ErrorMessage>}

          {primeiraCarga && completo && (
            <Coluna>
              {[0, 1].map((i) => (
                <PostLoading key={i} />
              ))}
            </Coluna>
          )}

          {vazio && (
            <EmptyState
              title={completo && filtro.missionId !== null ? "Ninguém fez essa ainda." : "Ainda não tem foto aqui."}
              lede={completo && filtro.missionId !== null ? "Sua foto pode ser a primeira." : "Seja o primeiro a fotografar."}
              cameraPath={cameraPath}
            />
          )}

          {espelho && estado.itens.length > 0 && (
            <MirrorGrid itens={estado.itens} urls={estado.urls} cameraPath={cameraPath} />
          )}

          {completo && estado.itens.length > 0 && (
            <Coluna comDivisor>
              {estado.itens.map((item) => {
                const isVideo = isVideoMime(item.mime);
                const chaveMidia = isVideo ? item.chaveFull : item.chaveThumb;
                return (
                <Post
                  key={item.id}
                  uploadId={item.id}
                  interacao={estado.interacao}
                  {...(item.reacoes !== undefined ? { reacoes: item.reacoes } : {})}
                  {...(item.minhaReacao !== undefined ? { minhaReacao: item.minhaReacao } : {})}
                  {...(item.sessaoAutor ? { sessaoAutor: item.sessaoAutor } : {})}
                  {...(item.sessaoAutor
                    ? {
                        autorHref: `${base}/g/${encodeURIComponent(item.sessaoAutor)}`,
                        linkComponent: Link,
                        onVerAutor: (id: string) =>
                          router.push(`${base}/g/${encodeURIComponent(id)}`),
                      }
                    : {})}
                  {...(item.minha !== undefined ? { minha: item.minha } : {})}
                  onReacoes={(resultado) => atualizarReacoes(item.id, resultado)}
                  onBloqueado={recomecar}
                  onCompartilhar={() => void compartilhar.compartilhar(item.id)}
                  compartilhando={compartilhar.compartilhandoId === item.id}
                  url={estado.urls.get(chaveMidia)?.url ?? null}
                  autor={item.autor}
                  legenda={item.legenda}
                  lugar={item.lugar}
                  isVideo={isVideo}
                  {...(item.largura !== undefined ? { largura: item.largura } : {})}
                  {...(item.altura !== undefined ? { altura: item.altura } : {})}
                />
              );
              })}
            </Coluna>
          )}

          <Rodape
            estado={estado}
            temItens={estado.itens.length > 0}
            onVerMais={carregarMais}
            onRecomecar={recomecar}
          />
        </GuestMain>
      </GuestShell>

      <FloatingNav base={base} linkComponent={Link} />

      {completo && viewer.grupoAberto && (
        <Viewer
          itens={viewer.itensAbertos}
          indice={viewer.indiceAtual}
          hora={viewer.grupoAberto.hora}
          urls={estado.urls}
          interacao={estado.interacao}
          cameraPath={cameraPath}
          movimentoReduzido={movimentoReduzido}
          onIr={viewer.navegarPara}
          onSair={viewer.fechar}
          onReacoes={atualizarReacoes}
          onBloqueado={recomecar}
          onCompartilhar={() => {
            const atual = viewer.itensAbertos[viewer.indiceAtual];
            if (atual) void compartilhar.compartilhar(atual.id);
          }}
          compartilhando={compartilhar.compartilhandoId === viewer.itensAbertos[viewer.indiceAtual]?.id}
          onVerAutor={(id) => router.push(`${base}/g/${encodeURIComponent(id)}`)}
        />
      )}

      <ShareConsentSheet
        open={compartilhar.pedindoConsentimento !== null}
        onClose={() => compartilhar.cancelarConsentimento()}
        onConfirm={(nomeNaMoldura) => {
          if (compartilhar.pedindoConsentimento) {
            void compartilhar.confirmarConsentimento(compartilhar.pedindoConsentimento, nomeNaMoldura);
          }
        }}
      />
    </>
  );
}

/** Uma foto por vez, em destaque — coluna única como `FeedScreen`. */
function Coluna({
  children,
  comDivisor,
}: {
  children: React.ReactNode;
  comDivisor?: boolean;
}) {
  return (
    <div className={cn("grid", comDivisor && "border-t border-linha")}>
      {children}
    </div>
  );
}

function Filtro({
  rotulo,
  missions,
  escolhida,
  onEscolher,
}: {
  rotulo: string;
  missions: FilterMission[];
  escolhida: string | null;
  onEscolher: (id: string | null) => void;
}) {
  return (
    <div
      role="group"
      // Nome das missões fica só na etiqueta acessível — uma linha de rótulo visível empurraria a primeira foto para fora da tela.
      aria-label={rotulo}
      className="mx-[calc(var(--espaco)*-5)] mb-[calc(var(--espaco)*5)] mt-[calc(var(--espaco)*3)] flex gap-[calc(var(--espaco)*6)] overflow-x-auto border-b border-linha px-[calc(var(--espaco)*5)] [scrollbar-width:none]"
    >
      <FilterTab active={escolhida === null} onClick={() => onEscolher(null)}>
        Tudo
      </FilterTab>

      {missions.map((m) => (
        <FilterTab
          key={m.id}
          active={escolhida === m.id}
          onClick={() => onEscolher(m.id)}
        >
          {m.title}
        </FilterTab>
      ))}
    </div>
  );
}

/** Sublinhado, nunca pílula preenchida: é vocabulário de menu impresso. */
function FilterTab({
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
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "max-w-56 min-h-12 flex-none cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap border-none bg-transparent p-0 font-titulo text-[0.68rem] font-normal uppercase tracking-[0.2em]",
        "[transition:color_var(--tempo-rapido)_var(--curva)]",
        active
          ? "border-b border-b-acento text-ink"
          : "border-b border-b-transparent text-ink-3 hover:text-ink-2",
      )}
    >
      {children}
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
  const sentinela = useInfiniteScroll(onVerMais, podeCarregarMais(estado), estado.itens.length);

  if (estado.falha === "sessao") {
    return (
      <p className="mt-[calc(var(--espaco)*6)] text-center text-[0.9rem] leading-relaxed text-ink-2">
        Sua entrada expirou.{" "}
        <a href="/scan" className="text-acento underline">Escaneie o QR da mesa</a>{" "}
        de novo para continuar.
      </p>
    );
  }

  if (estado.falha !== null) {
    return (
      <div className="mt-[calc(var(--espaco)*6)] text-center">
        <p className="mb-3 text-[0.9rem] leading-relaxed text-ink-2">
          Não consegui carregar mais fotos agora.
        </p>
        {/* Recomeçar do topo é toque do convidado, nunca efeito colateral do
            erro: uma lista que se rebobina sozinha perde o lugar de quem rolou. */}
        <SecondaryButton
          onClick={estado.falha === "cursor" || !temItens ? onRecomecar : onVerMais}
        >
          Tentar de novo
        </SecondaryButton>
      </div>
    );
  }

  if (estado.fim || estado.cursor === null) return null;

  return (
    <div ref={sentinela} className="mt-[calc(var(--espaco)*6)]">
      {estado.carregando && (
        <p aria-live="polite" className="text-center text-[0.9rem] leading-relaxed text-ink-2">
          Carregando mais fotos…
        </p>
      )}
    </div>
  );
}

function GateAbertoOverlay({
  onFechar,
  cameraPath,
}: {
  onFechar: () => void;
  cameraPath: string;
}) {
  useEffect(() => {
    function tecla(ev: KeyboardEvent) {
      if (ev.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [onFechar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Feed liberado"
      className="fixed inset-0 z-40 grid place-items-center bg-bg-overlay p-6"
      style={{ animation: "feed-amanhecer 0.35s var(--curva) both" }}
      onClick={onFechar}
    >
      <div
        className="grid w-full max-w-xs gap-5 rounded-superficie border border-linha bg-superficie p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="m-0 text-[2rem] leading-none" aria-hidden>
          🎉
        </p>
        <div>
          <p className="m-0 font-titulo text-[1.2rem] font-normal">A festa está liberada</p>
          <p className="m-0 mt-1.5 text-[0.9rem] leading-relaxed text-ink-2">
            Comentários, reações e o feed completo abriram. Veja o que todo mundo fotografou.
          </p>
        </div>
        <div className="grid gap-2.5">
          <button
            type="button"
            onClick={onFechar}
            className="min-h-12 cursor-pointer rounded-pilula border-none bg-acento px-6 font-inherit text-[0.9rem] font-medium text-sobre-acento transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80"
          >
            Ver as fotos
          </button>
          <a
            href={cameraPath}
            className="grid min-h-12 place-items-center rounded-pilula border border-linha bg-transparent px-6 text-[0.9rem] text-ink no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
          >
            Tirar foto
          </a>
        </div>
      </div>
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
