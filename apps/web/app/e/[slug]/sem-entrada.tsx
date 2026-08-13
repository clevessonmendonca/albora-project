/**
 * Sem sessão não há superfície do convidado: a identidade é escopada a um
 * evento (ADR 0009). O caminho de volta é o QR — a tela oferece o atalho.
 */
export function SemEntrada({ slug }: { slug: string }) {
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
