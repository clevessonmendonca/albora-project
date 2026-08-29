"use client";

import { isVideoMime } from "@albora/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import { groupByHour } from "@/features/feed/lib/group-by-hour";
import { useFeed } from "@/features/feed/hooks/use-feed";
import { useFeedViewer } from "@/features/feed/hooks/use-feed-viewer";
import { useProfileViewer } from "@/features/guest-profile/hooks/use-profile-viewer";
import { useFeedFilter, type FilterMission } from "@/features/feed/hooks/use-feed-filter";
import { useTemporalFilter } from "@/features/feed/hooks/use-temporal-filter";
import { useReducedMotion } from "@/features/feed/hooks/use-reduced-motion";
import { useNewItemsNotification } from "@/features/feed/hooks/use-new-items-notification";
import { useGateTransition } from "@/features/feed/hooks/use-gate-transition";
import { HostMessageCard } from "@/features/guest/components/client/host-message-card";
import { useShare } from "@/features/my-photos/hooks/use-share";
import {
  FloatingNav,
  GateNotice,
  GuestHeader,
  GuestShell,
  GuestMain,
  ErrorMessage,
  Badge,
  cn,
  LiveAnnouncer,
  SkipLink,
} from "@albora/ui-web";
import { Post, PostLoading } from "./post";
import { FeedStyles } from "./feed-styles";
import { MirrorGrid, MirrorGridLoading } from "./mirror-grid";
import { HourStrip, HourStripLoading } from "./hour-strip";
import { FeedFilterPanel } from "../ui/feed-filter-panel";
import { TemporalFilter } from "../ui/temporal-filter";
import { FeedFooter } from "../ui/feed-footer";
import { GateOpenedOverlay } from "../ui/gate-opened-overlay";
import { NewPhotosButton } from "../ui/new-photos-button";
import { FeedEmptyState } from "../ui/feed-empty-state";

// Code splitting: lazy load heavy components
const Viewer = dynamic(() => import("./viewer").then(m => ({ default: m.Viewer })), {
  ssr: false,
});

const ShareConsentSheet = dynamic(
  () => import("@/features/my-photos/components/client/share-consent-sheet").then(m => ({ default: m.ShareConsentSheet })),
  { ssr: false }
);

export type FeedCopy = {
  missionTitle: string;
};

