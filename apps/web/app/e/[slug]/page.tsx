import { resolverSlug } from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";
import { parseEntryVia } from "@albora/core";
import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { CSSProperties } from "react";
import { getPool } from "@/lib/db";
import { GUEST_SESSION_COOKIE, guestSessionFromToken } from "@/lib/session";
import { EntryFlow } from "@/features/guest/components/client/entry-flow";
import { EventNotice } from "@/features/guest/components/client/event-notice";
import { isSameEventSession } from "@/features/guest/data/guest-session";
import { HomeContent } from "@/features/home/components/server/home-content";
import { HomePageSkeleton } from "@/features/home/components/skeletons/home-page-skeleton";

/** Exceção do ADR 0005 — casco SSR existe para meta tags no WhatsApp; SPA puro mostraria caixa vazia. */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ via?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = await resolverSlug(getPool(), slug, new Date());

  if (r.estado === "desconhecido") {
    return { title: "Albora", robots: { index: false } };
  }

  return {
    title: "Fotos da festa",
    description: "Suas fotos entram no álbum de quem te convidou.",
    // O evento não é público: quem tem o link entra, quem não tem não acha.
    robots: { index: false, follow: false },
  };
}

export default async function Pagina({ params, searchParams }: Props) {
  const { slug } = await params;
  const { via: viaParam } = await searchParams;
  const via = parseEntryVia(viaParam);
  const r = await resolverSlug(getPool(), slug, new Date());

  if (r.estado === "desconhecido") {
    notFound();
  }

  if (r.estado === "slug_rotacionado") {
    // QR antigo ainda aponta pra placa trocada — orienta com caminho, nunca erro seco (N1.5).
    return (
      <EventNotice
        title="Esse código foi trocado"
        body="A festa existe, mas o endereço mudou. Use o QR mais novo da mesa, ou peça o link a quem te convidou."
        showRescue
      />
    );
  }

  if (r.estado === "encerrado") {
    return (
      <EventNotice
        title="Essa festa já foi"
        body="O envio de fotos ficou aberto por 48 horas depois do fim. Se você mandou fotos, elas estão com quem te convidou."
      />
    );
  }

  if (r.estado === "nao_comecou") {
    // Existe e é legítimo — só não é hora. Dizer quando é vale mais que
    // dizer que não pode.
    return (
      <EventNotice
        title="Ainda não começou"
        body="Guarde este endereço: quando a festa começar, é por aqui que suas fotos entram."
        at={r.evento.comecaEm}
      />
    );
  }

  const sessao = await guestSessionFromToken((await cookies()).get(GUEST_SESSION_COOKIE)?.value);

  // Sessão do MESMO evento vai direto pra Home; sem sessão ou de outro evento (token não é transferível entre festas), segue o fluxo nome + consentimento antes da captura.
  if (isSameEventSession(sessao, r.evento.eventoId)) {
    return (
      <Suspense fallback={<HomePageSkeleton />}>
        <HomeContent slug={slug} evento={r.evento} sessaoId={sessao.sessaoId} />
      </Suspense>
    );
  }

  return (
    <div
      style={
        toVariables(
          resolveTokens({
            marca: ALBORA_BRAND,
            pack: {
              ...(PACKS[r.evento.packId]?.tokens ?? {}),
              background: "dark",
            },
          }),
        ) as CSSProperties
      }
    >
      <EntryFlow
        eventoId={r.evento.eventoId}
        slug={slug}
        via={via}
        nomeEvento={
          PACKS[r.evento.packId] ? resolvePackText(PACKS[r.evento.packId]!, "landing.exemplo.nome") : "A festa"
        }
        saudacao={
          PACKS[r.evento.packId] ? resolvePackText(PACKS[r.evento.packId]!, "convidado.saudacao") : "Bem-vindo"
        }
      />
    </div>
  );
}
