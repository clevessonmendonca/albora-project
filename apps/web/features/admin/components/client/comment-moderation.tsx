"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Skeleton } from "@albora/ui-web";
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
          <div key={i} className="grid gap-2 rounded-token border border-linha bg-bg p-3.5">
            <div className="flex items-start justify-between gap-3">
              <Skeleton variant="text" className="h-3 w-1/4" />
              <Skeleton variant="text" className="h-3 w-16" />
            </div>
            <div className="space-y-1.5">
              <Skeleton variant="text" className="h-3 w-full" />
              <Skeleton variant="text" className="h-3 w-3/4" />
            </div>
            <Skeleton variant="text" className="h-6 w-28" />
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
                  <Badge tone="critico">
                    {c.denuncias === 1 ? "1 denúncia" : `${c.denuncias} denúncias`}
                  </Badge>
                )}
                {c.classificador === "suspeito" && <Badge tone="outline">filtro auto</Badge>}
              </div>
            </div>
            <p className="m-0 text-[0.9rem] leading-relaxed text-ink-2">{c.texto}</p>
            <Button
              variant="danger"
              size="sm"
              type="button"
              disabled={removendo === c.id}
              onClick={() => void remover(c.id)}
              className={`justify-self-start ${
                removendo === c.id ? "cursor-wait opacity-50" : ""
              }`}
            >
              {removendo === c.id ? "Removendo…" : "Remover comentário"}
            </Button>
          </div>
        ))
      )}

      {erro && (
        <div role="alert" className="rounded-token border border-critico bg-superficie px-4 py-3">
          <p className="m-0 text-sm text-critico">{erro}</p>
        </div>
      )}
    </div>
  );
}
