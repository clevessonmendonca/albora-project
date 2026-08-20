"use client";

import type { ModoInteracao } from "@albora/core";
import { useState } from "react";
import { Star, CommentIcon, ShareIcon, MoreIcon } from "@albora/ui-web";
import { useComments } from "@/features/feed/hooks/use-comments";
import { useReaction, type ResultadoReacao } from "@/features/feed/hooks/use-reaction";
import { useReactionList } from "@/features/feed/hooks/use-reaction-list";
import { CommentSheet } from "./comment-sheet";
import { ReactionListSheet } from "./reaction-list-sheet";
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

/**
 * Barra de estrela + comentário numa foto do feed (spec 008 + 014).
 *
 * A estrela nunca espera o gate — reagir é liberado assim que a mídia
 * publica (ADR 0009, atualizado). Comentário, compartilhar, denunciar e
 * bloquear continuam atrás de `interacao === "completo"`: são eles que
 * carregam identidade do autor (`sessaoAutor`/`minha`) e o horário que o
 * casal escolheu.
 */
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
  const completo = interacao === "completo";

  const reacao = useReaction(uploadId, reacoesInicial, minhaInicial);
  const listaReacoes = useReactionList(uploadId);
  const comentarios = useComments(uploadId, completo);
  const [denunciaAberta, setDenunciaAberta] = useState(false);

  const alternarReacao = async () => {
    const resultado = await reacao.alternar();
    if (resultado) onReacoes?.(resultado);
  };

  return (
    <>
      <div className="flex items-center gap-5 text-ink">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-pressed={reacao.minha !== null}
            aria-label={reacao.minha ? "Remover curtida" : "Curtir"}
            disabled={reacao.alternando}
            onClick={() => void alternarReacao()}
            className={CLASSE_BOTAO_ICONE}
          >
            <Star size={24} filled={reacao.minha !== null} />
          </button>
          {reacao.reacoes > 0 ? (
            <button
              type="button"
              aria-label="Ver quem curtiu"
              onClick={() => void listaReacoes.abrir()}
              className={`${CLASSE_BOTAO_ICONE} underline-offset-2 hover:underline`}
            >
              <span className="font-titulo text-[0.8125rem] tracking-rotulo">{reacao.reacoes}</span>
            </button>
          ) : (
            <span className="font-titulo text-[0.8125rem] tracking-rotulo">{reacao.reacoes}</span>
          )}
        </div>

        {completo && (
          <button
            type="button"
            aria-expanded={comentarios.aberto}
            onClick={comentarios.abrir}
            className={CLASSE_BOTAO_ICONE}
          >
            <CommentIcon size={22} />
            <span className="font-titulo text-[0.8125rem] tracking-rotulo">
              {comentarios.total > 0 ? comentarios.total : ""}
            </span>
          </button>
        )}

        {completo && minha && onCompartilhar && (
          <button
            type="button"
            aria-label="Compartilhar no Instagram ou WhatsApp"
            disabled={compartilhando}
            onClick={onCompartilhar}
            className={CLASSE_BOTAO_ICONE}
          >
            <ShareIcon size={21} />
            <span className="font-titulo text-[0.75rem] uppercase tracking-rotulo">
              {compartilhando ? "Montando…" : "Stories"}
            </span>
          </button>
        )}

        {completo && (
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
        )}
      </div>

      <ReactionListSheet lista={listaReacoes} />
      {completo && <CommentSheet comentarios={comentarios} />}
      {completo && (
        <ReportSheet
          open={denunciaAberta}
          onClose={() => setDenunciaAberta(false)}
          uploadId={uploadId}
          {...(autor ? { autor } : {})}
          {...(sessaoAutor ? { sessaoAutor } : {})}
          {...(minha !== undefined ? { minha } : {})}
          {...(onBloqueado ? { onBloqueado } : {})}
        />
      )}
    </>
  );
}
