"use client";

import { useState } from "react";

export function SignOutButton() {
  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/admin/sair", { method: "POST" });
    } finally {
      window.location.assign("/admin/sign-in");
    }
  };
  return (
    <button
      type="button"
      onClick={signOut}
      disabled={signingOut}
      className="cursor-pointer rounded-pilula border border-linha bg-transparent px-[1.1rem] py-2.5 text-[0.95rem] text-ink-2 disabled:cursor-default"
    >
      {signingOut ? "Saindo…" : "Sair"}
    </button>
  );
}
