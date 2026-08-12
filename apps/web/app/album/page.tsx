import { comEvento, packDoEvento } from "@albora/db";
import { PACKS } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import { montarAlbumServido } from "@/lib/album";
import { banco } from "@/lib/banco";
import { COOKIE_SESSAO, sessaoDoToken } from "@/lib/sessao";
import { AlbumUI } from "./album-ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "O álbum da noite",
  // O evento não é público: quem tem o link entra, quem não tem não acha.
  robots: { index: false, follow: false },
};

/**
 * O álbum do evento, servido e temático.
 *
 * A página resolve o tema a partir do pack do evento e monta o álbum no
 * servidor — a mesma montagem da rota `/api/album`, para não haver uma segunda
 * diagramação que divirja. A decisão de o que é público é do servidor, e esta
 * página não a repete: ela desenha o que a montagem já resolveu.
 */
export default async function Pagina() {
  const sessao = await sessaoDoToken((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!sessao) return <SemEntrada />;

  const packId = await comEvento(banco(), sessao.eventoId, (c) =>
    packDoEvento(c, sessao.eventoId),
  );
  const pack = packId ? PACKS[packId] : undefined;

  const album = await montarAlbumServido(sessao.eventoId);

  const tokens = resolverTokens({
    marca: MARCA_ALBORA,
    pack: { ...(pack?.tokens ?? {}), fundo: "escuro" },
  });

  return (
    <div style={paraVariaveis(tokens) as CSSProperties}>
      <AlbumUI album={album} />
    </div>
  );
}

/**
 * Sem sessão não há álbum: a identidade do convidado é escopada a um evento
 * (ADR 0009), e o caminho de volta é sempre o QR da mesa.
 */
function SemEntrada() {
  const tokens = resolverTokens({ marca: MARCA_ALBORA, pack: { fundo: "escuro" } });

  return (
    <main
      style={{
        ...(paraVariaveis(tokens) as CSSProperties),
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "2rem 1.5rem",
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "24rem", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "var(--fonte-titulo)",
            fontWeight: 400,
            fontSize: "1.6rem",
            margin: "0 0 0.75rem",
            textWrap: "balance",
          }}
        >
          Falta você entrar
        </h1>
        <p style={{ margin: 0, lineHeight: 1.6, color: "var(--ink-2)" }}>
          Volte pelo QR da mesa para ver o álbum da festa.
        </p>
      </div>
    </main>
  );
}
