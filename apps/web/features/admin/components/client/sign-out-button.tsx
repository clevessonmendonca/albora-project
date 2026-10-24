"use client";

import { Button } from "@albora/ui-web";
import { useState } from "react";

export function SignOutButton() {
  const [signingOut, setSigningOut] = useState(false);
  const [failed, setFailed] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    setFailed(false);
    try {
      const r = await fetch("/api/admin/sair", { method: "POST" });
      if (!r.ok) throw new Error("falhou");
      window.location.assign("/admin/sign-in");
    } catch {
      setFailed(true);
      setSigningOut(false);
    }
  };
  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={signOut} disabled={signingOut}>
        {signingOut ? "Saindo…" : "Sair"}
      </Button>
      {failed && (
        <span role="alert" className="tipo-caption text-critico">
          Não deu para sair. Tente de novo.
        </span>
      )}
    </>
  );
}
