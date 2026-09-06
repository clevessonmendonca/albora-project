"use client";

import type {
  CodigoDaTese,
  DegrauDoFunil,
  EtapaDaEspinha,
  LeituraDeIntencao,
} from "@albora/core";
import type { EntradasPorVia } from "@albora/db";
import { Badge } from "@albora/ui-web";
import { useCallback, useEffect, useState } from "react";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";
import { GuestDisplayNames, type SessaoNoTelao } from "./guest-display-names";
import { AtualizadoHa, RefreshButton } from "./refresh-control";

type Resumo = {
  expectedGuests: number;
  totalSessoes: number;
  sessoesComUpload: number;
  totalFotos: number;
  sharesTotais: number;
  participacao: number;
  denominador?: number;
  origemDoDenominador?: "confirmado" | "estimado";
  veredito: CodigoDaTese;
  intencao?: LeituraDeIntencao;
  degraus: DegrauDoFunil[];
  uploadsAntesDoFeed: number;
  uploadsDepoisDoFeed: number;
  entradasPorVia: EntradasPorVia;
  ultimas: { id: string; thumb: string; criadaEm: string }[];
  sessoes?: SessaoNoTelao[];
};

const INTERVALO_MS = 30_000;

const ROTULO_VEREDITO: Record<CodigoDaTese, string> = {
  "funil.tese_validada": "Participação na meta (≥40%)",
  "funil.mexe_em_friccao": "Abaixo da meta — vale olhar fricção",
  "funil.parar": "Participação crítica — investigar antes de escalar",
};

const ROTULO_ETAPA: Record<EtapaDaEspinha, string> = {
  qr_scan: "QR escaneado",
  page_open: "Abriu o evento",
  consent: "Consentiu",
  capture: "Tirou foto",
  upload_start: "Começou envio",
  upload_ok: "Foto no ar",
};

function vereditoTextClass(veredito: CodigoDaTese): string {
  if (veredito === "funil.tese_validada") return "text-acento-texto";
  if (veredito === "funil.mexe_em_friccao") return "text-ink";
  return "text-critico";
}

type Props = {
  eventoId: string;
};

