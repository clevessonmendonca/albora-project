import { comEvento, listarDesafios, resolverSlug } from "@albora/db";
import { PACKS, texto, type Pack } from "@albora/packs";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { banco } from "@/lib/banco";
import { COOKIE_SESSAO, sessaoDoToken } from "@/lib/sessao";
import { Aviso } from "../aviso";
import { PaginaFeed } from "./pagina-feed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fotos da festa",
  // O evento não é público: quem tem o link entra, quem não tem não acha.
  robots: { index: false, follow: false },
};

/**
 * O feed do evento.
 *
 * As missões chegam **resolvidas** ao componente — quem traduz chave de
 * vocabulário é o pack, aqui. O que a página deliberadamente **não** faz é
 * decidir o que o convidado pode ver: o gate de interação é regra do servidor
 * da rota `/api/feed`, e uma segunda decisão aqui divergiria dela.
 */
export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await resolverSlug(banco(), slug, new Date());

  if (r.estado !== "aberto") {
    return (
      <Aviso
        titulo="Essa festa não está aberta agora"
        texto="Volte pelo QR da mesa para conferir."
      />
    );
  }

  const { eventoId, packId } = r.evento;
  const pack = PACKS[packId];

  const sessao = await sessaoDoToken((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!sessao) return <SemEntrada slug={slug} />;

  const desafios = await comEvento(banco(), eventoId, (c) =>
    listarDesafios(c, eventoId, sessao.sessaoId),
  );

  return (
    <PaginaFeed
      slug={slug}
      missoes={desafios.map((d) => ({
        id: d.id,
        titulo: pack ? texto(pack, d.chaveTitulo) : d.chaveTitulo,
      }))}
      textos={{ missaoTitulo: rotulo(pack, "missao.titulo") }}
      caminhoDaCamera={`/e/${encodeURIComponent(slug)}/foto`}
    />
  );
}

/**
 * Pack ausente é evento apontando para um pack que saiu do catálogo. A chave
 * crua aparece, que é bug visível em vez de tela vazia.
 */
function rotulo(pack: Pack | undefined, chave: string): string {
  return pack ? texto(pack, chave) : chave;
}

/**
 * Sem sessão não há feed: a rota confere o token e a identidade do convidado é
 * escopada a um evento (ADR 0009). O caminho de volta é o mesmo de sempre, e a
 * tela o oferece em vez de terminar em recusa.
 */
function SemEntrada({ slug }: { slug: string }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "2rem 1.5rem",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "24rem", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.6rem",
            fontWeight: 500,
            margin: "0 0 0.75rem",
            textWrap: "balance",
          }}
        >
          Falta você entrar
        </h1>
        <p style={{ margin: "0 0 1.75rem", lineHeight: 1.6, color: "var(--ink-2)" }}>
          É rápido: diz seu primeiro nome e as fotos da festa aparecem.
        </p>
        <a
          href={`/e/${encodeURIComponent(slug)}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "56px",
            borderRadius: "var(--raio)",
            fontSize: "1.05rem",
            fontWeight: 500,
            textDecoration: "none",
            background: "var(--ink)",
            color: "var(--bg)",
          }}
        >
          Entrar
        </a>
      </div>
    </main>
  );
}
