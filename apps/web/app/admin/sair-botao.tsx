"use client";

import { useState } from "react";
import { raio } from "../landing/pecas";

/** Sair do painel: revoga a sessão e volta para a tela de entrada. */
export function SairBotao() {
  const [saindo, setSaindo] = useState(false);
  const sair = async () => {
    setSaindo(true);
    try {
      await fetch("/api/admin/sair", { method: "POST" });
    } finally {
      window.location.assign("/admin/entrar");
    }
  };
  return (
    <button
      type="button"
      onClick={sair}
      disabled={saindo}
      style={{
        padding: "0.6rem 1.1rem",
        fontSize: "0.95rem",
        color: "var(--ink-2)",
        backgroundColor: "transparent",
        border: "1px solid var(--linha)",
        cursor: "pointer",
        ...raio("var(--raio-pilula)"),
      }}
    >
      {saindo ? "Saindo…" : "Sair"}
    </button>
  );
}
