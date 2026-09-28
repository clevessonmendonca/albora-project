"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { botaoDoPainel } from "@/features/admin/components/server/kit-do-painel";

export function ComunidadeResposta({ postId }: { postId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const corpo = new FormData(form).get("corpo");
    setEnviando(true);
    setErro(null);

    try {
      const resposta = await fetch(`/api/admin/comunidade/${postId}/respostas`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ corpo }),
      });

      if (!resposta.ok) {
        const body = (await resposta.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setErro(body?.error?.message ?? "Não deu para responder agora");
        return;
      }

      form.reset();
      router.refresh();
    } catch {
      setErro("Sem conexão. Tente de novo em um instante.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="mt-5 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-[13px] text-ink-2">
        Sua resposta
        <textarea
          name="corpo"
          rows={4}
          required
          maxLength={4000}
          placeholder="Conte como você resolveu."
          className="w-full resize-y rounded-[9px] border border-linha bg-superficie px-3 py-2 text-sm text-ink outline-none focus-visible:border-acento-texto"
        />
      </label>

      {erro && (
        <p role="alert" className="m-0 text-[13px] text-critico">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className={botaoDoPainel({ variant: "primary", className: "self-start" })}
      >
        {enviando ? "Enviando…" : "Responder"}
      </button>
    </form>
  );
}
