"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState, FloatingNav, GuestMain, GuestShell, SecondaryButton, SkipLink } from "@albora/ui-web";
import { Viewer } from "@/features/feed/components/client/viewer";
import { useReducedMotion } from "@/features/feed/hooks/use-reduced-motion";
import { podeCarregarMais, type EstadoFeed } from "@/features/feed/hooks/use-feed";
import { useInfiniteScroll } from "@/features/feed/hooks/use-infinite-scroll";
import { useAuthorFeed } from "../../hooks/use-author-feed";
import { useProfileViewer } from "../../hooks/use-profile-viewer";
import { PhotoGrid } from "../ui/photo-grid";
import { ProfileHeader } from "../ui/profile-header";

/** Sem decisão de visibilidade própria — RLS, gate e bloqueio ficam em `/api/guests/[autorId]`; esta tela só monta o que a API devolve (ADR 0009). */
export function AuthorProfilePage({ slug, autorId }: { slug: string; autorId: string }) {
  const router = useRouter();
  const base = `/e/${encodeURIComponent(slug)}`;
  const cameraPath = `${base}/photo`;
  const { estado, carregarMais } = useAuthorFeed(autorId);
  const viewer = useProfileViewer();
  const movimentoReduzido = useReducedMotion();

  const primeiraCarga = !estado.feed.jaCarregou && estado.feed.carregando;
  const vazio =
    !estado.naoEncontrado &&
    estado.feed.jaCarregou &&
    estado.feed.itens.length === 0 &&
    estado.feed.falha === null;

  return (
    <>
      <SkipLink />

      <GuestShell>
        <GuestMain>
          <ProfileHeader
            nome={estado.nome}
            backHref={`${base}/cover`}
            totalFotos={estado.stats?.totalFotos ?? null}
            totalCurtidas={estado.stats?.totalCurtidas ?? null}
          />

          {estado.naoEncontrado && <PerfilIndisponivel />}

          {!estado.naoEncontrado && primeiraCarga && <GradeLoading />}

          {!estado.naoEncontrado && vazio && (
            <div className="mt-5">
              <EmptyState
                title="Ainda não tem foto aqui."
                lede="Quando esta pessoa mandar uma foto, ela aparece aqui."
                cameraPath={cameraPath}
              />
            </div>
          )}

          {!estado.naoEncontrado && estado.feed.itens.length > 0 && estado.nome && (
            <PhotoGrid
              itens={estado.feed.itens}
              urls={estado.feed.urls}
              autor={estado.nome}
              onAbrir={viewer.abrir}
            />
          )}

          {!estado.naoEncontrado && <Rodape estado={estado.feed} onVerMais={carregarMais} />}
        </GuestMain>
      </GuestShell>

      <FloatingNav base={base} linkComponent={Link} />

      {viewer.indice !== null && estado.feed.itens.length > 0 && (
        <Viewer
          itens={estado.feed.itens}
          indice={viewer.indice}
          hora={horaDoItem(estado.feed.itens[viewer.indice])}
          rotulo={estado.nome ?? "Perfil"}
          urls={estado.feed.urls}
          interacao={estado.feed.interacao}
          cameraPath={cameraPath}
          movimentoReduzido={movimentoReduzido}
          onIr={viewer.navegar}
          onSair={viewer.fechar}
          onVerAutor={(id) => router.push(`${base}/g/${encodeURIComponent(id)}`)}
        />
      )}
    </>
  );
}

function horaDoItem(item: { criadaEm: string } | undefined): number {
  return item ? new Date(item.criadaEm).getHours() : 0;
}

function PerfilIndisponivel() {
  return (
    <div className="mt-10 text-center">
      <p className="mb-3 font-titulo text-[1.6rem] font-medium leading-snug tracking-titulo [text-wrap:balance]">
        Esse perfil não está disponível
      </p>
      <p className="m-0 leading-relaxed text-ink-2">
        Pode ser um link antigo, ou alguém fora do seu alcance.
      </p>
    </div>
  );
}

function GradeLoading() {
  return (
    <div aria-hidden className="mt-1 grid grid-cols-3 gap-1">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="aspect-square bg-ink-skeleton animate-pulse" />
      ))}
    </div>
  );
}

function Rodape({ estado, onVerMais }: { estado: EstadoFeed; onVerMais: () => void }) {
  const sentinela = useInfiniteScroll(onVerMais, podeCarregarMais(estado), estado.itens.length);

  if (estado.falha === "sessao") {
    return (
      <p className="mt-6 text-center text-[0.9rem] leading-relaxed text-ink-2">
        Sua entrada expirou.{" "}
        <a href="/scan" className="text-acento underline">
          Escaneie o QR da mesa
        </a>{" "}
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
