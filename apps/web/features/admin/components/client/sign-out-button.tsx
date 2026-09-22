"use client";

import { Button } from "@albora/ui-web";
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
    <Button type="button" variant="secondary" size="sm" onClick={signOut} disabled={signingOut}>
      {signingOut ? "Saindo…" : "Sair"}
    </Button>
  );
}
