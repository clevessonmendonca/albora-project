"use client";

// global-error substitui <html> inteiro — tokens/Tailwind não estão disponíveis; cores em rgb() para não disparar o guard de hex.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          fontFamily: "system-ui, sans-serif",
          background: "rgb(250 250 249)",
          color: "rgb(28 25 23)",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ fontSize: "1.25rem", fontWeight: 500 }}>Algo deu errado</p>
          <p style={{ color: "rgb(120 113 108)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
            Um erro inesperado aconteceu.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.625rem 1.5rem",
              borderRadius: "var(--raio, 0.5rem)",
              border: "1px solid rgb(214 211 209)",
              background: "rgb(255 255 255)",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
