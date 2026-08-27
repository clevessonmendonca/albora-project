"use client";

import { useCallback, useEffect, useState } from "react";
import { adminClasses } from "@/features/admin/components/server/admin-shell";

type Midia = {
  id: string;
  autor: string;
  denuncias: number;
  pedidosDeRemocao?: number;
  motivo: string;
  criadaEm: string;
};

type Comentario = {
  id: string;
  autor: string;
  texto: string;
  denuncias: number;
};

type Props = {
  eventoId: string;
  onTotalChange?: (total: number) => void;
};

function formatarHora(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChipStatus({ label, critico }: { label: string; critico?: boolean }) {
  return (
    <span
      className={[
        "rounded-pilula border px-2 py-0.5 text-[0.72rem] font-titulo",
        critico
          ? "border-critico text-critico"
          : "border-linha text-ink-3",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.7rem] uppercase tracking-rotulo text-ink-3">{label}</span>
      <div className="h-px flex-1 bg-linha" />
      <span className="rounded-pilula bg-superficie-alta px-1.5 py-0.5 text-[0.7rem] font-titulo text-ink-3">
        {count}
      </span>
    </div>
  );
}

export function ReviewQueue({ eventoId, onTotalChange }: Props) {
  const [midias, setMidias] = useState<Midia[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState<string | null>(null);
  const [acaoBulk, setAcaoBulk] = useState<"liberar" | "ocultar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/review`);
      if (!r.ok) throw new Error("falhou");
      const corpo = (await r.json()) as { midias: Midia[]; comentarios: Comentario[] };
      setMidias(corpo.midias);
      setComentarios(corpo.comentarios);
      onTotalChange?.(corpo.midias.length + corpo.comentarios.length);
    } catch {
      setErro("Não foi possível carregar a lista de revisão agora.");
      onTotalChange?.(0);
    } finally {
      setCarregando(false);
    }
  }, [eventoId, onTotalChange]);

  useEffect(() => {
    void carregar();
    const id = window.setInterval(() => void carregar(), 30_000);
    return () => window.clearInterval(id);
  }, [carregar]);

  const patch = async (
    tipo: "midia" | "comentario",
    id: string,
    acaoPedida: "liberar" | "ocultar" | "remover",
  ) => {
    setAcao(`${acaoPedida}:${tipo}:${id}`);
    setErro(null);
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/review`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo, id, acao: acaoPedida }),
      });
      if (!r.ok) throw new Error("falhou");
      await carregar();
    } catch {
      setErro("Não foi possível concluir a ação. Tente novamente em instantes.");
    } finally {
      setAcao(null);
    }
  };

  const bulkMidia = async (acaoPedida: "liberar" | "ocultar") => {
    setAcaoBulk(acaoPedida);
    setErro(null);
    try {
      await Promise.allSettled(
        midias.map((m) =>
          fetch(`/api/admin/events/${eventoId}/review`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tipo: "midia", id: m.id, acao: acaoPedida }),
          }),
        ),
      );
      await carregar();
    } catch {
      setErro("Não foi possível concluir a ação em lote. Verifique a lista.");
    } finally {
      setAcaoBulk(null);
    }
  };

  if (carregando) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="animate-pulse rounded-token bg-bg p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-3 w-1/3 rounded-full bg-superficie-alta" />
              <div className="h-5 w-16 rounded-pilula bg-superficie-alta" />
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-20 rounded-pilula bg-superficie-alta" />
              <div className="h-7 w-16 rounded-pilula bg-superficie-alta" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (midias.length === 0 && comentarios.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-token border border-linha bg-bg px-6 py-10 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-superficie-alta text-ink-3">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M4.5 10.5l4 4 7-8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="m-0 font-titulo text-[0.9375rem] text-ink">Fila limpa</p>
        <p className="m-0 max-w-[20rem] text-[0.8125rem] leading-relaxed text-ink-3">
          Denúncias e pedidos de remoção aparecem aqui quando alguém sinalizar.
          O telão segue no ar com tudo aprovado.
        </p>
      </div>
    );
  }

  const hasBoth = midias.length > 0 && comentarios.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {midias.length > 1 && (
        <div className="flex items-center justify-between rounded-token border border-linha bg-bg px-3.5 py-2.5">
          <span className="text-[0.8125rem] text-ink-3">
            {midias.length} fotos aguardando
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={acao !== null || acaoBulk !== null}
              onClick={() => void bulkMidia("liberar")}
              className={`${adminClasses.primaryButtonSm} ${acaoBulk === "liberar" ? "opacity-60" : ""}`}
            >
              {acaoBulk === "liberar" ? "Aprovando…" : `Aprovar todas (${midias.length})`}
            </button>
            <button
              type="button"
              disabled={acao !== null || acaoBulk !== null}
              onClick={() => void bulkMidia("ocultar")}
              className={`${adminClasses.dangerButtonSm} ${acaoBulk === "ocultar" ? "opacity-60" : ""}`}
            >
              {acaoBulk === "ocultar" ? "Ocultando…" : `Ocultar todas (${midias.length})`}
            </button>
          </div>
        </div>
      )}

      {hasBoth && <SectionHeader label="Fotos" count={midias.length} />}

      {midias.map((m) => (
        <div key={m.id} className="flex flex-col gap-2.5 rounded-token border border-linha bg-bg p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="block font-titulo text-[0.875rem] text-ink">{m.autor}</span>
              {m.criadaEm && (
                <span className="mt-0.5 block text-[0.76rem] text-ink-3">
                  {formatarHora(m.criadaEm)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              {m.denuncias > 0 && (
                <ChipStatus
                  critico
                  label={`${m.denuncias} ${m.denuncias === 1 ? "denúncia" : "denúncias"}`}
                />
              )}
              {(m.pedidosDeRemocao ?? 0) > 0 && (
                <ChipStatus critico label="remoção pedida" />
              )}
              {m.motivo === "endurecido" && <ChipStatus label="aguardando" />}
              {m.motivo === "classificador" && <ChipStatus label="filtro auto" />}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={acao !== null}
              onClick={() => void patch("midia", m.id, "liberar")}
              className={`${adminClasses.primaryButtonSm} ${
                acao === `liberar:midia:${m.id}` ? "opacity-60" : ""
              }`}
            >
              {acao === `liberar:midia:${m.id}` ? "Aprovando…" : "Aprovar"}
            </button>
            <button
              type="button"
              disabled={acao !== null}
              onClick={() => void patch("midia", m.id, "ocultar")}
              className={`${adminClasses.dangerButtonSm} ${
                acao === `ocultar:midia:${m.id}` ? "opacity-60" : ""
              }`}
            >
              {acao === `ocultar:midia:${m.id}` ? "Ocultando…" : "Ocultar"}
            </button>
          </div>
        </div>
      ))}

      {hasBoth && <SectionHeader label="Comentários" count={comentarios.length} />}

      {comentarios.map((c) => (
        <div key={c.id} className="flex flex-col gap-2.5 rounded-token border border-linha bg-bg p-3.5">
          <div className="flex items-start justify-between gap-2">
            <span className="font-titulo text-[0.875rem] text-ink">{c.autor}</span>
            {c.denuncias > 0 && (
              <ChipStatus
                critico
                label={`${c.denuncias} ${c.denuncias === 1 ? "denúncia" : "denúncias"}`}
              />
            )}
          </div>
          <p className="m-0 rounded-token bg-superficie-alta px-3 py-2.5 text-[0.9rem] leading-relaxed text-ink-2">
            {c.texto}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={acao !== null}
              onClick={() => void patch("comentario", c.id, "liberar")}
              className={`${adminClasses.primaryButtonSm} ${
                acao === `liberar:comentario:${c.id}` ? "opacity-60" : ""
              }`}
            >
              {acao === `liberar:comentario:${c.id}` ? "Mantendo…" : "Manter"}
            </button>
            <button
              type="button"
              disabled={acao !== null}
              onClick={() => void patch("comentario", c.id, "remover")}
              className={`${adminClasses.dangerButtonSm} ${
                acao === `remover:comentario:${c.id}` ? "opacity-60" : ""
              }`}
            >
              {acao === `remover:comentario:${c.id}` ? "Removendo…" : "Remover"}
            </button>
          </div>
        </div>
      ))}

      {erro && <p className="m-0 text-sm text-critico">{erro}</p>}
    </div>
  );
}
