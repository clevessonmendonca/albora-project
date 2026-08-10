"use client";

import { useRef, useState } from "react";
import { usarEnvio } from "@/lib/usar-envio";

/**
 * A tela de captura. Um botão grande, e o resto sai da frente.
 *
 * Não pede permissão de câmera nem monta preview: `capture="environment"`
 * abre a câmera nativa do aparelho, que é a que o convidado já sabe usar e a
 * única que funciona igual em iPhone velho, Android novo e tudo no meio.
 * Preview próprio custaria permissão, bateria e uma classe inteira de bugs
 * por aparelho — para entregar uma câmera pior.
 */
export function PaginaFoto({ eventoId }: { eventoId: string }) {
  const { estado, enfileirarFoto } = usarEnvio(eventoId);
  const entrada = useRef<HTMLInputElement>(null);
  const [ultima, setUltima] = useState<string | null>(null);

  async function escolheu(ev: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = ev.target.files?.[0];
    // Zera antes de processar: sem isso, fotografar a mesma coisa duas vezes
    // seguidas não dispara o evento na segunda.
    ev.target.value = "";
    if (!arquivo) return;

    const r = await enfileirarFoto(arquivo);
    if (r.ok) setUltima(arquivo.name || "foto");
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        padding: "1.5rem",
        gap: "1rem",
        background: "var(--fundo)",
        color: "var(--frente)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--fonte-titulo)", fontSize: "1.1rem" }}>Fotos da festa</span>
        <Estado pendentes={estado.pendentes} online={estado.online} />
      </header>

      <section style={{ display: "grid", placeItems: "center", textAlign: "center", gap: "0.5rem" }}>
        {estado.processando ? (
          <p style={{ opacity: 0.65 }}>Preparando…</p>
        ) : ultima ? (
          <>
            <p style={{ margin: 0, fontFamily: "var(--fonte-titulo)", fontSize: "1.3rem" }}>
              Foto guardada
            </p>
            <p style={{ margin: 0, opacity: 0.6, fontSize: "0.9rem" }}>
              {estado.pendentes > 0
                ? "Vai subir sozinha. Pode continuar fotografando."
                : "Já está no álbum."}
            </p>
          </>
        ) : (
          <p style={{ margin: 0, opacity: 0.6, maxWidth: "20rem", lineHeight: 1.6 }}>
            Fotografe o que quiser. Tudo entra no álbum de quem te convidou.
          </p>
        )}

        {estado.ultimoErro && (
          <p role="alert" style={{ margin: 0, fontSize: "0.85rem", color: "var(--acento)", maxWidth: "20rem" }}>
            {estado.ultimoErro}
          </p>
        )}
      </section>

      <input
        ref={entrada}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={escolheu}
      />

      <button
        onClick={() => entrada.current?.click()}
        disabled={estado.processando}
        style={{
          font: "inherit",
          fontSize: "1.05rem",
          fontWeight: 500,
          // Alvo grande de propósito: é o único botão que importa, e a mão
          // que o aperta às 23h segura uma taça na outra.
          minHeight: "64px",
          borderRadius: "var(--raio)",
          border: "none",
          background: "var(--frente)",
          color: "var(--fundo)",
          opacity: estado.processando ? 0.5 : 1,
          cursor: estado.processando ? "default" : "pointer",
        }}
      >
        Tirar foto
      </button>
    </main>
  );
}

function Estado({ pendentes, online }: { pendentes: number; online: boolean }) {
  if (pendentes === 0 && online) return null;

  // Só aparece quando há o que dizer. Um contador permanente vira laço de
  // checagem, que é o que o ADR 0009 mantém fora da festa.
  return (
    <span style={{ fontSize: "0.78rem", opacity: 0.55 }}>
      {!online && "sem sinal · "}
      {pendentes > 0 && `${pendentes} esperando`}
    </span>
  );
}
