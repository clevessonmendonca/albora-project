import { useEffect, useRef, useState } from "react";
import { POLL_PAREAMENTO_MS, type FaseWall } from "./types";

export function useWallPairing(
  fase: FaseWall,
  onPronto: (variaveis: Record<string, string>) => void,
) {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [semConexao, setSemConexao] = useState(false);
  const temCodigo = useRef(false);

  useEffect(() => {
    if (fase !== "pareando") return;
    let vivo = true;

    const abrir = async () => {
      try {
        const r = await fetch("/api/wall/pair", { method: "POST", credentials: "same-origin" });
        if (!r.ok) {
          if (vivo) setSemConexao(true);
          return;
        }
        const { code } = (await r.json()) as { code: string };
        if (vivo) {
          temCodigo.current = true;
          setCodigo(code);
          setSemConexao(false);
        }
      } catch {
        if (vivo) setSemConexao(true);
      }
    };

    const conferir = async () => {
      if (!temCodigo.current) {
        void abrir();
        return;
      }
      try {
        const r = await fetch("/api/wall/pair/status", { credentials: "same-origin" });
        if (!r.ok) {
          if (vivo) setSemConexao(true);
          return;
        }
        if (vivo) setSemConexao(false);
        const corpo = (await r.json()) as
          | { status: "pendente" }
          | { status: "expirado" }
          | { status: "pronto"; variaveis: Record<string, string> };
        if (!vivo) return;
        if (corpo.status === "pronto") {
          onPronto(corpo.variaveis);
        } else if (corpo.status === "expirado") {
          temCodigo.current = false;
          setCodigo(null);
          void abrir();
        }
      } catch {
        if (vivo) setSemConexao(true);
      }
    };

    void abrir();
    const p = window.setInterval(() => void conferir(), POLL_PAREAMENTO_MS);
    return () => {
      vivo = false;
      window.clearInterval(p);
    };
  }, [fase, onPronto]);

  return { codigo, semConexao };
}
