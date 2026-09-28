"use client";

import { useState } from "react";
import { botaoDoPainel } from "@/features/admin/components/server/kit-do-painel";

export type SessaoNoTelao = {
  id: string;
  nome: string;
  fotos: number;
};

type Props = {
  eventoId: string;
  sessoes: SessaoNoTelao[];
  onChanged: () => void;
};

export function GuestDisplayNames({ eventoId, sessoes, onChanged }: Props) {
  const [acao, setAcao] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const patch = async (
    sessaoId: string,
    corpo: { acao: "ocultar" } | { acao: "renomear"; nome: string },
  ) => {
    setAcao(`${corpo.acao}:${sessaoId}`);
    setErro(null);
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/guests`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessaoId, ...corpo }),
      });
      if (!r.ok) throw new Error("falhou");
      setEditando(null);
      onChanged();
    } catch {
      setErro("Não concluiu agora. Tente de novo.");
    } finally {
      setAcao(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[13px] text-ink-3">
        Nome ofensivo? Troque ou oculte — as fotos ficam. O telão lê o nome daqui.
      </p>

      <div className="flex flex-col gap-2">
        {sessoes.map((s) => {
          const ocupado = acao !== null;
          const estaEditando = editando === s.id;
          return (
            <div key={s.id} className="rounded-[9px] bg-superficie-alta px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 truncate text-[0.9375rem] text-ink">{s.nome}</p>
                  <p className="m-0 mt-0.5 text-[13px] text-ink-3">
                    <span className="tabular-nums">{s.fotos}</span>{" "}
                    {s.fotos === 1 ? "foto" : "fotos"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => {
                      setEditando(s.id);
                      setRascunho(s.nome);
                      setErro(null);
                    }}
                    className={botaoDoPainel({
                      variant: "light",
                      className: acao === `renomear:${s.id}` ? "opacity-60" : "",
                    })}
                  >
                    Trocar
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void patch(s.id, { acao: "ocultar" })}
                    className={botaoDoPainel({
                      variant: "light",
                      className: acao === `ocultar:${s.id}` ? "opacity-60" : "",
                    })}
                  >
                    {acao === `ocultar:${s.id}` ? "Ocultando…" : "Ocultar nome"}
                  </button>
                </div>
              </div>
              {estaEditando && (
                <form
                  className="mt-3 grid gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const nome = rascunho.trim();
                    if (!nome) return;
                    void patch(s.id, { acao: "renomear", nome });
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={rascunho}
                      onChange={(e) => setRascunho(e.target.value)}
                      maxLength={40}
                      autoFocus
                      aria-label="Novo nome no telão"
                      className="min-h-11 min-w-40 flex-1 rounded-[9px] border border-linha bg-superficie px-3 text-[0.9375rem] text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
                    />
                    <button
                      type="submit"
                      disabled={ocupado || !rascunho.trim()}
                      className={botaoDoPainel({
                        className: ocupado || !rascunho.trim() ? "opacity-60" : "",
                      })}
                    >
                      {acao === `renomear:${s.id}` ? "Salvando…" : "Salvar"}
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => setEditando(null)}
                      className={botaoDoPainel({ variant: "ghost" })}
                    >
                      Cancelar
                    </button>
                  </div>
                  {rascunho.length > 0 && (
                    <span className="block text-right text-[11px] tabular-nums text-ink-3">
                      {40 - rascunho.length}
                    </span>
                  )}
                </form>
              )}
            </div>
          );
        })}
      </div>

      {erro && (
        <p role="alert" className="m-0 text-[13px] text-critico">
          {erro}
        </p>
      )}
    </div>
  );
}
