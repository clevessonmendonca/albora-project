import { useEffect, useState } from "react";
import { SSE_RECONEXAO_MS, type PaginaWallApi } from "./types";

/**
 * Consome `GET /api/wall/stream` via Server-Sent Events. Crachá do telão
 * viaja em cookie HttpOnly (`withCredentials`), nunca em query string.
 * `EventSource` ausente no ambiente (ex.: jsdom em teste, browser antigo)
 * degrada silenciosamente para `connected: false` — quem chama cai pro
 * polling existente, nunca trava esperando um construtor inexistente.
 */
export function useWallStream(habilitado: boolean) {
  const [payload, setPayload] = useState<PaginaWallApi | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!habilitado) return;
    if (typeof EventSource === "undefined") return;

    let cancelado = false;
    let es: EventSource | null = null;
    let reconexao: ReturnType<typeof setTimeout> | null = null;

    const conectar = () => {
      if (cancelado) return;

      es = new EventSource("/api/wall/stream", { withCredentials: true });

      es.onopen = () => setConnected(true);

      es.onmessage = (evt) => {
        try {
          setPayload(JSON.parse(evt.data) as PaginaWallApi);
        } catch {
          /* mensagem malformada: ignora, próximo tick do servidor corrige */
        }
      };

      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (!cancelado) {
          reconexao = setTimeout(conectar, SSE_RECONEXAO_MS);
        }
      };
    };

    conectar();

    return () => {
      cancelado = true;
      if (reconexao !== null) clearTimeout(reconexao);
      es?.close();
    };
  }, [habilitado]);

  return { payload, connected };
}
