"use client";

import { useCallback, useEffect, useState } from "react";
import { adminClasses } from "@/features/admin/components/server/admin-shell";

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
      setErro("Não carregou os comentários.");
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
      setErro("Não removeu agora. Tente de novo.");
    } finally {
      setRemovendo(null);
    }
  };

  if (carregando) {
    return <p className="m-0 text-[0.9rem] text-ink-3">Carregando…</p>;
  }

  if (lista.length === 0) {
    return (
      <p className="m-0 text-[0.9375rem] leading-relaxed text-ink-2">
        Nenhum comentário publicado ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {lista.map((c) => (
        <div key={c.id} className="grid gap-1.5 rounded-token bg-bg p-3">
          <div className="flex justify-between gap-3">
            <span className="text-[0.85rem] text-ink">{c.autor}</span>
            <span className="text-xs text-ink-3">
              {c.denuncias > 0 ? `${c.denuncias} denúncia(s)` : "sem denúncias"}
              {c.classificador === "suspeito" ? " · classificador" : ""}
            </span>
          </div>
          <p className="m-0 text-[0.9rem] leading-normal text-ink-2">{c.texto}</p>
          <button
            type="button"
            disabled={removendo === c.id}
            onClick={() => void remover(c.id)}
            className={`${adminClasses.dangerButtonSm} justify-self-start ${
              removendo === c.id ? "opacity-60" : ""
            }`}
          >
            {removendo === c.id ? "Removendo…" : "Remover"}
          </button>
        </div>
      ))}

      {erro && <p className="m-0 text-sm text-critico">{erro}</p>}
    </div>
  );
}
