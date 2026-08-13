"use client";

import type { ModoInteracao } from "@albora/core";
import { useState } from "react";
import { Star, CommentIcon, ShareIcon, MoreIcon } from "@albora/ui-web";
import { useComments } from "@/features/feed/hooks/use-comments";
import { useReaction, type ResultadoReacao } from "@/features/feed/hooks/use-reaction";
import { CommentSheet } from "./comment-sheet";
import { ReportSheet } from "./report-sheet";

const CLASSE_BOTAO_ICONE =
  "flex min-h-11 cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 font-inherit text-inherit disabled:cursor-default";

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
export function PhotoInteraction({
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
  const reacao = useReaction(uploadId, reacoesInicial, minhaInicial);
  const comentarios = useComments(uploadId, true);
  const [denunciaAberta, setDenunciaAberta] = useState(false);

  const alternarReacao = async () => {
    const resultado = await reacao.alternar();
    if (resultado) onReacoes?.(resultado);
  };

  return (
    <>
      <div className="flex items-center gap-4.5 text-ink">
        <button
          type="button"
          aria-pressed={reacao.minha !== null}
          disabled={reacao.alternando}
          onClick={() => void alternarReacao()}
          className={CLASSE_BOTAO_ICONE}
        >
          <Star size={24} filled={reacao.minha !== null} />
          <span className="text-[0.84375rem]">{reacao.reacoes}</span>
        </button>

        <button
          type="button"
          aria-expanded={comentarios.aberto}
          onClick={comentarios.abrir}
          className={CLASSE_BOTAO_ICONE}
        >
          <CommentIcon size={22} />
          <span className="text-[0.84375rem]">
            {comentarios.total > 0 ? comentarios.total : ""}
          </span>
        </button>

        {minha && onCompartilhar && (
          <button
            type="button"
            aria-label="Compartilhar esta foto"
            disabled={compartilhando}
            onClick={onCompartilhar}
            className={CLASSE_BOTAO_ICONE}
          >
            <ShareIcon size={21} />
          </button>
        )}

        <div className="ml-auto">
          <button
            type="button"
            aria-expanded={denunciaAberta}
            aria-label="Mais opções"
            onClick={() => setDenunciaAberta(true)}
            className={CLASSE_BOTAO_ICONE}
          >
            <MoreIcon size={20} />
          </button>
        </div>
      </div>

      <CommentSheet comentarios={comentarios} />
      <ReportSheet
        open={denunciaAberta}
        onClose={() => setDenunciaAberta(false)}
        uploadId={uploadId}
        {...(autor ? { autor } : {})}
        {...(sessaoAutor ? { sessaoAutor } : {})}
        {...(minha !== undefined ? { minha } : {})}
        {...(onBloqueado ? { onBloqueado } : {})}
      />
    </>
  );
}
