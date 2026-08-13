import { resolverSlug } from "@albora/db";
import { PACKS, texto } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
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
        texto="Pode ser uma letra trocada. Tente de novo pelo código da mesa."
        resgate
      />
    );
  }

  if (r.estado === "slug_rotacionado") {
    // A placa já saiu da gráfica e o QR na mão da pessoa é o velho. Quem
    // escaneou a antiga precisa de orientação e de um caminho, nunca de um
    // erro seco (N1.5).
    return (
      <Aviso
        titulo="Esse código foi trocado"
        texto="A festa existe, mas o endereço mudou. Use o QR mais novo da mesa, ou peça o link a quem te convidou."
        resgate
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
      <Entrada
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
