"use client";

import { interacaoAberta, padroesDoEvento } from "@albora/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";

type Moderacao = {
  panico: boolean;
  modoEndurecido: boolean;
  haMenores: boolean;
};

type Props = {
  eventoId: string;
  slug: string;
  inicial: Moderacao;
  interacaoAbreEmInicial: string | null;
};

export function EventControls({
  eventoId,
  slug,
  inicial,
  interacaoAbreEmInicial,
}: Props) {
  const [moderacao, setModeracao] = useState(inicial);
  const [interacaoAbreEm, setInteracaoAbreEm] = useState(interacaoAbreEmInicial);
  const [salvando, setSalvando] = useState<
    "panico" | "haMenores" | "modoEndurecido" | "interacao" | null
  >(null);
  const [erro, setErro] = useState(false);

  const padroes = padroesDoEvento({ haMenores: moderacao.haMenores });
  const gateAberto = interacaoAberta(
    { interacaoAbreEm: interacaoAbreEm ? new Date(interacaoAbreEm) : null },
    new Date(),
  );

  const patch = async (
    corpo: Record<string, boolean>,
    campo: NonNullable<typeof salvando>,
  ) => {
    setSalvando(campo);
    setErro(false);
    const moderacaoAnterior = moderacao;
    const gateAnterior = interacaoAbreEm;

    if ("panico" in corpo) setModeracao((m) => ({ ...m, panico: corpo.panico! }));
    if ("haMenores" in corpo) setModeracao((m) => ({ ...m, haMenores: corpo.haMenores! }));
    if ("modoEndurecido" in corpo) {
      setModeracao((m) => ({ ...m, modoEndurecido: corpo.modoEndurecido! }));
    }
    if (corpo.abrirInteracao) setInteracaoAbreEm(new Date().toISOString());

    try {
      const r = await fetch(`/api/admin/events/${eventoId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (!r.ok) throw new Error("falhou");
      const resposta = (await r.json()) as {
        moderacao: Moderacao;
        interacaoAbreEm?: string | null;
      };
      setModeracao(resposta.moderacao);
      if (resposta.interacaoAbreEm !== undefined) {
        setInteracaoAbreEm(resposta.interacaoAbreEm);
      }
    } catch {
      setModeracao(moderacaoAnterior);
      setInteracaoAbreEm(gateAnterior);
      setErro(true);
    } finally {
      setSalvando(null);
    }
  };

  const origem = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <p className="mb-4 mt-0 leading-relaxed text-ink-2">
          Controles durante a festa. O pânico pausa o telão em segundos; o interruptor
          de menores sobe o limiar de denúncia sem marcar ninguém.
        </p>

        <button
          type="button"
          disabled={salvando === "panico"}
          onClick={() => void patch({ panico: !moderacao.panico }, "panico")}
          className={`${adminClasses.dangerButton} ${
            moderacao.panico ? "bg-ink-2" : "bg-critico"
          } ${salvando === "panico" ? "opacity-60" : ""}`}
        >
          {salvando === "panico"
            ? "Salvando…"
            : moderacao.panico
              ? "Retomar telão"
              : "Pausar telão"}
        </button>

        {moderacao.panico && (
          <p className="mb-0 mt-3 text-[0.9rem] text-critico">
            O telão está pausado. Nenhuma foto nova aparece na parede.
          </p>
        )}
      </AdminSection>

      <AdminSection>
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="block font-titulo text-[1.0625rem]">Há menores nesta festa</span>
            <span className="mt-1 block text-sm text-ink-3">
              Uma denúncia já segura do telão. Compartilhar para fora nasce desligado.
            </span>
          </div>
          <Interruptor
            ligado={moderacao.haMenores}
            desabilitado={salvando === "haMenores"}
            rotulo="Há menores nesta festa"
            onChange={(v) => void patch({ haMenores: v }, "haMenores")}
          />
        </div>

        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2">
          <Efeito rotulo="Para segurar" valor={`${padroes.denunciasParaSegurar} denúncia(s)`} />
          <Efeito
            rotulo="Compartilhar fora"
            valor={padroes.compartilhamentoExterno ? "ligado" : "desligado"}
          />
          <Efeito
            rotulo="Gate"
            valor={gateAberto ? "aberto" : padroes.gateComecaFechado ? "fechado" : "aberto"}
          />
        </div>
      </AdminSection>

      <AdminSection>
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="block font-titulo text-[1.0625rem]">Modo endurecido</span>
            <span className="mt-1 block text-sm text-ink-3">
              Novas fotos e comentários ficam na fila até você liberar.
            </span>
          </div>
          <Interruptor
            ligado={moderacao.modoEndurecido}
            desabilitado={salvando === "modoEndurecido"}
            rotulo="Modo endurecido"
            onChange={(v) => void patch({ modoEndurecido: v }, "modoEndurecido")}
          />
        </div>
      </AdminSection>

      <AdminSection>
        <h2 className="mb-3 mt-0 font-titulo text-lg">Interação social</h2>
        <p className="mb-4 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
          Reações e comentários no feed só aparecem depois que o casal liberar.
        </p>
        {gateAberto ? (
          <p className="m-0 text-[0.9rem] text-ink">
            Aberta desde{" "}
            {interacaoAbreEm
              ? new Date(interacaoAbreEm).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </p>
        ) : (
          <button
            type="button"
            disabled={salvando === "interacao"}
            onClick={() => void patch({ abrirInteracao: true }, "interacao")}
            className={`${adminClasses.primaryButton} ${
              salvando === "interacao" ? "opacity-60" : ""
            }`}
          >
            {salvando === "interacao" ? "Abrindo…" : "Abrir interação agora"}
          </button>
        )}
      </AdminSection>

      <AdminSection>
        <h2 className="mb-3 mt-0 font-titulo text-lg">Moderação e convidados</h2>
        <p className="mb-4 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
          A fila de revisão e o funil de participação têm páginas próprias — números agregados,
          sem lista nominal.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/admin/e/${eventoId}/moderation`} className={adminClasses.primaryButton}>
            Abrir moderação
          </Link>
          <Link href={`/admin/e/${eventoId}/guests`} className={adminClasses.secondaryButton}>
            Ver convidados
          </Link>
        </div>
      </AdminSection>

      <AdminSection>
        <h2 className="mb-4 mt-0 font-titulo text-lg">Música do casal</h2>
        <MusicaDoEvento eventoId={eventoId} />
      </AdminSection>

      <AdminSection>
        <h2 className="mb-4 mt-0 font-titulo text-lg">Peças para imprimir</h2>
        <PecasDoEvento eventoId={eventoId} slug={slug} />
      </AdminSection>

      <AdminSection>
        <h2 className="mb-4 mt-0 font-titulo text-lg">Links do evento</h2>
        <LinkEvento title="Convidado (QR)" url={`${origem}/e/${slug}`} />
        <LinkEvento title="Telão" url={`${origem}/wall-display`} />
      </AdminSection>

      {erro && (
        <p className="m-0 text-[0.9rem] text-critico">Não salvou agora. Tente de novo.</p>
      )}
    </div>
  );
}

function MusicaDoEvento({ eventoId }: { eventoId: string }) {
  const [url, setUrl] = useState("");
  const [atual, setAtual] = useState<{ provedor: string; rotulo: string; url: string } | null>(
    null,
  );
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(`/api/admin/events/${eventoId}/music`);
        if (!r.ok) throw new Error("falhou");
        const corpo = (await r.json()) as {
          musica: { provedor: string; rotulo: string; url: string } | null;
        };
        setAtual(corpo.musica);
        if (corpo.musica) setUrl(corpo.musica.url);
      } catch {
        setErro("Não carregou a música salva.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [eventoId]);

  const salvar = async () => {
    const limpo = url.trim();
    if (!limpo) return;

    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/music`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: limpo }),
      });
      const corpo = (await r.json()) as {
        musica?: { provedor: string; rotulo: string; url: string } | null;
        message?: string;
      };
      if (!r.ok) {
        setErro(corpo.message ?? "Link não aceito.");
        return;
      }
      setAtual(corpo.musica ?? null);
    } catch {
      setErro("Não salvou agora. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[0.9375rem] leading-relaxed text-ink-2">
        Cole o link da faixa no Spotify ou YouTube Music. Convidados veem na confirmação da foto
        e na aba Música.
      </p>

      {carregando ? (
        <p className="m-0 text-[0.9rem] text-ink-3">Carregando…</p>
      ) : (
        atual && <p className="m-0 text-[0.9rem] text-ink">Agora: {atual.rotulo}</p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-rotulo text-ink-3">Link da faixa</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://open.spotify.com/track/…"
          className="w-full rounded-token border border-linha bg-bg px-3.5 py-[0.65rem] font-corpo text-[0.95rem] text-ink"
        />
      </label>

      <button
        type="button"
        disabled={salvando || !url.trim()}
        onClick={() => void salvar()}
        className={`${adminClasses.primaryButton} ${
          salvando || !url.trim() ? "opacity-60" : ""
        }`}
      >
        {salvando ? "Salvando…" : "Salvar música"}
      </button>

      {erro && <p className="m-0 text-sm text-critico">{erro}</p>}
    </div>
  );
}

function Efeito({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-token bg-bg px-3 py-2.5 text-[0.8125rem]">
      <span className="block text-ink-3">{rotulo}</span>
      <span className="mt-0.5 block text-ink">{valor}</span>
    </div>
  );
}

function PecasDoEvento({ eventoId, slug }: { eventoId: string; slug: string }) {
  const [baixando, setBaixando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const formatos = [
    { id: "placa-a4", rotulo: "Placa A4" },
    { id: "card-de-mesa", rotulo: "Card de mesa" },
    { id: "card-de-missao", rotulo: "Card de missão" },
  ] as const;

  const baixar = async (formato: (typeof formatos)[number]["id"]) => {
    setBaixando(formato);
    setErro(null);
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/pieces?formato=${formato}`);
      if (!r.ok) {
        const corpo = (await r.json().catch(() => null)) as { problemas?: string[] } | null;
        const msg = corpo?.problemas?.join(" ") ?? "Não gerou a peça.";
        throw new Error(msg);
      }
      const svg = await r.text();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `albora-${slug}-${formato}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não baixou a peça.");
    } finally {
      setBaixando(null);
    }
  };

  return (
    <div>
      <p className="mb-4 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
        SVG pronto para a gráfica converter em PDF. A tela mostra RGB e a impressão sai
        CMYK — peça uma prova antes da tiragem inteira.
      </p>
      <div className="flex flex-wrap gap-2">
        {formatos.map((f) => (
          <button
            key={f.id}
            type="button"
            disabled={baixando !== null}
            onClick={() => void baixar(f.id)}
            className={`cursor-pointer rounded-pilula border border-linha bg-superficie px-4 py-2.5 font-titulo text-[0.9375rem] text-ink ${
              baixando !== null ? "cursor-wait" : ""
            } ${baixando === f.id ? "opacity-60" : ""}`}
          >
            {baixando === f.id ? "Gerando…" : f.rotulo}
          </button>
        ))}
      </div>
      {erro && <p className="mb-0 mt-3 text-sm text-critico">{erro}</p>}
    </div>
  );
}

function LinkEvento({ title, url }: { title: string; url: string }) {
  return (
    <div className="mb-3.5">
      <span className="block text-xs uppercase tracking-rotulo text-ink-3">{title}</span>
      <a href={url} className="break-all text-[0.95rem] text-acento">
        {url}
      </a>
    </div>
  );
}

function Interruptor({
  ligado,
  desabilitado,
  rotulo,
  onChange,
}: {
  ligado: boolean;
  desabilitado?: boolean;
  rotulo: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={() => onChange(!ligado)}
      className={`flex h-[1.875rem] w-[3.25rem] shrink-0 items-center rounded-pilula border-none p-[0.1875rem] ${
        ligado ? "justify-end bg-acento" : "justify-start bg-linha"
      } ${desabilitado ? "cursor-wait opacity-60" : "cursor-pointer"}`}
    >
      <span className="size-6 rounded-full bg-superficie-alta" />
    </button>
  );
}
