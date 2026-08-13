import { resolverSlug } from "@albora/db";
import { PACKS, texto } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { getPool } from "@/lib/db";
import { GUEST_SESSION_COOKIE, guestSessionFromToken } from "@/lib/session";
import { EntryFlow } from "@/features/guest/components/client/entry-flow";
import { EventNotice } from "@/features/guest/components/client/event-notice";

/**
 * A rota do QR. É a **exceção arquitetural** declarada no ADR 0005: o
 * servidor entrega o casco e as meta tags, e o resto é cliente.
 *
 * O casco existe por um motivo concreto: quando alguém manda o link no grupo
 * do WhatsApp — que é o segundo canal de distribuição do evento — a
 * pré-visualização precisa aparecer. Um SPA puro mostraria uma caixa vazia.
 */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

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

export default async function Pagina({ params }: Props) {
  const { slug } = await params;
  const r = await resolverSlug(getPool(), slug, new Date());

  if (r.estado === "desconhecido") {
    return (
      <EventNotice
        title="Esse endereço não abre nenhuma festa"
        body="Pode ser uma letra trocada. Tente de novo pelo código da mesa."
        showRescue
      />
    );
  }

  if (r.estado === "slug_rotacionado") {
    // A placa já saiu da gráfica e o QR na mão da pessoa é o velho. Quem
    // escaneou a antiga precisa de orientação e de um caminho, nunca de um
    // erro seco (N1.5).
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
  if (sessao?.eventoId === r.evento.eventoId) {
    redirect(`/e/${encodeURIComponent(slug)}/cover`);
  }

  return (
    <div
      style={
        paraVariaveis(
          resolverTokens({
            marca: MARCA_ALBORA,
            pack: {
              ...(PACKS[r.evento.packId]?.tokens ?? {}),
              fundo: "escuro",
            },
          }),
        ) as CSSProperties
      }
    >
      <EntryFlow
        eventoId={r.evento.eventoId}
        slug={slug}
        nomeEvento={
          PACKS[r.evento.packId] ? texto(PACKS[r.evento.packId]!, "landing.exemplo.nome") : "A festa"
        }
        saudacao={
          PACKS[r.evento.packId] ? texto(PACKS[r.evento.packId]!, "convidado.saudacao") : "Bem-vindo"
        }
      />
    </div>
  );
}
