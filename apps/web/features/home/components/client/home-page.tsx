"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
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
} from "@albora/ui-web";
import { useFeed, podeCarregarMais, type EstadoFeed } from "@/features/feed/hooks/use-feed";
import { useInfiniteScroll } from "@/features/feed/hooks/use-infinite-scroll";
import { deriveStories } from "../../lib/derive-stories";
import { HomeFeedCard } from "./home-feed-card";

/**
 * A Home do convidado com sessão: stories no topo, feed vivo embaixo.
 *
 * Os itens vêm de `useFeed` — o mesmo gancho de `/feed` (spec 008/014, ADR
 * 0009), reaproveitado em vez de duplicado: cursor, gate e renovação de URL
 * já resolvidos ali. O que muda aqui é a composição visual (`PhotoCard` +
 * `StoryRail` do kit novo, `FloatingNav` em vez de `GuestTabBar`) e a
 * ausência da tira de horas e do visualizador em tela cheia — a Home é a
 * porta de entrada, não a leitura funda; quem quer isso vai pra `/feed`.
 *
 * A próxima página chega sozinha: pivô assumido pelo mantenedor no design
 * doc `2026-08-17-convidado-social-moderno-design.md` §5.4, que substitui a
 * regra antiga de "toque, nunca rolagem infinita" do `DESIGN.md` §1. O
 * gatilho troca de botão para `useInfiniteScroll` (sentinela +
 * `IntersectionObserver`); a paginação por cursor de `useFeed` não muda uma
 * linha — só quem a chama muda.
 */
export function HomePage({
  slug,
  eventName,
  coverHref,
  cameraPath,
}: {
  slug: string;
  eventName: string;
  coverHref: string;
  cameraPath: string;
}) {
  const router = useRouter();
  const base = `/e/${encodeURIComponent(slug)}`;

  const { estado, carregarMais, atualizarReacoes } = useFeed(null);

  const primeiraCarga = !estado.jaCarregou && estado.carregando;
  const vazio = estado.jaCarregou && estado.itens.length === 0 && estado.falha === null;
  const espelho = estado.interacao === "espelho";
  const contagem = estado.itens.length > 0 ? `${estado.itens.length} fotos` : undefined;

  const stories: StoryItem[] = useMemo(
    () =>
      deriveStories(estado.itens).map((pessoa) => ({
        id: pessoa.id,
        nome: pessoa.nome,
        capaUrl: estado.urls.get(pessoa.chaveThumb)?.url,
      })),
    [estado.itens, estado.urls],
  );

  return (
    <>
      <GuestShell>
        <GuestMain>
          <GuestHeader
            title={eventName}
            homeHref={coverHref}
            action={contagem ? <Badge>{contagem}</Badge> : undefined}
          />

          <StoryRail items={stories} onAdd={() => router.push(cameraPath)} />

          {espelho && estado.jaCarregou && (
            <div className="mt-4">
              <GateNotice>
                Comentários abrem no horário escolhido pelos noivos. Pode curtir à vontade —
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
              {estado.itens.map((item) => (
                <HomeFeedCard
                  key={item.id}
                  item={item}
                  interacao={estado.interacao}
                  base={base}
                  url={estado.urls.get(item.chaveThumb)?.url ?? null}
                  onReacoes={atualizarReacoes}
                />
              ))}
            </div>
          )}

          <Rodape estado={estado} onVerMais={carregarMais} />
        </GuestMain>
      </GuestShell>

      <FloatingNav active="inicio" base={base} linkComponent={Link} />
    </>
  );
}

function CardLoading() {
  return (
    <div aria-hidden className="grid gap-3">
      <div className="flex items-center gap-2.5">
        <span className="size-[1.875rem] rounded-full bg-ink-skeleton" />
        <span className="h-3.5 w-24 rounded-pilula bg-ink-skeleton" />
      </div>
      <div className="aspect-4/5 rounded-media bg-ink-skeleton" />
    </div>
  );
}

function Rodape({ estado, onVerMais }: { estado: EstadoFeed; onVerMais: () => void }) {
  const sentinela = useInfiniteScroll(onVerMais, podeCarregarMais(estado), estado.itens.length);

  if (estado.falha === "sessao") {
    return (
      <p className="mt-6 text-center text-[0.9rem] leading-relaxed text-ink-2">
        Sua entrada expirou. Escaneie o QR da mesa de novo para continuar vendo as fotos.
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
