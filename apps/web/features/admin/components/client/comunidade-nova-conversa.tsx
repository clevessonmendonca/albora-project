"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TOPICOS_DA_COMUNIDADE, type TopicoDaComunidade } from "@albora/core";
import { botaoDoPainel } from "@/features/admin/components/server/kit-do-painel";

const ROTULO: Record<TopicoDaComunidade, string> = {
  duvida: "Dúvida",
  ideia: "Ideia",
  experiencia: "Experiência",
  indicacao: "Indicação",
};

const campo =
  "min-h-11 w-full rounded-[9px] border border-linha bg-superficie px-3 py-2 text-sm text-ink outline-none focus-visible:border-acento-texto";

export function ComunidadeNovaConversa() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setEnviando(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/admin/comunidade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topico: dados.get("topico"),
          titulo: dados.get("titulo"),
          corpo: dados.get("corpo"),
        }),
      });

      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setErro(corpo?.error?.message ?? "Não deu para publicar agora");
        return;
      }

      setAberto(false);
      router.refresh();
    } catch {
      setErro("Sem conexão. Tente de novo em um instante.");
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={botaoDoPainel({ variant: "primary" })}
      >
        Fazer uma pergunta
      </button>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="flex w-full flex-col gap-3 rounded-[17px] border border-linha bg-superficie p-5 text-left shadow-suave"
    >
      <label className="flex flex-col gap-1 text-[13px] text-ink-2">
        Assunto
        <select name="topico" defaultValue="duvida" className={campo} required>
          {TOPICOS_DA_COMUNIDADE.map((t) => (
            <option key={t} value={t}>
              {ROTULO[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[13px] text-ink-2">
        Título
        <input
          name="titulo"
          maxLength={160}
          required
          className={campo}
          placeholder="O que você quer saber?"
        />
      </label>

      <label className="flex flex-col gap-1 text-[13px] text-ink-2">
        Mensagem
        <textarea
          name="corpo"
          maxLength={4000}
          required
          rows={5}
          className={`${campo} resize-y`}
          placeholder="Conte o contexto — quanto mais concreto, melhor a resposta."
        />
      </label>

      {erro && (
        <p role="alert" className="m-0 text-[13px] text-critico">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={enviando}
          className={botaoDoPainel({ variant: "primary" })}
        >
          {enviando ? "Publicando…" : "Publicar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className={botaoDoPainel({ variant: "light" })}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