export function GuestFunnel({ eventoId }: Props) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [presenca, setPresenca] = useState("");
  const [salvandoPresenca, setSalvandoPresenca] = useState(false);
  const [erro, setErro] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/guests`);
      if (!r.ok) throw new Error("falhou");
      setResumo((await r.json()) as Resumo);
      setErro(false);
      setUltimaAtualizacao(new Date());
    } catch {
      setErro(true);
    }
  }, [eventoId]);

  useEffect(() => {
    void carregar();
    const id = window.setInterval(() => void carregar(), INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [carregar]);

  if (erro && !resumo) {
    return (
      <AdminSection>
        <p role="alert" className="tipo-body m-0 text-critico">
          Não foi possível carregar os números agora. Recarregue a página ou tente em instantes.
        </p>
      </AdminSection>
    );
  }

  if (!resumo) {
    return (
      <AdminSection>
        <div className="animate-pulse">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="h-6 w-48 rounded-token bg-superficie-alta" />
            <div className="h-6 w-20 rounded-pilula bg-superficie-alta" />
          </div>
          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[4.5rem] rounded-token bg-superficie-alta" />
            ))}
          </div>
          <div className="h-3.5 w-56 rounded-full bg-superficie-alta" />
        </div>
      </AdminSection>
    );
  }

  const pct = Math.round(resumo.participacao * 100);
  const destaqueClass = vereditoTextClass(resumo.veredito);
  const confirmada = resumo.origemDoDenominador === "confirmado";

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
      } else {
        setErro(true);
      }
    } finally {
      setSalvandoPresenca(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="tipo-subtitle m-0 text-ink">Participação ao vivo</h2>
          <div className="flex items-center gap-2">
            {ultimaAtualizacao && <AtualizadoHa desde={ultimaAtualizacao} />}
            <RefreshButton
              loading={atualizando}
              onClick={() => {
                setAtualizando(true);
                void carregar().finally(() => setAtualizando(false));
              }}
            />
          </div>
        </div>
        <p className="tipo-body mb-4 mt-0 text-ink-2">
          Números agregados, atualizados a cada 30 segundos.{" "}
          {confirmada
            ? "A participação usa a presença que você confirmou depois da festa."
            : "A participação usa a estimativa que você deu na criação do evento."}
        </p>

        <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat
            n={String(resumo.denominador ?? resumo.expectedGuests)}
            rotulo={confirmada ? "presentes" : "esperados"}
          />
          <Stat n={String(resumo.sessoesComUpload)} rotulo="fotografaram" />
          <Stat n={`${pct}%`} rotulo="participação" destaqueClass={destaqueClass} />
          <Stat n={String(resumo.totalFotos)} rotulo="fotos no ar" />
          <Stat n={String(resumo.sharesTotais)} rotulo="compartilhamentos" />
        </div>

        <p className={`tipo-body m-0 font-medium ${destaqueClass}`}>
          {ROTULO_VEREDITO[resumo.veredito]}
        </p>

        {resumo.intencao?.codigo === "funil.intencao_frustrada" && (
          <p className="tipo-caption mb-0 mt-2 text-ink-2">
            {resumo.intencao.frustradas === 1
              ? "1 convidado tirou foto e o envio não completou."
              : `${resumo.intencao.frustradas} convidados tiraram foto e o envio não completou.`}{" "}
            Com esses envios, a participação seria de{" "}
            {Math.round(resumo.intencao.participacaoPotencial * 100)}%. Vale checar o sinal do
            salão antes de concluir qualquer coisa sobre o produto.
          </p>
        )}
      </AdminSection>

      <AdminSection>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="tipo-subtitle m-0 text-ink">
            {confirmada ? "Presença confirmada" : "Confirmar quem apareceu"}
          </h2>
          <Badge tone={confirmada ? "accent" : "neutral"}>
            {confirmada ? "Confirmada" : "Estimada"}
          </Badge>
        </div>
        <p className="tipo-caption mb-3 mt-0 text-ink-3">
          {confirmada
            ? `A participação está sendo calculada sobre ${resumo.denominador} presentes. Se o número mudar, é só enviar de novo.`
            : "Convidado e presente não são o mesmo número, e a diferença muda a leitura da participação. Depois da festa, informe quantos apareceram de fato."}
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
            placeholder={String(resumo.denominador ?? resumo.expectedGuests)}
            value={presenca}
            onChange={(e) => setPresenca(e.target.value)}
            className="w-28 rounded-token border border-linha bg-bg px-3 py-2 font-titulo text-lg tabular-nums text-ink outline-none transition-[border-color] focus:border-acento"
          />
          <button
            type="button"
            disabled={salvandoPresenca || Number(presenca) <= 0}
            onClick={() => void confirmarPresenca()}
            className={`${adminClasses.primaryButton} ${
              salvandoPresenca || Number(presenca) <= 0 ? "opacity-60" : ""
            }`}
          >
            {salvandoPresenca ? "Salvando…" : "Confirmar presença"}
          </button>
        </div>
      </AdminSection>

      <AdminSection>
        <h2 className="tipo-subtitle m-0 mb-3 text-ink">Onde os convidados param</h2>
        <p className="tipo-caption mb-4 mt-0 text-ink-3">
          Cada degrau mostra quantas pessoas chegaram até ali. A espinha é cumulativa, então
          QR escaneado e Abriu o evento podem ter números parecidos. Se houver queda brusca
          em algum ponto, vale investigar fricção.
        </p>
        <div className="flex flex-col gap-2">
          {resumo.degraus.map((d) => {
            const pctRetencao = d.retencao === null ? null : Math.round(d.retencao * 100);
            const maxSessoes = resumo.degraus[0]?.sessoes ?? 1;
            const larguraBarra = maxSessoes > 0 ? Math.round((d.sessoes / maxSessoes) * 100) : 0;
            return (
              <div key={d.etapa} className="rounded-token bg-bg px-3 py-2.5">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="tipo-body text-ink">{ROTULO_ETAPA[d.etapa]}</span>
                  <span className="tipo-caption shrink-0 text-ink-3">
                    <span className="font-titulo tabular-nums text-acento-texto">{d.sessoes}</span>
                    {pctRetencao !== null && (
                      <span className="ml-1.5 text-ink-3">· {pctRetencao}%</span>
                    )}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-superficie-alta">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${larguraBarra}%`,
                      background: larguraBarra >= 60 ? "var(--acento)" : larguraBarra >= 30 ? "var(--ink-2)" : "var(--critico)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </AdminSection>

      <AdminSection>
        <h2 className="tipo-subtitle m-0 mb-3 text-ink">Canais de entrada</h2>
        <p className="tipo-caption mb-4 mt-0 text-ink-3">
          QR é só a peça impressa. WhatsApp, link copiado e código digitado abrem o evento
          direto, sem passar pelo scan da câmera.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat n={String(resumo.entradasPorVia?.qr ?? 0)} rotulo="QR impresso" />
          <Stat n={String(resumo.entradasPorVia?.wa ?? 0)} rotulo="WhatsApp" />
          <Stat n={String(resumo.entradasPorVia?.link ?? 0)} rotulo="link copiado" />
          <Stat n={String(resumo.entradasPorVia?.code ?? 0)} rotulo="código digitado" />
        </div>
      </AdminSection>

      <AdminSection>
        <h2 className="tipo-subtitle m-0 mb-3 text-ink">Efeito do feed social</h2>
        <p className="tipo-caption mb-4 mt-0 text-ink-3">
          Fotos subidas antes e depois da primeira abertura do feed. Se o número depois não
          cresce, o feed não está gerando o engajamento esperado.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat n={String(resumo.uploadsAntesDoFeed)} rotulo="antes do feed" />
          <Stat n={String(resumo.uploadsDepoisDoFeed)} rotulo="depois do feed" />
        </div>
      </AdminSection>

      <GuestDisplayNames
        eventoId={eventoId}
        sessoes={resumo.sessoes ?? []}
        onChanged={() => void carregar()}
      />

      {resumo.ultimas.length > 0 && (
        <AdminSection>
          <div className="mb-3 flex items-center gap-2">
            <span className="tipo-label text-acento-texto">Chegando agora</span>
            <span className="h-px flex-1 bg-linha" />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {resumo.ultimas.map((f) => (
              <span
                key={f.id}
                className="aspect-[3/4] overflow-hidden rounded-token bg-superficie-alta"
              >
                <img src={f.thumb} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
              </span>
            ))}
          </div>
        </AdminSection>
      )}
    </div>
  );
}

function Stat({
  n,
  rotulo,
  destaqueClass,
}: {
  n: string;
  rotulo: string;
  destaqueClass?: string;
}) {
  return (
    <div className="rounded-token bg-superficie-alta p-3.5">
      <p
        className={`m-0 font-titulo text-2xl font-light tabular-nums ${destaqueClass ?? "text-acento-texto"}`}
      >
        {n}
      </p>
      <p className="tipo-label mb-0 mt-1.5 text-ink-2">{rotulo}</p>
    </div>
  );
}
