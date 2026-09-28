"use client";

import { useState } from "react";
import { useAdminResource } from "@/features/admin/hooks/use-admin-resource";
import {
  botaoDoPainel,
  CabecalhoDeCartao,
  Cartao,
  NotaVazia,
} from "@/features/admin/components/server/kit-do-painel";
import { GuestDisplayNames, type SessaoNoTelao } from "./guest-display-names";

type Resumo = {
  expectedGuests: number;
  denominador?: number;
  origemDoDenominador?: "confirmado" | "estimado";
  sessoes?: SessaoNoTelao[];
};

const INTERVALO_MS = 30_000;

/** "Sua lista" (§5.2 do protótipo) + a confirmação de presença real pós-festa. */
export function GuestFunnel({ eventoId }: { eventoId: string }) {
  const [presenca, setPresenca] = useState("");
  const [salvandoPresenca, setSalvandoPresenca] = useState(false);

  const {
    dado: resumo,
    erro,
    recarregar: carregar,
  } = useAdminResource<Resumo>(`/api/admin/events/${eventoId}/guests`, {
    intervaloMs: INTERVALO_MS,
  });

  if (erro && !resumo) {
    return (
      <Cartao>
        <p role="alert" className="m-0 text-[0.9375rem] text-critico">
          Não foi possível carregar a lista agora. Recarregue a página ou tente em instantes.
        </p>
      </Cartao>
    );
  }

  const sessoes = resumo?.sessoes ?? [];
  const confirmada = resumo?.origemDoDenominador === "confirmado";

  async function confirmarPresenca() {
    const n = Number(presenca);
    if (!Number.isFinite(n) || n <= 0) return;

    setSalvandoPresenca(true);
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/config`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actualGuests: Math.trunc(n) }),
      });
      if (r.ok) {
        setPresenca("");
        await carregar();
      }
    } finally {
      setSalvandoPresenca(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Cartao>
        <CabecalhoDeCartao
          titulo="Sua lista"
          subtitulo={
            resumo
              ? `${sessoes.length} ${sessoes.length === 1 ? "pessoa" : "pessoas"} neste evento`
              : "Carregando…"
          }
        />
        {sessoes.length === 0 ? (
          <NotaVazia>
            O convidado não faz cadastro — a lista se forma sozinha assim que as primeiras
            fotos chegam.
          </NotaVazia>
        ) : (
          <GuestDisplayNames
            eventoId={eventoId}
            sessoes={sessoes}
            onChanged={() => void carregar()}
          />
        )}
      </Cartao>

      <Cartao>
        <CabecalhoDeCartao
          titulo={confirmada ? "Presença confirmada" : "Confirmar quem apareceu"}
        />
        <p className="m-0 mb-3 text-[13px] text-ink-3">
          {confirmada
            ? `A participação é calculada sobre ${resumo?.denominador} presentes. Se o número mudar, é só enviar de novo.`
            : "Convidado e presente não são o mesmo número. Depois da festa, informe quantos apareceram de fato."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="presenca-real">
            Quantas pessoas apareceram
          </label>
          <input
            id="presenca-real"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder={String(resumo?.denominador ?? resumo?.expectedGuests ?? "")}
            value={presenca}
            onChange={(e) => setPresenca(e.target.value)}
            className="w-28 rounded-[9px] border border-linha bg-bg px-3 py-2 font-[family-name:var(--fonte-titulo)] text-lg tabular-nums text-ink outline-none transition-[border-color] focus:border-acento"
          />
          <button
            type="button"
            disabled={salvandoPresenca || Number(presenca) <= 0}
            onClick={() => void confirmarPresenca()}
            className={botaoDoPainel({
              className: salvandoPresenca || Number(presenca) <= 0 ? "opacity-60" : "",
            })}
          >
            {salvandoPresenca ? "Salvando…" : "Confirmar presença"}
          </button>
        </div>
      </Cartao>
    </div>
  );
}
