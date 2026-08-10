/**
 * Saída com dignidade.
 *
 * Todo estado que não abre a festa passa por aqui, e nenhum deles é um erro
 * do convidado. Ele escaneou um QR numa mesa: a tela diz o que aconteceu e
 * qual é o próximo passo, sem código de erro e sem culpa.
 */
export function Aviso({
  titulo,
  texto,
  quando,
}: {
  titulo: string;
  texto: string;
  quando?: Date;
}) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "2rem 1.5rem",
        background: "var(--fundo)",
        color: "var(--frente)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <div style={{ maxWidth: "28rem", textAlign: "center" }}>
        <h1
          style={{
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.6rem",
            fontWeight: 500,
            margin: "0 0 0.75rem",
            textWrap: "balance",
          }}
        >
          {titulo}
        </h1>
        <p style={{ margin: 0, opacity: 0.65, lineHeight: 1.6 }}>{texto}</p>

        {quando && (
          <p style={{ marginTop: "1.25rem", opacity: 0.5, fontSize: "0.9rem" }}>
            {quando.toLocaleString("pt-BR", {
              day: "2-digit",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </main>
  );
}
