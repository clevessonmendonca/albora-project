"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StoryViewer } from "./story-viewer";
import {
  Badge,
  EmptyState,
  FloatingNav,
  GateNotice,
  GuestHeader,
  GuestMain,
  GuestShell,
  SecondaryButton,
  StoryRail,
  type StoryItem,
  SkipLink,
} from "@albora/ui-web";
import { useFeed, podeCarregarMais, type EstadoFeed } from "@/features/feed/hooks/use-feed";
import { useInfiniteScroll } from "@/features/feed/hooks/use-infinite-scroll";
import { useReducedMotion } from "@/features/feed/hooks/use-reduced-motion";
import { paraStoryItem, useStories } from "../../hooks/use-stories";
import { HomeFeedCard } from "./home-feed-card";
import { MissionsBadge } from "@/features/missions/components/ui/missions-badge";
import { photoPathForMission, proximaMissao } from "@/features/missions/lib/missions-utils";
import type { MissionWithStatus } from "@/features/guest/lib/resolved-missions";

const Viewer = dynamic(
  () => import("@/features/feed/components/client/viewer").then((m) => ({ default: m.Viewer })),
  { ssr: false },
);

/** Reutiliza `useFeed` de `/feed` sem duplicar cursor/gate; scroll infinito substitui "toque" (design doc §5.4). Story e post são fontes separadas — story some após 24h sem ter estado no mural. */
export function HomePage({
  slug,
  eventName,
  coverHref,
  cameraPath,
  anfitriaoPlural,
  missions = [],
}: {
  slug: string;
  eventName: string;
  coverHref: string;
  cameraPath: string;
  anfitriaoPlural: string;
  missions?: MissionWithStatus[];
}) {
  const router = useRouter();
  const base = `/e/${encodeURIComponent(slug)}`;

  const { estado, carregarMais, atualizarReacoes } = useFeed(null);
  const historias = useStories();
  const movimentoReduzido = useReducedMotion();

  const [visto, setVisto] = useState<ReadonlySet<string>>(() => new Set());
  const [storyIdx, setStoryIdx] = useState<number | null>(null);
  const [viewerIndice, setViewerIndice] = useState<number | null>(null);
  const scrollSalvo = useRef<number | null>(null);

  const primeiraCarga = !estado.jaCarregou && estado.carregando;
  const vazio = estado.jaCarregou && estado.itens.length === 0 && estado.falha === null;
  const espelho = estado.interacao === "espelho";
  const contagem = estado.itens.length > 0 ? `${estado.itens.length} fotos` : undefined;

  const handleVerAutor = useCallback(
    (id: string) => {
      router.push(`${base}/g/${encodeURIComponent(id)}`);
    },
    [router, base],
  );

  const abrirViewer = useCallback((indice: number) => {
    scrollSalvo.current = window.scrollY;
    setViewerIndice(indice);
  }, []);

  const fecharViewer = useCallback(() => {
    setViewerIndice(null);
    if (scrollSalvo.current !== null) {
      window.scrollTo({ top: scrollSalvo.current, behavior: "auto" });
      scrollSalvo.current = null;
    }
  }, []);

  useEffect(() => {
    if (viewerIndice === null) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [viewerIndice]);

  const stories: StoryItem[] = useMemo(
    () =>
      historias.itens.map((s) => ({
        ...paraStoryItem(s, historias.urls),
        novo: !!s.sessaoId && !visto.has(s.id),
        ...(s.sessaoId
          ? {
              onPress: () => {
                const i = historias.itens.findIndex((h) => h.id === s.id);
                setStoryIdx(i >= 0 ? i : null);
              },
            }
          : {}),
      })),
    [historias.itens, historias.urls, visto],
  );

  return (
    <>
      <SkipLink />

      <style>{`
        @keyframes home-trilho-revela {
          from { opacity: 0; transform: translateY(0.5rem); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .home-trilho-anima { animation: home-trilho-revela var(--tempo-lento) var(--curva) both; }
        @media (prefers-reduced-motion: reduce) {
          .home-trilho-anima { animation: none !important; }
        }
      `}</style>

      <GuestShell>
        <GuestMain>
          <GuestHeader
            title={eventName}
            homeHref={coverHref}
            action={contagem ? <Badge>{contagem}</Badge> : undefined}
          />

          {missions.length > 0 && <MissionsCue slug={slug} missions={missions} />}

          <div className="home-trilho-anima">
            <StoryRail items={stories} onAdd={() => router.push(cameraPath)} />
          </div>

          {espelho && estado.jaCarregou && (
            <div className="mt-4">
              <GateNotice>
                Comentários abrem no horário escolhido por {anfitriaoPlural}. Pode curtir à vontade —
                continue fotografando, tudo já está no álbum.
              </GateNotice>
            </div>
          )}

          {primeiraCarga && (
            <div className="mt-5 grid gap-6">
              <CardLoading />
              <CardLoading />
            </div>
          )}

          {vazio && (
            <div className="mt-5">
              <EmptyState
                title="Ainda não tem foto aqui."
                lede="Seja o primeiro a fotografar."
                cameraPath={cameraPath}
              />
            </div>
          )}

          {estado.itens.length > 0 && (
            <div className="mt-5 grid gap-6">
              {estado.itens.map((item, indice) => (
                <HomeFeedCard
                  key={item.id}
                  item={item}
                  interacao={estado.interacao}
                  base={base}
                  url={estado.urls.get(item.chaveThumb)?.url ?? null}
                  onReacoes={atualizarReacoes}
                  onAbrir={() => abrirViewer(indice)}
                />
              ))}
            </div>
          )}

          <Rodape estado={estado} onVerMais={carregarMais} />
        </GuestMain>
      </GuestShell>

      <FloatingNav active="inicio" base={base} linkComponent={Link} />

      {storyIdx !== null && (
        <StoryViewer
          stories={historias.itens}
          urls={historias.urls}
          initialIndex={storyIdx}
          vistos={visto}
          onClose={() => setStoryIdx(null)}
          onVisto={(id) => setVisto((v) => (v.has(id) ? v : new Set([...v, id])))}
        />
      )}

      {viewerIndice !== null && estado.itens.length > 0 && (
        <Viewer
          itens={estado.itens}
          indice={viewerIndice}
          hora={horaDoItem(estado.itens[viewerIndice])}
          urls={estado.urls}
          interacao={estado.interacao}
          cameraPath={cameraPath}
          movimentoReduzido={movimentoReduzido}
          onIr={setViewerIndice}
          onSair={fecharViewer}
          onReacoes={atualizarReacoes}
          onVerAutor={handleVerAutor}
        />
      )}
    </>
  );
}

function horaDoItem(item: { criadaEm: string } | undefined): number {
  return item ? new Date(item.criadaEm).getHours() : 0;
}

function MissionsCue({ slug, missions }: { slug: string; missions: MissionWithStatus[] }) {
  const done = missions.filter((m) => m.done).length;
  const current = proximaMissao(missions);
  const href = current
    ? photoPathForMission(slug, current.id)
    : `/e/${encodeURIComponent(slug)}/missions`;

  return (
    <Link
      href={href}
      className="elev-1 mb-4 flex min-h-11 items-center justify-between gap-3 rounded-token px-4 py-3.5 text-inherit no-underline transition-[transform,opacity] duration-instantaneo ease-mola active:scale-[0.98] hover:opacity-90"
    >
      <span className="min-w-0">
        <span className="block text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
          {current ? "Próxima missão" : "Missões"}
        </span>
        <span className="block truncate font-titulo text-[0.9375rem] tracking-titulo text-ink">
          {current ? current.title : "Todas completas"}
        </span>
      </span>
      <MissionsBadge done={done} total={missions.length} variant="compact" />
    </Link>
  );
}

function CardLoading() {
  return (
    <div aria-hidden className="elev-1 grid gap-3 rounded-token p-3.5">
      <div className="flex items-center gap-2.5">
        <span className="size-[1.875rem] rounded-full bg-ink-skeleton animate-pulse" />
        <span className="h-3.5 w-24 rounded-pilula bg-ink-skeleton animate-pulse" />
      </div>
      <div className="aspect-4/5 rounded-media bg-ink-skeleton animate-pulse" />
    </div>
  );
}

function Rodape({ estado, onVerMais }: { estado: EstadoFeed; onVerMais: () => void }) {
  const sentinela = useInfiniteScroll(onVerMais, podeCarregarMais(estado), estado.itens.length);

  if (estado.falha === "sessao") {
    return (
      <p className="mt-6 text-center text-[0.9rem] leading-relaxed text-ink-2">
        Sua entrada expirou.{" "}
        <a href="/scan" className="text-acento underline">Escaneie o QR da mesa</a>{" "}
        de novo para continuar.
      </p>
    );
  }

  if (estado.falha !== null) {
    return (
      <div className="mt-6 text-center">
        <p className="mb-3 text-[0.9rem] leading-relaxed text-ink-2">
          Não consegui carregar mais fotos agora.
        </p>
        <SecondaryButton onClick={onVerMais}>Tentar de novo</SecondaryButton>
      </div>
    );
  }

  if (estado.fim || estado.cursor === null) return null;

  return (
    <div ref={sentinela} className="mt-6">
      {estado.carregando && (
        <p aria-live="polite" className="text-center text-[0.9rem] leading-relaxed text-ink-2">
          Carregando mais fotos…
        </p>
      )}
    </div>
  );
}