type FeedPageProps = {
  slug: string;
  eventTitle: string;
  missions: FilterMission[];
  copy: FeedCopy;
  cameraPath: string;
  hostMessageLabel: string;
  anfitriaoPlural: string;
  eventoId: string;
  sessaoId: string;
};

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
}: FeedPageProps) {
  const base = `/e/${encodeURIComponent(slug)}`;
  const router = useRouter();

  // Core hooks
  const filtro = useFeedFilter(missions);
  const temporal = useTemporalFilter();
  const { estado, carregarMais, recomecar, atualizarReacoes } = useFeed(
    filtro.missionId,
    temporal.periodo
  );
  const compartilhar = useShare(eventoId, sessaoId);

  // UI state hooks
  const movimentoReduzido = useReducedMotion();
  const newItems = useNewItemsNotification(estado.itens[0]?.id ?? null);
  const gate = useGateTransition(estado.interacao);

  // Derived state
  const espelho = estado.interacao === "espelho";
  const completo = !espelho;
  const primeiraCarga = !estado.jaCarregou && estado.carregando;
  const vazio = estado.jaCarregou && estado.itens.length === 0 && estado.falha === null;
  const temMais = !estado.fim && estado.falha === null;

  const grupos = useMemo(
    () => groupByHour(estado.itens, { temMais }),
    [estado.itens, temMais]
  );

  // Viewer state
  const viewer = useFeedViewer(grupos);
  const mirror = useProfileViewer();

  // Badge de contagem
  const contagem = estado.itens.length > 0 ? `${estado.itens.length} fotos` : undefined;

  // Event handlers memoized
  const abrirPost = viewer.abrir;
  const handleAbrirPost = useCallback(
    (itemId: string) => {
      const grupo = grupos.find((g) => g.itens.some((i) => i.id === itemId));
      if (grupo) abrirPost(grupo, itemId);
    },
    [grupos, abrirPost],
  );

  const handleVerAutor = useCallback((id: string) => {
    router.push(`${base}/g/${encodeURIComponent(id)}`);
  }, [router, base]);

  const handleCompartilhar = useCallback((uploadId: string) => {
    void compartilhar.compartilhar(uploadId);
  }, [compartilhar]);

  const handleCompartilharViewer = useCallback(() => {
    const atual = viewer.itensAbertos[viewer.indiceAtual];
    if (atual) void compartilhar.compartilhar(atual.id);
  }, [viewer.itensAbertos, viewer.indiceAtual, compartilhar]);

  const handleConfirmarConsentimento = useCallback((nomeNaMoldura: boolean) => {
    if (compartilhar.pedindoConsentimento) {
      void compartilhar.confirmarConsentimento(
        compartilhar.pedindoConsentimento,
        nomeNaMoldura,
      );
    }
  }, [compartilhar]);

  return (
    <>
      <SkipLink />
      <FeedStyles />
      <LiveAnnouncer />

      {gate.gateOpened && <GateOpenedOverlay onClose={gate.close} cameraPath={cameraPath} />}

      {newItems.hasNew && !viewer.grupoAberto && mirror.indice === null && (
        <NewPhotosButton onClick={newItems.scrollToTop} />
      )}

      <GuestShell>
        <GuestMain>
          <GuestHeader
            title={eventTitle}
            homeHref={`${base}/cover`}
            action={contagem ? <Badge tone="outline">{contagem}</Badge> : undefined}
          />

          <HostMessageCard label={hostMessageLabel} hostName={eventTitle} />

          {espelho && estado.jaCarregou && (
            <GateNotice>
              Comentários abrem no horário escolhido por {anfitriaoPlural}. Pode curtir à vontade
              — continue fotografando, tudo já está no álbum.
            </GateNotice>
          )}

          {primeiraCarga && completo && <HourStripLoading />}
          {primeiraCarga && espelho && <MirrorGridLoading />}

          {completo && (
            <TemporalFilter periodo={temporal.periodo} onSelect={temporal.setPeriodo} />
          )}

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
            <FeedFilterPanel
              label={copy.missionTitle}
              missions={missions}
              selected={filtro.missionId}
              onSelect={filtro.setFiltro}
            />
          )}

          {estado.midiaIndisponivel && (
            <p className="mb-4 text-[0.9rem] leading-relaxed text-ink-2">
              As fotos ainda não abriram. Elas aparecem sozinhas quando {anfitriaoPlural}{" "}
              liberarem.
            </p>
          )}

          {compartilhar.erro && <ErrorMessage>{compartilhar.erro}</ErrorMessage>}

          {primeiraCarga && completo && (
            <FeedColumn>
              <PostLoading />
              <PostLoading />
            </FeedColumn>
          )}

          {vazio && (
            <FeedEmptyState
              interacao={estado.interacao}
              filtroMissao={filtro.missionId}
              {...(filtro.filtroAtivo?.title
                ? { filtroMissaoTitulo: filtro.filtroAtivo.title }
                : {})}
              filtroPeriodo={temporal.periodo}
              cameraPath={cameraPath}
            />
          )}

          {espelho && estado.itens.length > 0 && (
            <MirrorGrid
              itens={estado.itens}
              urls={estado.urls}
              cameraPath={cameraPath}
              onAbrir={mirror.abrir}
            />
          )}

          {completo && estado.itens.length > 0 && (
            <FeedColumn withDivider key={`feed-${temporal.periodo}`}>
              {estado.itens.map((item) => {
                const isVideo = isVideoMime(item.mime);
                const chaveMidia = isVideo ? item.chaveFull : item.chaveThumb;
                return (
                  <Post
                    key={item.id}
                    uploadId={item.id}
                    interacao={estado.interacao}
                    {...(item.reacoes !== undefined ? { reacoes: item.reacoes } : {})}
                    {...(item.minhaReacao !== undefined
                      ? { minhaReacao: item.minhaReacao }
                      : {})}
                    {...(item.sessaoAutor ? { sessaoAutor: item.sessaoAutor } : {})}
                    {...(item.sessaoAutor
                      ? {
                          autorHref: `${base}/g/${encodeURIComponent(item.sessaoAutor)}`,
                          linkComponent: Link,
                          onVerAutor: handleVerAutor,
                        }
                      : {})}
                    {...(item.minha !== undefined ? { minha: item.minha } : {})}
                    onReacoes={(resultado) => atualizarReacoes(item.id, resultado)}
                    onBloqueado={recomecar}
                    onCompartilhar={() => handleCompartilhar(item.id)}
                    compartilhando={compartilhar.compartilhandoId === item.id}
                    url={estado.urls.get(chaveMidia)?.url ?? null}
                    autor={item.autor}
                    legenda={item.legenda}
                    lugar={item.lugar}
                    criadaEm={item.criadaEm}
                    isVideo={isVideo}
                    {...(item.largura !== undefined ? { largura: item.largura } : {})}
                    {...(item.altura !== undefined ? { altura: item.altura } : {})}
                    onAbrir={() => handleAbrirPost(item.id)}
                  />
                );
              })}
            </FeedColumn>
          )}

          <FeedFooter
            estado={estado}
            hasItems={estado.itens.length > 0}
            onLoadMore={carregarMais}
            onRetry={recomecar}
          />
        </GuestMain>
      </GuestShell>

      <FloatingNav base={base} linkComponent={Link} />

      {espelho && mirror.indice !== null && estado.itens.length > 0 && (
        <Viewer
          itens={estado.itens}
          indice={mirror.indice}
          hora={horaDoItem(estado.itens[mirror.indice])}
          urls={estado.urls}
          interacao={estado.interacao}
          cameraPath={cameraPath}
          movimentoReduzido={movimentoReduzido}
          onIr={mirror.navegar}
          onSair={mirror.fechar}
          onReacoes={atualizarReacoes}
          onVerAutor={handleVerAutor}
        />
      )}

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
          onCompartilhar={handleCompartilharViewer}
          compartilhando={
            compartilhar.compartilhandoId === viewer.itensAbertos[viewer.indiceAtual]?.id
          }
          onVerAutor={handleVerAutor}
        />
      )}

      <ShareConsentSheet
        open={compartilhar.pedindoConsentimento !== null}
        onClose={() => compartilhar.cancelarConsentimento()}
        onConfirm={handleConfirmarConsentimento}
      />
    </>
  );
}

function horaDoItem(item: { criadaEm: string } | undefined): number {
  return item ? new Date(item.criadaEm).getHours() : 0;
}

function FeedColumn({
  children,
  withDivider,
}: {
  children: React.ReactNode;
  withDivider?: boolean;
}) {
  return (
    <div
      role="feed"
      aria-label="Feed de fotos"
      className={cn("grid feed-fade", withDivider && "border-t border-linha")}
    >
      {children}
    </div>
  );
}
