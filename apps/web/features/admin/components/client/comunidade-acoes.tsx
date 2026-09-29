"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminClasses } from "@/features/admin/components/server/admin-shell";
import { ROTULO_DO_TOPICO, TOPICOS } from "@/features/admin/lib/descobrir-tela";
import type { TopicoDaComunidade } from "@albora/core";

const CAMPO =
  "w-full rounded-token border border-linha bg-superficie px-3.5 py-2.5 font-corpo text-[0.9375rem] text-ink outline-none transition-[border-color,box-shadow] duration-[var(--tempo-rapido)] ease-[var(--curva)] placeholder:text-ink-3 focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto";

const LIMITE_TITULO = 160;
const LIMITE_CORPO = 4000;

async function mandar(url: string, init: RequestInit): Promise<void> {
  const r = await fetch(url, init);
  if (r.ok) return;
  const corpo = (await r.json().catch(() => ({}))) as { message?: string };
  throw new Error(corpo.message ?? "Não foi possível concluir agora.");
}

function Erro({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return (
    <span role="alert" className="text-sm text-critico">
      {mensagem}
    </span>
  );
}

export function NovaConversa() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [topico, setTopico] = useState<TopicoDaComunidade>("duvida");
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const vazio = titulo.trim().length === 0 || corpo.trim().length === 0;

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className={adminClasses.primaryButton}>
        Começar uma conversa
      </button>
    );
  }

  async function publicar() {
    setEnviando(true);
    setErro(null);
    try {
      await mandar("/api/admin/comunidade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topico, titulo: titulo.trim(), corpo: corpo.trim() }),
      });
      setTitulo("");
      setCorpo("");
      setAberto(false);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível publicar agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-token border border-linha p-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="comunidade-topico" className="tipo-label text-ink-3">
          Assunto
        </label>
        <select
          id="comunidade-topico"
          value={topico}
          onChange={(e) => setTopico(e.target.value as TopicoDaComunidade)}
          className={CAMPO}
        >
          {TOPICOS.map((t) => (
            <option key={t} value={t}>
              {ROTULO_DO_TOPICO[t].rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="comunidade-titulo" className="tipo-label text-ink-3">
          Título
        </label>
        <input
          id="comunidade-titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={LIMITE_TITULO}
          placeholder="Quantas missões vocês deixaram?"
          className={CAMPO}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="comunidade-corpo" className="tipo-label text-ink-3">
          Mensagem
        </label>
        <textarea
          id="comunidade-corpo"
          value={corpo}
          onChange={(e) => setCorpo(e.target.value)}
          rows={5}
          maxLength={LIMITE_CORPO}
          placeholder="Conte o contexto — ajuda quem for responder."
          className={`${CAMPO} min-h-28 resize-y`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={vazio || enviando}
          onClick={() => void publicar()}
          className={`${adminClasses.primaryButton} ${vazio || enviando ? "opacity-60" : ""}`}
        >
          {enviando ? "Publicando…" : "Publicar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setErro(null);
          }}
          className={adminClasses.secondaryButton}
        >
          Cancelar
        </button>
        <Erro mensagem={erro} />
      </div>
    </div>
  );
}

export function Responder({ postId }: { postId: string }) {
  const router = useRouter();
  const [corpo, setCorpo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function responder() {
    setEnviando(true);
    setErro(null);
    try {
      await mandar(`/api/admin/comunidade/${postId}/respostas`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ corpo: corpo.trim() }),
      });
      setCorpo("");
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível responder agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="comunidade-resposta" className="tipo-label text-ink-3">
        Sua resposta
      </label>
      <textarea
        id="comunidade-resposta"
        value={corpo}
        onChange={(e) => setCorpo(e.target.value)}
        rows={4}
        maxLength={LIMITE_CORPO}
        placeholder="O que funcionou para vocês?"
        className={`${CAMPO} min-h-24 resize-y`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={corpo.trim().length === 0 || enviando}
          onClick={() => void responder()}
          className={`${adminClasses.primaryButton} ${
            corpo.trim().length === 0 || enviando ? "opacity-60" : ""
          }`}
        >
          {enviando ? "Enviando…" : "Responder"}
        </button>
        <Erro mensagem={erro} />
      </div>
    </div>
  );
}

export function Apagar({
  url,
  rotulo,
  confirmacao,
  depois,
}: {
  url: string;
  rotulo: string;
  confirmacao: string;
  /** Rota para onde ir quando a própria página apagada deixa de existir. */
  depois?: string;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  async function apagar() {
    setErro(null);
    try {
      await mandar(url, { method: "DELETE" });
      comecar(() => {
        if (depois) router.replace(depois);
        router.refresh();
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível apagar agora.");
      setConfirmando(false);
    }
  }

  if (!confirmando) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className={adminClasses.dangerButtonSm}
        >
          {rotulo}
        </button>
        <Erro mensagem={erro} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="tipo-caption text-ink-2">{confirmacao}</span>
      <button
        type="button"
        disabled={pendente}
        onClick={() => void apagar()}
        className={`${adminClasses.dangerButtonSm} ${pendente ? "opacity-60" : ""}`}
      >
        {pendente ? "Apagando…" : "Apagar mesmo"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className={adminClasses.secondaryButton}
      >
        Manter
      </button>
      <Erro mensagem={erro} />
    </div>
  );
}

export function SalvarIdeia({ ideiaId, salva }: { ideiaId: string; salva: boolean }) {
  const router = useRouter();
  const [agora, setAgora] = useState(salva);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alternar() {
    const proxima = !agora;
    setEnviando(true);
    setErro(null);
    // Otimista: salvar uma ideia não muda nada que a pessoa perca se falhar, e
    // o botão que só responde depois do round-trip parece quebrado.
    setAgora(proxima);
    try {
      await mandar(`/api/admin/inspiracao/${ideiaId}`, {
        method: proxima ? "PUT" : "DELETE",
      });
      router.refresh();
    } catch (e) {
      setAgora(!proxima);
      setErro(e instanceof Error ? e.message : "Não foi possível salvar agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-pressed={agora}
        disabled={enviando}
        onClick={() => void alternar()}
        className={`inline-flex min-h-11 items-center rounded-pilula border px-4 tipo-label transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
          agora
            ? "border-acento bg-acento-superficie text-acento-texto"
            : "border-linha text-ink-2 hover:border-acento-borda hover:text-ink"
        }`}
      >
        {agora ? "Salva" : "Salvar"}
      </button>
      <Erro mensagem={erro} />
    </div>
  );
}
