"use client";

import type { CodigoDaTese } from "@albora/core";
import { useCallback, useEffect, useState } from "react";
import { raio } from "../../../landing/pecas";
import { SecaoAdmin } from "../../casca";

type Resumo = {
  expectedGuests: number;
  sessoesComUpload: number;
  totalFotos: number;
  filaRevisao: number;
  participacao: number;
  veredito: CodigoDaTese;
  ultimas: { id: string; thumb: string; criadaEm: string }[];
};

const INTERVALO_MS = 30_000;

const ROTULO_VEREDITO: Record<CodigoDaTese, string> = {
  "funil.tese_validada": "Participação na meta (≥40%)",
  "funil.mexe_em_friccao": "Abaixo da meta — vale olhar fricção",
  "funil.parar": "Participação crítica — investigar antes de escalar",
};

type Props = {
  eventoId: string;
};

export function ResumoAoVivo({ eventoId }: Props) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/eventos/${eventoId}`);
      if (!r.ok) throw new Error("falhou");
      setResumo((await r.json()) as Resumo);
      setErro(false);
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
      <SecaoAdmin>
        <p style={{ margin: 0, color: "var(--critico)" }}>Não foi possível carregar o painel.</p>
      </SecaoAdmin>
    );
  }

  if (!resumo) {
    return (
      <SecaoAdmin>
        <p style={{ margin: 0, color: "var(--ink-2)" }}>Carregando painel…</p>
      </SecaoAdmin>
    );
  }

  const pct = Math.round(resumo.participacao * 100);
  const destaque =
    resumo.veredito === "funil.tese_validada"
      ? "var(--acento-texto)"
      : resumo.veredito === "funil.mexe_em_friccao"
        ? "var(--ink)"
        : "var(--critico)";

  return (
    <SecaoAdmin>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <p style={{ margin: 0, fontFamily: "var(--fonte-titulo)", fontSize: "1.125rem" }}>
          Ao vivo
        </p>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.25rem 0.65rem",
            fontSize: "0.75rem",
            fontFamily: "var(--fonte-titulo)",
            color: "var(--sobre-acento)",
            backgroundColor: "var(--acento)",
            ...raio("var(--raio-pilula)"),
          }}
        >
          <span
            style={{
              width: "0.4rem",
              height: "0.4rem",
              borderRadius: "50%",
              backgroundColor: "currentColor",
            }}
          />
          festa
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(7rem, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <Stat n={String(pct) + "%"} rotulo="participação" destaque={destaque} />
        <Stat
          n={`${resumo.sessoesComUpload}/${resumo.expectedGuests}`}
          rotulo="convidados com foto"
        />
        <Stat n={String(resumo.totalFotos)} rotulo="fotos enviadas" />
        <Stat n={String(resumo.filaRevisao)} rotulo="na fila de revisão" />
      </div>

      <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: destaque }}>
        {ROTULO_VEREDITO[resumo.veredito]}
      </p>

      {resumo.ultimas.length > 0 && (
        <>
          <p
            style={{
              margin: "0 0 0.5rem",
              fontSize: "0.6875rem",
              letterSpacing: "var(--tracking-rotulo)",
              textTransform: "uppercase",
              color: "var(--acento-texto)",
            }}
          >
            Chegando agora
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "0.375rem",
            }}
          >
            {resumo.ultimas.map((f) => (
              <span
                key={f.id}
                style={{
                  position: "relative",
                  aspectRatio: "3 / 4",
                  overflow: "hidden",
                  ...raio("var(--raio)"),
                  backgroundColor: "var(--superficie-alta)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada */}
                <img
                  src={f.thumb}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </span>
            ))}
          </div>
        </>
      )}
    </SecaoAdmin>
  );
}

function Stat({
  n,
  rotulo,
  destaque,
}: {
  n: string;
  rotulo: string;
  destaque?: string;
}) {
  return (
    <div
      style={{
        padding: "0.875rem",
        backgroundColor: "var(--superficie-alta)",
        ...raio("var(--raio)"),
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--fonte-titulo)",
          fontSize: "1.5rem",
          fontWeight: 300,
          color: destaque ?? "var(--acento-texto)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {n}
      </p>
      <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: "var(--ink-2)" }}>
        {rotulo}
      </p>
    </div>
  );
}
