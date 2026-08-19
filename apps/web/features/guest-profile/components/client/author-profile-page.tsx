"use client";

import React from "react";
import Link from "next/link";
import {
  BackIcon,
  EmptyState,
  FloatingNav,
  GuestMain,
  GuestShell,
  PhotoCard,
  PostAuthorAvatar,
  SecondaryButton,
} from "@albora/ui-web";
import { formatQuando } from "@/features/home/lib/format-quando";
import { useAuthorFeed } from "../../hooks/use-author-feed";
import type { EstadoFeed } from "@/features/feed/hooks/use-feed";

/**
 * O perfil de um convidado dentro do evento — nome + fotos publicadas por
 * ele. `useAuthorFeed` já bate em `/api/guests/[autorId]`, que aplica RLS,
 * gate e bloqueio simétrico; esta tela só monta o que ele devolve, sem
 * decisão própria sobre visibilidade (spec "autor clicável", ADR 0009).
 */
export function AuthorProfilePage({ slug, autorId }: { slug: string; autorId: string }) {
  const base = `/e/${encodeURIComponent(slug)}`;
  const { estado, carregarMais } = useAuthorFeed(autorId);

  const primeiraCarga = !estado.feed.jaCarregou && estado.feed.carregando;
  const vazio =
    !estado.naoEncontrado &&
    estado.feed.jaCarregou &&
    estado.feed.itens.length === 0 &&
    estado.feed.falha === null;

  return (
    <>
      <GuestShell>
        <GuestMain>
          <CabecalhoPerfil nome={estado.nome} base={base} />

          {estado.naoEncontrado && <PerfilIndisponivel />}

          {!estado.naoEncontrado && primeiraCarga && (
            <div className="mt-5 grid gap-6">
              <CardLoading />
              <CardLoading />
            </div>
          )}

          {!estado.naoEncontrado && vazio && (
            <div className="mt-5">
              <EmptyState
                title="Ainda não tem foto aqui."
                lede="Quando esta pessoa mandar uma foto, ela aparece aqui."
                cameraPath={`${base}/photo`}
              />
            </div>
          )}

          {!estado.naoEncontrado && estado.feed.itens.length > 0 && (
            <div className="mt-5 grid gap-6">
              {estado.feed.itens.map((item) => (
                <PhotoCard
                  key={item.id}
                  autor={item.autor}
                  quando={formatQuando(item.criadaEm)}
                  {...(estado.feed.urls.get(item.chaveThumb)?.url
                    ? { fotoUrl: estado.feed.urls.get(item.chaveThumb)!.url }
                    : {})}
                  curtidas={item.reacoes ?? 0}
                  curtido={Boolean(item.minhaReacao)}
                  comentarios={0}
                />
              ))}
            </div>
          )}

          {!estado.naoEncontrado && <Rodape estado={estado.feed} onVerMais={carregarMais} />}
        </GuestMain>
      </GuestShell>

      <FloatingNav active="inicio" base={base} linkComponent={Link} />
    </>
  );
}

function CabecalhoPerfil({ nome, base }: { nome: string | null; base: string }) {
  return (
    <header className="flex items-center gap-3 pb-3.5 pt-1.5">
      <Link href={base} aria-label="Voltar para a Home" className="text-ink no-underline">
        <BackIcon />
      </Link>
      {nome && <PostAuthorAvatar name={nome} />}
      <span className="flex-1 truncate font-titulo text-[1.125rem] tracking-titulo text-ink">
        {nome ?? "Perfil"}
      </span>
    </header>
  );
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
    <div className="mt-6">
      <SecondaryButton onClick={onVerMais} disabled={estado.carregando}>
        {estado.carregando ? "Carregando…" : "Ver mais"}
      </SecondaryButton>
    </div>
  );
}
