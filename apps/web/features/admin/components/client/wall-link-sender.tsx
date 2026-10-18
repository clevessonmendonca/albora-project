"use client";

import React, { useState } from "react";
import { buttonVariants } from "@albora/ui-web";

type Estado =
  | { fase: "ocioso" }
  | { fase: "gerando" }
  | { fase: "pronto"; url: string; expiraEm: string }
  | { fase: "erro"; mensagem: string };

const secundario = buttonVariants({ variant: "secondary", size: "md", width: "full" });

function horaDe(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Terceiro método de conexão: o anfitrião gera um link de uso único e manda para quem opera a TV. */
export function WallLinkSender({ eventId, podeUsarTelao = true }: { eventId: string; podeUsarTelao?: boolean }) {
  const [estado, setEstado] = useState<Estado>({ fase: "ocioso" });
  const [aviso, setAviso] = useState("");

  const gerar = async () => {
    setEstado({ fase: "gerando" });
    setAviso("");
    try {
      const r = await fetch(`/api/admin/events/${eventId}/wall-link`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (r.ok) {
        const { url, expiraEm } = (await r.json()) as { url: string; expiraEm: string };
        setEstado({ fase: "pronto", url, expiraEm });
        return;
      }
      if (r.status === 403) {
        setEstado({ fase: "erro", mensagem: "O telão entra no plano Completo." });
      } else if (r.status === 401) {
        setEstado({ fase: "erro", mensagem: "Sua sessão expirou. Entre no painel de novo." });
      } else {
        setEstado({ fase: "erro", mensagem: "Não foi possível gerar o link agora. Tente de novo." });
      }
    } catch {
      setEstado({ fase: "erro", mensagem: "Sem conexão. Tente de novo." });
    }
  };

  const copiar = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setAviso("Link copiado.");
    } catch {
      setAviso("Não foi possível copiar. Selecione o link e copie.");
    }
  };

  const compartilhar = async (url: string) => {
    try {
      await navigator.share({ title: "Telão da festa", url });
    } catch {
      setAviso("");
    }
  };

  const podeCompartilhar = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="mt-5 border-t border-linha pt-5">
      <h3 className="tipo-label m-0 text-ink">Mandar o telão por link</h3>
      <p className="tipo-caption mb-3 mt-1 text-ink-2">
        Para o DJ ou quem opera a TV. Quem abrir o link no navegador da tela conecta o telão sem digitar código. Vale uma vez.
      </p>

      {estado.fase === "pronto" ? (
        <div className="flex flex-col gap-3">
          <input
            readOnly
            value={estado.url}
            aria-label="Link do telão"
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-12 w-full border border-linha bg-bg px-3 text-sm text-ink"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secundario} onClick={() => void copiar(estado.url)}>
              Copiar link
            </button>
            {podeCompartilhar && (
              <button type="button" className={secundario} onClick={() => void compartilhar(estado.url)}>
                Enviar
              </button>
            )}
          </div>
          <p className="tipo-caption m-0 text-ink-2">
            Vale até {horaDe(estado.expiraEm)}. Quem tiver o link pode ligar o telão desta festa: envie só para quem opera a tela.
          </p>
        </div>
      ) : (
        <button
          type="button"
          className={secundario}
          disabled={!podeUsarTelao || estado.fase === "gerando"}
          onClick={() => void gerar()}
        >
          {estado.fase === "gerando" ? "Gerando…" : "Gerar link do telão"}
        </button>
      )}

      <p role="status" aria-live="polite" className="tipo-caption m-0 mt-2 min-h-4 text-ink-2">
        {aviso}
      </p>
      {estado.fase === "erro" && (
        <p role="alert" className="tipo-caption m-0 text-critico">
          {estado.mensagem}
        </p>
      )}
    </div>
  );
}
