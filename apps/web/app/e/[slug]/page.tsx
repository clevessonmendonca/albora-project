import { resolverSlug } from "@albora/db";
import type { Metadata } from "next";
import { banco } from "@/lib/banco";
import { Entrada } from "./entrada";
import { Aviso } from "./aviso";

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
  const r = await resolverSlug(banco(), slug, new Date());

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
  const r = await resolverSlug(banco(), slug, new Date());

  if (r.estado === "desconhecido") {
    return (
      <Aviso
        titulo="Esse endereço não abre nenhuma festa"
        texto="Confira se o código foi digitado certo, ou escaneie o QR da mesa de novo."
      />
    );
  }

  if (r.estado === "slug_rotacionado") {
    // A placa já saiu da gráfica. Quem escaneou a antiga precisa de
    // orientação, nunca de um erro seco (N1.5).
    return (
      <Aviso
        titulo="Esse código foi trocado"
        texto="A festa existe, mas o endereço mudou. Procure o QR mais recente na mesa ou peça o link a quem te convidou."
      />
    );
  }

  if (r.estado === "encerrado") {
    return (
      <Aviso
        titulo="Essa festa já foi"
        texto="O envio de fotos ficou aberto por 48 horas depois do fim. Se você mandou fotos, elas estão com quem te convidou."
      />
    );
  }

  if (r.estado === "nao_comecou") {
    // Existe e é legítimo — só não é hora. Dizer quando é vale mais que
    // dizer que não pode.
    return (
      <Aviso
        titulo="Ainda não começou"
        texto="Guarde este endereço: quando a festa começar, é por aqui que suas fotos entram."
        quando={r.evento.comecaEm}
      />
    );
  }

  return <Entrada eventoId={r.evento.eventoId} packId={r.evento.packId} />;
}
