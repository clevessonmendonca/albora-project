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

function rotuloDaFila(m: Midia): string {
  const partes: string[] = [];
  if ((m.pedidosDeRemocao ?? 0) > 0 || m.motivo === "aparece_na_foto") {
    partes.push("pedido de remoção");
  }
  if (m.motivo === "classificador") partes.push("filtro automático");
  if (m.motivo === "endurecido") partes.push("aguardando aprovação");
  if (m.motivo === "denuncias" && m.denuncias > 0) partes.push("denunciado como ofensivo");
  return partes.length > 0 ? ` · ${partes.join(" · ")}` : "";
}

export function ReviewQueue({ eventoId, onTotalChange }: Props) {
  const [midias, setMidias] = useState<Midia[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState<string | null>(null);
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

  if (carregando) {
    return <p className="m-0 text-[0.9rem] text-ink-3">Carregando…</p>;
  }

  if (midias.length === 0 && comentarios.length === 0) {
    return (
      <div className="rounded-token border border-linha bg-bg px-6 py-8 text-center">
        <p className="mb-3 mt-0 text-[0.9375rem] leading-relaxed text-ink">
          Nenhum item aguardando revisão
        </p>
        <p className="m-0 text-[0.8125rem] leading-relaxed text-ink-3">
          Denúncias e pedidos de remoção aparecem aqui quando alguém sinalizar.
          Enquanto isso, o telão segue no ar com tudo aprovado.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {midias.map((m) => (
        <div key={m.id} className="grid gap-2 rounded-token bg-bg p-3.5">
          <span className="text-[0.85rem] text-ink">
            Foto · {m.autor}
            {m.denuncias > 0 ? ` · ${m.denuncias} ${m.denuncias === 1 ? "denúncia" : "denúncias"}` : ""}
            {rotuloDaFila(m)}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={acao !== null}
              onClick={() => void patch("midia", m.id, "liberar")}
              className={`${adminClasses.primaryButtonSm} ${
                acao === `liberar:midia:${m.id}` ? "opacity-60" : ""
              }`}
            >
              {acao === `liberar:midia:${m.id}` ? "Liberando…" : "Manter"}
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

      {comentarios.map((c) => (
        <div key={c.id} className="grid gap-2 rounded-token bg-bg p-3.5">
          <span className="text-[0.85rem] text-ink">
            Comentário · {c.autor} · {c.denuncias} {c.denuncias === 1 ? "denúncia" : "denúncias"}
          </span>
          <p className="m-0 text-[0.9rem] leading-normal text-ink-2">{c.texto}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={acao !== null}
              onClick={() => void patch("comentario", c.id, "liberar")}
              className={`${adminClasses.primaryButtonSm} ${
                acao === `liberar:comentario:${c.id}` ? "opacity-60" : ""
              }`}
            >
              {acao === `liberar:comentario:${c.id}` ? "Liberando…" : "Manter"}
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
