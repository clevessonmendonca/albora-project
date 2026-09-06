"use client";

import { useState } from "react";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";

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
    <AdminSection>
      <h2 className="tipo-subtitle m-0 mb-4 text-ink">Nomes no telão</h2>
      <p className="tipo-caption mb-4 mt-0 text-ink-3">
        Nome ofensivo? Troque ou oculte — as fotos ficam. O telão lê o nome daqui.
      </p>

      {sessoes.length === 0 ? (
        <p className="tipo-body m-0 text-ink-2">
          Quando alguém fotografar, o nome aparece aqui.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sessoes.map((s) => {
            const ocupado = acao !== null;
            const estaEditando = editando === s.id;
            return (
              <div key={s.id} className="rounded-token bg-bg px-3 py-[0.65rem]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="tipo-body m-0 truncate text-ink">{s.nome}</p>
                    <p className="tipo-caption mb-0 mt-0.5 text-ink-3">
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
                      className={`${adminClasses.primaryButtonSm} min-h-11 py-3 ${
                        acao === `renomear:${s.id}` ? "opacity-60" : ""
                      }`}
                    >
                      Trocar
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => void patch(s.id, { acao: "ocultar" })}
                      className={`${adminClasses.dangerButtonSm} min-h-11 py-3 ${
                        acao === `ocultar:${s.id}` ? "opacity-60" : ""
                      }`}
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
                        className="tipo-body min-h-11 min-w-40 flex-1 rounded-token border border-linha bg-superficie px-3 text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
                      />
                      <button
                        type="submit"
                        disabled={ocupado || !rascunho.trim()}
                        className={`${adminClasses.primaryButtonSm} min-h-11 py-3 ${
                          ocupado || !rascunho.trim() ? "opacity-60" : ""
                        }`}
                      >
                        {acao === `renomear:${s.id}` ? "Salvando…" : "Salvar"}
                      </button>
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => setEditando(null)}
                        className="min-h-11 cursor-pointer rounded-pilula border border-linha bg-superficie-alta px-3 py-3 font-titulo text-[0.8125rem] text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
                      >
                        Cancelar
                      </button>
                    </div>
                    {rascunho.length > 0 && (
                      <span className="tipo-label text-right tabular-nums text-ink-3">
                        {40 - rascunho.length}
                      </span>
                    )}
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {erro && (
        <p role="alert" className="tipo-body mb-0 mt-3 text-critico">
          {erro}
        </p>
      )}
    </AdminSection>
  );
}
