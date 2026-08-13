"use client";

import type { CSSProperties, ReactNode } from "react";
import { raio } from "@/app/landing/pecas";
import {
  CabecalhoConvidado,
  ChaoConvidado,
  FaixaMissao,
  PADDING_LATERAL,
} from "@/app/telas/shell-convidado";
import { Pilula } from "@/app/telas/pecas-de-tela";

/**
 * A câmera com missão sobre o visor — espelha `TelaCamera` em `/telas`.
 *
 * Não monta preview ao vivo: o obturador abre a câmera nativa do aparelho
 * (`capture="environment"`). O retângulo aqui é o **lugar** da missão e dos
 * places, não um stream de vídeo.
 */

export function CameraView({
  eventTitle,
  acaoCabecalho,
  missao,
  places,
  lugarAtivo,
  onLugar,
  recentes,
  processando,
  onDisparar,
  onRolo,
  onVoltar,
  rodape,
}: {
  eventTitle: string;
  acaoCabecalho?: ReactNode;
  missao?: { indice: number; total: number; title: string } | null;
  places: readonly { id: string; title: string }[];
  lugarAtivo: string | null;
  onLugar: (id: string | null) => void;
  recentes: readonly string[];
  processando: boolean;
  onDisparar: () => void;
  onRolo: () => void;
  onVoltar?: () => void;
  rodape?: ReactNode;
}) {
  return (
    <ChaoConvidado>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          paddingBottom: "calc(6.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ padding: `0 ${PADDING_LATERAL}` }}>
          <CabecalhoConvidado titulo={eventTitle} acao={acaoCabecalho} />
          {onVoltar && (
            <button
              type="button"
              onClick={onVoltar}
              style={{
                font: "inherit",
                padding: 0,
                margin: "0 0 0.5rem",
                border: "none",
                background: "transparent",
                color: "var(--ink-3)",
                fontSize: "0.75rem",
                letterSpacing: "var(--tracking-rotulo)",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              ← Missões
            </button>
          )}
        </div>

        <div
          style={{
            position: "relative",
            flex: 1,
            minHeight: "16rem",
            margin: "0 0.75rem",
            overflow: "hidden",
            backgroundColor: "var(--superficie)",
            backgroundImage:
              "radial-gradient(ellipse 120% 80% at 50% 20%, color-mix(in srgb, var(--ink) 8%, transparent), transparent 55%)",
            ...raio("var(--raio-superficie)"),
          }}
        >
          {missao && (
            <div
              style={{
                position: "absolute",
                top: "0.875rem",
                left: "0.875rem",
                right: "0.875rem",
                zIndex: 1,
              }}
            >
              <FaixaMissao
                indice={missao.indice}
                total={missao.total}
                titulo={missao.title}
              />
            </div>
          )}

          {places.length > 0 && (
            <div
              style={{
                position: "absolute",
                left: "0.875rem",
                right: "0.875rem",
                bottom: "0.875rem",
                display: "flex",
                gap: "0.4375rem",
                flexWrap: "wrap",
                zIndex: 1,
              }}
            >
              {places.slice(0, 4).map((l) => (
                <BotaoPilula
                  key={l.id}
                  ativa={lugarAtivo === l.id}
                  onClick={() => onLugar(lugarAtivo === l.id ? null : l.id)}
                >
                  {l.title}
                </BotaoPilula>
              ))}
            </div>
          )}
        </div>

        <ControlesDisparo
          recentes={recentes}
          processando={processando}
          onDisparar={onDisparar}
          onRolo={onRolo}
        />

        {rodape ? <div style={{ padding: `0 ${PADDING_LATERAL}` }}>{rodape}</div> : null}
      </div>
    </ChaoConvidado>
  );
}

function BotaoPilula({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativa}
      onClick={onClick}
      style={{
        font: "inherit",
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
      }}
    >
      <Pilula ativa={ativa}>{children}</Pilula>
    </button>
  );
}

function ControlesDisparo({
  recentes,
  processando,
  onDisparar,
  onRolo,
}: {
  recentes: readonly string[];
  processando: boolean;
  onDisparar: () => void;
  onRolo: () => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "1.25rem 1.75rem 0.75rem",
      }}
    >
      <span style={{ display: "flex", gap: "0.4375rem" }}>
        {[0, 1, 2].map((i) => (
          <MiniaturaRecente key={i} url={recentes[i]} />
        ))}
      </span>

      <button
        type="button"
        aria-label="Fotografar"
        disabled={processando}
        onClick={onDisparar}
        style={{
          justifySelf: "center",
          display: "grid",
          placeItems: "center",
          width: "4.5rem",
          height: "4.5rem",
          padding: 0,
          borderRadius: "50%",
          borderWidth: "3px",
          borderStyle: "solid",
          borderColor: "var(--ink)",
          background: "transparent",
          cursor: processando ? "default" : "pointer",
          opacity: processando ? 0.45 : 1,
        }}
      >
        <span
          style={{
            width: "3.625rem",
            height: "3.625rem",
            borderRadius: "50%",
            backgroundColor: "var(--acento)",
          }}
        />
      </button>

      <button
        type="button"
        onClick={onRolo}
        disabled={processando}
        style={{
          justifySelf: "end",
          font: "inherit",
          fontSize: "0.75rem",
          color: "var(--ink-3)",
          padding: "0.5rem",
          border: "none",
          background: "transparent",
          cursor: processando ? "default" : "pointer",
        }}
      >
        Rolo
      </button>
    </div>
  );
}

function MiniaturaRecente({ url }: { url: string | undefined }) {
  const caixa: CSSProperties = {
    position: "relative",
    width: "1.875rem",
    height: "1.875rem",
    overflow: "hidden",
    backgroundColor: "var(--superficie-alta)",
    ...raio("0.5rem"),
  };

  if (!url) {
    return <span style={caixa} aria-hidden />;
  }

  return (
    <span style={caixa}>
      <img
        src={url}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </span>
  );
}

export function QueueLabel({ pendentes }: { pendentes: number }) {
  if (pendentes <= 0) return null;
  return <Pilula>{pendentes === 1 ? "1 na fila" : `${pendentes} na fila`}</Pilula>;
}
