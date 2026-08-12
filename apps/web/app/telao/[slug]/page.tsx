import { resolverSlug } from "@albora/db";
import { PACKS } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CamadaTokens } from "@albora/tokens";
import { banco } from "@/lib/banco";
import { Telao } from "./telao-cliente";

export const dynamic = "force-dynamic";

/**
 * O telão do salão (spec 010).
 *
 * A casca é pública — cor e fonte do casal saem do slug, que não é segredo:
 * está impresso na placa da mesa. As **fotos** não: quem as lê é o crachá, que
 * chega na URL que o anfitrião abriu na TV e o cliente resolve. Por isso a
 * página desenha o fundo do evento a partir do slug e deixa a mídia para a rota
 * `/api/parede`, atrás do crachá.
 */
export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolucao = await resolverSlug(banco(), slug, new Date());

  if (resolucao.estado === "desconhecido") {
    return (
      <main
        style={{
          ...(paraVariaveis(resolverTokens({ marca: MARCA_ALBORA })) as React.CSSProperties),
          position: "fixed",
          inset: 0,
          display: "grid",
          placeItems: "center",
          backgroundColor: "var(--bg)",
          color: "var(--ink-2)",
          fontFamily: "var(--fonte-corpo)",
        }}
      >
        <p style={{ fontSize: "1.25rem" }}>Este telão não existe.</p>
      </main>
    );
  }

  const pack = PACKS[resolucao.evento.packId];
  const evento = resolucao.evento.identityTokens as CamadaTokens;

  // O telão vive num salão à meia-luz: fundo escuro por padrão, cor do casal por
  // cima. Se o evento traz o próprio fundo nos tokens de identidade, ele ganha.
  const tokens = resolverTokens({
    marca: MARCA_ALBORA,
    pack: pack ? { ...pack.tokens, fundo: "escuro" } : { fundo: "escuro" },
    evento,
  });

  return <Telao variaveis={paraVariaveis(tokens)} />;
}
