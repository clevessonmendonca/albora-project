"use client";

import { useCallback, useEffect, useState } from "react";
import { adminClasses } from "@/features/admin/components/server/admin-shell";
import { RefreshButton } from "./refresh-control";

type Props = {
  eventoId: string;
};

export function CommentModeration({ eventoId }: Props) {
  const [lista, setLista] = useState<
    {
      id: string;
      autor: string;
      texto: string;
      denuncias: number;
      criadaEm: string;
      classificador: string | null;
    }[]
  >([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/comments`);
      if (!r.ok) throw new Error("falhou");
      const corpo = (await r.json()) as {
        comentarios: {
          id: string;
          autor: string;
          texto: string;
          denuncias: number;
          criadaEm: string;
          classificador: string | null;
        }[];
      };
      setLista(corpo.comentarios);
    } catch {
      setErro("Não foi possível carregar os comentários agora.");
    } finally {
      setCarregando(false);
    }
  }, [eventoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const remover = async (comentarioId: string) => {
    setRemovendo(comentarioId);
    setErro(null);
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/comments`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ comentarioId }),
      });
      if (!r.ok) throw new Error("falhou");
      setLista((antes) => antes.filter((c) => c.id !== comentarioId));
    } catch {
      setErro("Não foi possível remover o comentário. Tente novamente em instantes.");
    } finally {
      setRemovendo(null);
    }
  };

  if (carregando) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse grid gap-2 rounded-token border border-linha bg-bg p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="h-3 w-1/4 rounded-full bg-superficie-alta" />
              <div className="h-3 w-16 rounded-full bg-superficie-alta" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded-full bg-superficie-alta" />
              <div className="h-3 w-3/4 rounded-full bg-superficie-alta" />
            </div>
            <div className="h-6 w-28 rounded-pilula bg-superficie-alta" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.8125rem] text-ink-3">
          {lista.length === 0
            ? "Nenhum comentário"
            : lista.length === 1
              ? "1 comentário"
              : `${lista.length} comentários`}
        </span>
        <RefreshButton
          loading={atualizando}
          onClick={() => {
            setAtualizando(true);
            void carregar().finally(() => setAtualizando(false));
          }}
        />
      </div>

      {lista.length === 0 ? (
        <div className="rounded-token border border-linha bg-bg px-6 py-8 text-center">
          <p className="mb-2 mt-0 text-[0.9375rem] text-ink">
            Nenhum comentário publicado ainda
          </p>
          <p className="m-0 text-[0.8125rem] leading-relaxed text-ink-3">
            Quando os convidados começarem a comentar nas fotos, você verá a lista aqui e poderá
            moderar o conteúdo.
          </p>
        </div>
      ) : (
        lista.map((c) => (
          <div key={c.id} className="grid gap-2 rounded-token border border-linha bg-bg p-3.5">
            <div className="flex items-start justify-between gap-3">
              <span className="font-titulo text-[0.85rem] text-ink">{c.autor}</span>
              <div className="flex flex-wrap justify-end gap-1">
                {c.denuncias > 0 && (
                  <span className="rounded-pilula border border-critico px-2 py-0.5 text-[0.72rem] font-titulo text-critico">
                    {c.denuncias === 1 ? "1 denúncia" : `${c.denuncias} denúncias`}
                  </span>
                )}
                {c.classificador === "suspeito" && (
                  <span className="rounded-pilula border border-linha px-2 py-0.5 text-[0.72rem] font-titulo text-ink-3">
                    filtro auto
                  </span>
                )}
              </div>
            </div>
            <p className="m-0 text-[0.9rem] leading-relaxed text-ink-2">{c.texto}</p>
            <button
              type="button"
              disabled={removendo === c.id}
              onClick={() => void remover(c.id)}
              className={`${adminClasses.dangerButtonSm} justify-self-start ${
                removendo === c.id ? "cursor-wait opacity-50" : ""
              }`}
            >
              {removendo === c.id ? "Removendo…" : "Remover comentário"}
            </button>
          </div>
        ))
      )}

      {erro && (
        <div className="rounded-token border border-critico bg-superficie px-4 py-3">
          <p className="m-0 text-sm text-critico">{erro}</p>
        </div>
      )}
    </div>
  );
}
