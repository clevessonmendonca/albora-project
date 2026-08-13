"use client";

import { useState } from "react";
import { raio } from "@/app/landing/pecas";

export function SignOutButton() {
  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/admin/sair", { method: "POST" });
    } finally {
      window.location.assign("/admin/entrar");
    }
  };
  return (
    <button
      type="button"
      onClick={signOut}
      disabled={signingOut}
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
      {signingOut ? "Saindo…" : "Sair"}
    </button>
  );
}
