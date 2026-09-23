"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Skeleton } from "@albora/ui-web";
import { useAdminResource } from "@/features/admin/hooks/use-admin-resource";
import { useModerationCount } from "./moderation-count-context";

type Midia = {
  id: string;
  autor: string;
  denuncias: number;
  pedidosDeRemocao?: number;
  motivo: string;
  criadaEm: string;
  thumb?: string;
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

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.7rem] uppercase tracking-rotulo text-ink-3">{label}</span>
      <div className="h-px flex-1 bg-linha" />
      <Badge tone="neutral" className="px-2 py-0.5 text-[0.7rem]">
        {count}
      </Badge>
    </div>
  );
}

export function ReviewQueue({ eventoId, onTotalChange }: Props) {
  const [acao, setAcao] = useState<string | null>(null);
  const [acaoBulk, setAcaoBulk] = useState<"liberar" | "ocultar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { setCount } = useModerationCount();

  const aoCarregar = useCallback(
    (corpo: { midias: Midia[]; comentarios: Comentario[] }) => {
      setErro(null);
      const total = corpo.midias.length + corpo.comentarios.length;
      onTotalChange?.(total);
      setCount(total);
    },
    [onTotalChange, setCount],
  );

  const {
    dado,
    carregando,
    erro: erroLeitura,
    recarregar: carregar,
  } = useAdminResource<{ midias: Midia[]; comentarios: Comentario[] }>(
    `/api/admin/events/${eventoId}/review`,
    { intervaloMs: 30_000, aoCarregar },
  );

  useEffect(() => {
    if (erroLeitura) {
      setErro("Não foi possível carregar a lista de revisão agora.");
      onTotalChange?.(0);
    }
  }, [erroLeitura, onTotalChange]);

  const midias = dado?.midias ?? [];
  const comentarios = dado?.comentarios ?? [];

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
          <div key={i} className="flex gap-3 rounded-token border border-linha bg-bg p-3.5">
            <Skeleton className="aspect-[3/4] w-24 shrink-0 sm:w-28" />
            <div className="flex flex-1 flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1.5">
                  <Skeleton variant="text" className="h-3 w-28" />
                  <Skeleton variant="text" className="h-2.5 w-16" />
                </div>
                <Skeleton variant="text" className="h-5 w-16" />
              </div>
              <div className="flex gap-2">
                <Skeleton variant="text" className="h-7 w-20" />
                <Skeleton variant="text" className="h-7 w-16" />
              </div>
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
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={acao !== null || acaoBulk !== null}
              onClick={() => void bulkMidia("liberar")}
              className={`${acaoBulk === "liberar" ? "opacity-60" : ""}`}
            >
              {acaoBulk === "liberar" ? "Aprovando…" : `Aprovar todas (${midias.length})`}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={acao !== null || acaoBulk !== null}
              onClick={() => void bulkMidia("ocultar")}
              className={`${acaoBulk === "ocultar" ? "opacity-60" : ""}`}
            >
              {acaoBulk === "ocultar" ? "Ocultando…" : `Ocultar todas (${midias.length})`}
            </Button>
          </div>
        </div>
      )}

      {hasBoth && <SectionHeader label="Fotos" count={midias.length} />}

      {midias.map((m) => (
        <div key={m.id} className="flex gap-3 rounded-token border border-linha bg-bg p-3.5">
          <div className="aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-media bg-superficie-alta sm:w-28">
            {m.thumb ? (
              <img
                src={m.thumb}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-full object-cover object-top"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-ink-3">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5v-9Z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M3 12.5l3.5-3.5 3 3 2.5-2.5L17 13"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
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
                  <Badge tone="critico">
                    {`${m.denuncias} ${m.denuncias === 1 ? "denúncia" : "denúncias"}`}
                  </Badge>
                )}
                {(m.pedidosDeRemocao ?? 0) > 0 && <Badge tone="critico">remoção pedida</Badge>}
                {m.motivo === "endurecido" && <Badge tone="outline">aguardando</Badge>}
                {m.motivo === "classificador" && <Badge tone="outline">filtro auto</Badge>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={acao !== null}
                onClick={() => void patch("midia", m.id, "liberar")}
                className={`${
                  acao === `liberar:midia:${m.id}` ? "opacity-60" : ""
                }`}
              >
                {acao === `liberar:midia:${m.id}` ? "Aprovando…" : "Aprovar"}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={acao !== null}
                onClick={() => void patch("midia", m.id, "ocultar")}
                className={`${
                  acao === `ocultar:midia:${m.id}` ? "opacity-60" : ""
                }`}
              >
                {acao === `ocultar:midia:${m.id}` ? "Ocultando…" : "Ocultar"}
              </Button>
            </div>
          </div>
        </div>
      ))}

      {hasBoth && <SectionHeader label="Comentários" count={comentarios.length} />}

      {comentarios.map((c) => (
        <div key={c.id} className="flex flex-col gap-2.5 rounded-token border border-linha bg-bg p-3.5">
          <div className="flex items-start justify-between gap-2">
            <span className="font-titulo text-[0.875rem] text-ink">{c.autor}</span>
            {c.denuncias > 0 && (
              <Badge tone="critico">
                {`${c.denuncias} ${c.denuncias === 1 ? "denúncia" : "denúncias"}`}
              </Badge>
            )}
          </div>
          <p className="m-0 rounded-token bg-superficie-alta px-3 py-2.5 text-[0.9rem] leading-relaxed text-ink-2">
            {c.texto}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={acao !== null}
              onClick={() => void patch("comentario", c.id, "liberar")}
              className={`${
                acao === `liberar:comentario:${c.id}` ? "opacity-60" : ""
              }`}
            >
              {acao === `liberar:comentario:${c.id}` ? "Mantendo…" : "Manter"}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={acao !== null}
              onClick={() => void patch("comentario", c.id, "remover")}
              className={`${
                acao === `remover:comentario:${c.id}` ? "opacity-60" : ""
              }`}
            >
              {acao === `remover:comentario:${c.id}` ? "Removendo…" : "Remover"}
            </Button>
          </div>
        </div>
      ))}

      {erro && (
        <p role="alert" className="m-0 text-sm text-critico">
          {erro}
        </p>
      )}
    </div>
  );
}
