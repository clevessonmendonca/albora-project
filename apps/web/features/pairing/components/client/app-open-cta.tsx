"use client";

import { appPairSchemeLinkPassagem } from "@albora/core";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { PrimaryButton } from "@albora/ui-web";

type Props = {
  /** Fallback quando a API falha — normalmente `/e/[slug]/pair`. */
  pairPath: string;
  label?: string;
};

export function AppOpenCta({ pairPath, label = "Abrir no app" }: Props) {
  const router = useRouter();
  const [estado, setEstado] = useState<"pronto" | "gerando">("pronto");

  const abrir = useCallback(async () => {
    setEstado("gerando");
    try {
      const r = await fetch("/api/app/parear", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!r.ok) {
        router.push(pairPath);
        return;
      }
      const corpo = (await r.json()) as { passagem?: string };
      if (typeof corpo.passagem === "string" && corpo.passagem.length > 0) {
        window.location.href = appPairSchemeLinkPassagem(corpo.passagem);
        return;
      }
      router.push(pairPath);
    } catch {
      router.push(pairPath);
    } finally {
      setEstado("pronto");
    }
  }, [pairPath, router]);

  return (
    <PrimaryButton onClick={() => void abrir()} disabled={estado === "gerando"}>
      {estado === "gerando" ? "Abrindo…" : label}
    </PrimaryButton>
  );
}
