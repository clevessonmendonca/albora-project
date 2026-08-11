import { Logotipo } from "./logotipo";
import { Resgate } from "./scanner";

/**
 * Saída com dignidade.
 *
 * Todo estado que não abre a festa passa por aqui, e nenhum deles é um erro
 * do convidado. Ele escaneou um QR numa mesa: a tela diz o que aconteceu e
 * qual é o próximo passo, sem código de erro e sem culpa.
 *
 * `resgate` liga o campo de código e o escaneamento. Só entra onde a pessoa
 * está no endereço **errado** — código desconhecido e slug rotacionado. Em
 * "já foi" e "ainda não começou" o código está certo, e oferecer um scanner
 * ali seria mentir sobre o que resolve o problema.
 */
export function Aviso({
  titulo,
  texto,
  quando,
  resgate,
}: {
  titulo: string;
  texto: string;
  quando?: Date | undefined;
  resgate?: boolean | undefined;
}) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        padding: "2.5rem 2rem 2.25rem",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <div
        style={{
          flex: "1 1 auto",
          width: "100%",
          maxWidth: "26rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Esta tela também é chegada de QR, e é a única coisa em cena que
            identifica o produto. */}
        <div style={{ flex: "none" }}>
          <Logotipo />
        </div>

        <span style={{ flex: "1 1 auto", minHeight: "1.5rem" }} />

        <div>
          <h1
            style={{
              fontFamily: "var(--fonte-titulo)",
              fontSize: "clamp(1.6rem, 7.6vw, 1.9375rem)",
              fontWeight: 500,
              lineHeight: 1.14,
              letterSpacing: "var(--tracking-titulo)",
              margin: "0 0 0.85rem",
              textWrap: "balance",
            }}
          >
            {titulo}
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: "34ch",
              fontSize: "0.94rem",
              lineHeight: 1.68,
              color: "var(--ink-2)",
            }}
          >
            {texto}
          </p>

          {/* Numa tela que só existe para dizer "ainda não", a hora é a única
              informação que resolve alguma coisa — e é ela que ganha o acento. */}
          {quando && (
            <p
              style={{
                margin: "1.5rem 0 0",
                fontFamily: "var(--fonte-titulo)",
                fontSize: "0.78rem",
                fontWeight: 400,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--acento-texto)",
              }}
            >
              {quando.toLocaleString("pt-BR", {
                day: "2-digit",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        <span style={{ flex: "1 1 auto", minHeight: "1.5rem" }} />

        <div style={{ flex: "none" }}>{resgate && <Resgate />}</div>
      </div>
    </main>
  );
}
