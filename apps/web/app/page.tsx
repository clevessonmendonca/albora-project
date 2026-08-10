import { Botao } from "@albora/ui-web";

/**
 * Página de esqueleto. A landing é a task 013 e as telas do convidado são da
 * 005 em diante — esta existe só para `pnpm dev` ter o que servir e para os
 * guards terem código real para varrer.
 */
export default function Home() {
  return (
    <main
      style={{
        background: "var(--fundo)",
        color: "var(--frente)",
        fontFamily: "var(--fonte-corpo)",
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        gap: "1rem",
      }}
    >
      <h1 style={{ fontFamily: "var(--fonte-titulo)" }}>Albora</h1>
      <p style={{ opacity: 0.6 }}>Esqueleto da task 002.</p>
      <Botao>Botão</Botao>
    </main>
  );
}
