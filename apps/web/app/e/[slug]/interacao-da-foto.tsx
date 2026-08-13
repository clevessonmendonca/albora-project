"use client";

import type { ModoInteracao } from "@albora/core";
import { useState } from "react";
import { Estrela, IconeComentario, IconeCompartilhar, IconeMais } from "../../telas/pecas-de-tela";
import { usarComentarios } from "@/lib/usar-comentarios";
import { usarReacao, type ResultadoReacao } from "@/lib/usar-reacao";
import { SheetComentarios } from "./sheet-comentarios";
import { SheetDenuncia } from "./sheet-denuncia";

const TOQUE = "44px";

type Props = {
  uploadId: string;
  interacao: ModoInteracao;
  reacoesInicial?: number | undefined;
  minhaInicial?: string | null | undefined;
  sessaoAutor?: string | undefined;
  autor?: string | undefined;
  minha?: boolean | undefined;
  onReacoes?: (resultado: ResultadoReacao) => void;
  onBloqueado?: () => void;
  onCompartilhar?: () => void;
  compartilhando?: boolean;
};

/** Barra de estrela + comentário numa foto do feed (spec 008 + 014). */
export function InteracaoDaFoto({
  uploadId,
  interacao,
  reacoesInicial,
  minhaInicial,
  sessaoAutor,
  autor,
  minha,
  onReacoes,
  onBloqueado,
  onCompartilhar,
  compartilhando,
}: Props) {
  if (interacao !== "completo") return null;

  return (
    <InteracaoCompleta
      uploadId={uploadId}
      {...(reacoesInicial !== undefined ? { reacoesInicial } : {})}
      {...(minhaInicial !== undefined ? { minhaInicial } : {})}
      {...(sessaoAutor ? { sessaoAutor } : {})}
      {...(autor ? { autor } : {})}
      {...(minha !== undefined ? { minha } : {})}
      {...(onReacoes ? { onReacoes } : {})}
      {...(onBloqueado ? { onBloqueado } : {})}
      {...(onCompartilhar ? { onCompartilhar } : {})}
      {...(compartilhando !== undefined ? { compartilhando } : {})}
    />
  );
}

function InteracaoCompleta({
  uploadId,
  reacoesInicial,
  minhaInicial,
  sessaoAutor,
  autor,
  minha,
  onReacoes,
  onBloqueado,
  onCompartilhar,
  compartilhando,
}: Omit<Props, "interacao">) {
  const reacao = usarReacao(uploadId, reacoesInicial, minhaInicial);
  const comentarios = usarComentarios(uploadId, true);
  const [denunciaAberta, setDenunciaAberta] = useState(false);

  const alternarReacao = async () => {
    const resultado = await reacao.alternar();
    if (resultado) onReacoes?.(resultado);
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.125rem",
          color: "var(--ink)",
        }}
      >
        <button
          type="button"
          aria-pressed={reacao.minha !== null}
          disabled={reacao.alternando}
          onClick={() => void alternarReacao()}
          style={botaoIcone}
        >
          <Estrela tamanho={24} cheia={reacao.minha !== null} />
          <span style={{ fontSize: "0.84375rem" }}>{reacao.reacoes}</span>
        </button>

        <button
          type="button"
          aria-expanded={comentarios.aberto}
          onClick={comentarios.abrir}
          style={botaoIcone}
        >
          <IconeComentario tamanho={22} />
          <span style={{ fontSize: "0.84375rem" }}>
            {comentarios.total > 0 ? comentarios.total : ""}
          </span>
        </button>

        {minha && onCompartilhar && (
          <button
            type="button"
            aria-label="Compartilhar esta foto"
            disabled={compartilhando}
            onClick={onCompartilhar}
            style={botaoIcone}
          >
            <IconeCompartilhar tamanho={21} />
          </button>
        )}

        <div style={{ marginLeft: "auto" }}>
          <button
            type="button"
            aria-expanded={denunciaAberta}
            aria-label="Mais opções"
            onClick={() => setDenunciaAberta(true)}
            style={botaoIcone}
          >
            <IconeMais tamanho={20} />
          </button>
        </div>
      </div>

      <SheetComentarios comentarios={comentarios} />
      <SheetDenuncia
        aberto={denunciaAberta}
        onFechar={() => setDenunciaAberta(false)}
        uploadId={uploadId}
        {...(autor ? { autor } : {})}
        {...(sessaoAutor ? { sessaoAutor } : {})}
        {...(minha !== undefined ? { minha } : {})}
        {...(onBloqueado ? { onBloqueado } : {})}
      />
    </>
  );
}

const botaoIcone: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.375rem",
  minHeight: TOQUE,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  font: "inherit",
};
