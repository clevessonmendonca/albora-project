"use client";

import { isVideoMime } from "@albora/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { groupByHour } from "@/features/feed/lib/group-by-hour";
import { useFeed } from "@/features/feed/hooks/use-feed";
import { useFeedViewer } from "@/features/feed/hooks/use-feed-viewer";
import { useFeedFilter, type FilterMission } from "@/features/feed/hooks/use-feed-filter";
import { useTemporalFilter } from "@/features/feed/hooks/use-temporal-filter";
import { useReducedMotion } from "@/features/feed/hooks/use-reduced-motion";
import { useNewItemsNotification } from "@/features/feed/hooks/use-new-items-notification";
import { useGateTransition } from "@/features/feed/hooks/use-gate-transition";
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
  ErrorMessage,
  Badge,
  cn,
} from "@albora/ui-web";
import { Post, PostLoading } from "./post";
import { MirrorGrid, MirrorGridLoading } from "./mirror-grid";
import { Viewer } from "./viewer";
import { HourStrip, HourStripLoading } from "./hour-strip";
import { FeedFilterPanel } from "../ui/feed-filter-panel";
import { TemporalFilter } from "../ui/temporal-filter";
import { FeedFooter } from "../ui/feed-footer";
import { GateOpenedOverlay } from "../ui/gate-opened-overlay";
import { NewPhotosButton } from "../ui/new-photos-button";

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
  const { estado, carregarMais, recomecar, atualizarReacoes } = useFeed(filtro.missionId);
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

  // Badge de contagem
  const contagem = estado.itens.length > 0 ? `${estado.itens.length} fotos` : undefined;

  return (
    <>
      <FeedStyles />

      {gate.gateOpened && <GateOpenedOverlay onClose={gate.close} cameraPath={cameraPath} />}

      {newItems.hasNew && !viewer.grupoAberto && (
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
            <EmptyState
              title={
                completo && filtro.missionId !== null
                  ? "Ninguém fez essa ainda."
                  : "Ainda não tem foto aqui."
              }
              lede={
                completo && filtro.missionId !== null
                  ? "Sua foto pode ser a primeira."
                  : "Seja o primeiro a fotografar."
              }
              cameraPath={cameraPath}
            />
          )}

          {espelho && estado.itens.length > 0 && (
            <MirrorGrid itens={estado.itens} urls={estado.urls} cameraPath={cameraPath} />
          )}

          {completo && estado.itens.length > 0 && (
            <FeedColumn withDivider>
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
                    criadaEm={item.criadaEm}
                    isVideo={isVideo}
                    {...(item.largura !== undefined ? { largura: item.largura } : {})}
                    {...(item.altura !== undefined ? { altura: item.altura } : {})}
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
          compartilhando={
            compartilhar.compartilhandoId === viewer.itensAbertos[viewer.indiceAtual]?.id
          }
          onVerAutor={(id) => router.push(`${base}/g/${encodeURIComponent(id)}`)}
        />
      )}

      <ShareConsentSheet
        open={compartilhar.pedindoConsentimento !== null}
        onClose={() => compartilhar.cancelarConsentimento()}
        onConfirm={(nomeNaMoldura) => {
          if (compartilhar.pedindoConsentimento) {
            void compartilhar.confirmarConsentimento(
              compartilhar.pedindoConsentimento,
              nomeNaMoldura
            );
          }
        }}
      />
    </>
  );
}

function FeedColumn({
  children,
  withDivider,
}: {
  children: React.ReactNode;
  withDivider?: boolean;
}) {
  return <div className={cn("grid", withDivider && "border-t border-linha")}>{children}</div>;
}

function FeedStyles() {
  return (
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
  );
}
