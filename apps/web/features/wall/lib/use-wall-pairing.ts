import { useEffect, useState } from "react";
import { POLL_PAREAMENTO_MS, type FaseWall } from "./types";

export function useWallPairing(
  fase: FaseWall,
  onPronto: (variaveis: Record<string, string>) => void,
) {
  const [codigo, setCodigo] = useState<string | null>(null);

  useEffect(() => {
    if (fase !== "pareando") return;
    let vivo = true;

    const abrir = async () => {
      try {
        const r = await fetch("/api/wall/pair", { method: "POST", credentials: "same-origin" });
        if (!r.ok) return;
        const { code } = (await r.json()) as { code: string };
        if (vivo) setCodigo(code);
      } catch {
        /* rede caiu: o próximo tick tenta de novo */
      }
    };

    const conferir = async () => {
      try {
        const r = await fetch("/api/wall/pair/status", { credentials: "same-origin" });
        if (!r.ok) return;
        const corpo = (await r.json()) as
          | { status: "pendente" }
          | { status: "expirado" }
          | { status: "pronto"; variaveis: Record<string, string> };
        if (!vivo) return;
        if (corpo.status === "pronto") {
          onPronto(corpo.variaveis);
        } else if (corpo.status === "expirado") {
          setCodigo(null);
          void abrir();
        }
      } catch {
        /* ignora e tenta no próximo tick */
      }
    };

    void abrir();
    const p = window.setInterval(() => void conferir(), POLL_PAREAMENTO_MS);
    return () => {
      vivo = false;
      window.clearInterval(p);
    };
  }, [fase, onPronto]);

  return { codigo };
}
