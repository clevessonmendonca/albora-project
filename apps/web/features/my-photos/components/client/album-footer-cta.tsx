"use client";

import React, { useState } from "react";
import { fireProductEvent } from "@/lib/analytics/fire-product-event";
import { compartilharLink } from "../../lib/compartilhar-link";

type Props = { slug: string; refToken: string | null };

/**
 * Rodapé do álbum do convidado: o ponto onde ele já viu o valor inteiro.
 * Compartilhar leva o álbum público (que carrega o ref no próprio CTA);
 * "crie o seu" leva à landing com o ref — o loop convidado → anfitrião.
 */
export function AlbumFooterCta({ slug, refToken }: Props) {
  const [estado, setEstado] = useState<"idle" | "copied">("idle");
  const hrefCriar = refToken ? `/?ref=${encodeURIComponent(refToken)}` : "/";
  const opts = refToken ? { originRef: refToken } : {};

  async function compartilhar() {
    fireProductEvent("guest_share_album", opts);
    const url = `${window.location.origin}/p/${encodeURIComponent(slug)}`;
    const resultado = await compartilharLink(url);
    if (resultado === "copied") {
      setEstado("copied");
      setTimeout(() => setEstado("idle"), 2000);
    }
  }

  return (
    <section className="mt-10 flex flex-col items-center gap-4 border-t border-linha pt-8 text-center">
      <button
        type="button"
        onClick={compartilhar}
        className="min-h-11 rounded-pilula bg-superficie-alta px-6 font-medium text-ink transition-transform duration-instantaneo ease-mola active:scale-[0.97]"
      >
        {estado === "copied" ? "Link copiado" : "Compartilhar álbum"}
      </button>
      <p className="tipo-caption m-0 max-w-[32ch] text-ink-2">
        Depois da sua festa você também pode ter um.{" "}
        <a
          href={hrefCriar}
          onClick={() => fireProductEvent("guest_cta_criar_click", opts)}
          className="text-ink underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70"
        >
          Crie o álbum da sua festa
        </a>
      </p>
    </section>
  );
}
