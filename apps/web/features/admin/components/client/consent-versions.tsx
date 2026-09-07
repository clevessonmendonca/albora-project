"use client";

import { Badge } from "@albora/ui-web";
import { useCallback, useEffect, useState } from "react";
import { AdminSection } from "@/features/admin/components/server/admin-shell";
import { AtualizadoHa, RefreshButton } from "./refresh-control";

type TipoDeConsentimento = "entrada" | "externo";

type VersaoDeConsentimento = {
  tipo: TipoDeConsentimento;
  versao: string;
  vigente: boolean;
  rotulo: string | null;
  texto: string | null;
  aceites: number;
  revogados: number | null;
  primeiroAceiteEm: string | null;
  ultimoAceiteEm: string | null;
};

type Resposta = { versoes: VersaoDeConsentimento[] };

const INTERVALO_MS = 60_000;

const ROTULO_TIPO: Record<TipoDeConsentimento, string> = {
  entrada: "Entrada no evento",
  externo: "Compartilhamento fora da festa",
};

const DESCRICAO_TIPO: Record<TipoDeConsentimento, string> = {
  entrada:
    "Todo convidado passa por aqui antes da primeira foto — é o consentimento que autoriza subir mídia neste evento.",
  externo:
    "Segundo consentimento, separado do de entrada — só autoriza levar a foto para fora do perímetro do evento (Instagram, WhatsApp).",
};

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Auditoria LGPD (task 21): versões de consentimento do evento, contagem de aceites e texto completo — nenhum nome de convidado aparece aqui. */
export function ConsentVersions({ eventoId }: { eventoId: string }) {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/consent`);
      if (!r.ok) throw new Error("falhou");
      setDados((await r.json()) as Resposta);
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

  if (erro && !dados) {
    return (
      <AdminSection>
        <p role="alert" className="tipo-body m-0 text-critico">
          Não foi possível carregar as versões de consentimento agora. Recarregue a página ou
          tente em instantes.
        </p>
      </AdminSection>
    );
  }

  if (!dados) {
    return (
      <AdminSection>
        <div className="animate-pulse">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="h-6 w-56 rounded-token bg-superficie-alta" />
            <div className="h-6 w-20 rounded-pilula bg-superficie-alta" />
          </div>
          <div className="grid gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 rounded-token bg-superficie-alta" />
            ))}
          </div>
        </div>
      </AdminSection>
    );
  }

  const porTipo = (tipo: TipoDeConsentimento) => dados.versoes.filter((v) => v.tipo === tipo);

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="tipo-subtitle m-0 text-ink">Consentimento</h2>
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
        <p className="tipo-body m-0 text-ink-2">
          Cada versão de consentimento é datada e versionada — aqui fica o texto exato que os
          convidados aceitaram e quantos aceitaram cada versão. Uso de auditoria LGPD, sem
          nomes individuais.
        </p>
      </AdminSection>

      {(["entrada", "externo"] as const).map((tipo) => {
        const lista = porTipo(tipo);
        if (lista.length === 0) return null;
        return (
          <AdminSection key={tipo}>
            <h3 className="tipo-body m-0 font-medium text-ink">{ROTULO_TIPO[tipo]}</h3>
            <p className="tipo-caption mb-4 mt-1.5 text-ink-3">
              {DESCRICAO_TIPO[tipo]}
            </p>
            <div className="flex flex-col gap-3">
              {lista.map((v) => (
                <VersionCard key={`${v.tipo}:${v.versao}`} versao={v} />
              ))}
            </div>
          </AdminSection>
        );
      })}
    </div>
  );
}

function VersionCard({ versao }: { versao: VersaoDeConsentimento }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="rounded-token border border-linha bg-bg p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tipo-body font-medium text-ink">
            {versao.rotulo ?? `Versão ${versao.versao}`}
          </span>
          <Badge tone="neutral">{versao.versao}</Badge>
          {versao.vigente ? (
            <Badge tone="accent">vigente</Badge>
          ) : (
            <Badge tone="outline">versão anterior</Badge>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="tipo-subtitle tabular-nums text-acento-texto">
            {versao.aceites}
          </span>
          <span className="tipo-caption text-ink-3">
            {versao.aceites === 1 ? "aceite" : "aceites"}
          </span>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-x-4 gap-y-1 tipo-caption text-ink-3">
        <span>Primeiro aceite: {formatarData(versao.primeiroAceiteEm)}</span>
        <span>Último aceite: {formatarData(versao.ultimoAceiteEm)}</span>
        {versao.revogados !== null && (
          <span>
            Revogados: <span className="text-ink">{versao.revogados}</span>
          </span>
        )}
      </div>

      {versao.texto ? (
        <>
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="tipo-caption inline-flex min-h-11 items-center cursor-pointer border-none bg-transparent p-0 text-acento-texto underline underline-offset-2"
          >
            {aberto ? "Ocultar texto completo" : "Ler texto completo"}
          </button>
          {aberto && (
            <p className="tipo-caption mb-0 mt-2 rounded-token bg-superficie-alta p-3 leading-relaxed text-ink-2">
              {versao.texto}
            </p>
          )}
        </>
      ) : (
        <p className="tipo-caption m-0 italic text-ink-3">
          Texto desta versão não está mais no registro do produto.
        </p>
      )}
    </div>
  );
}
