"use client";

import type { ModoInteracao } from "@albora/core";
import dynamic from "next/dynamic";
import { memo, useCallback, useState } from "react";
import { Star, CommentIcon, ShareIcon, MoreIcon, AnimatedCounter, showToast, announce } from "@albora/ui-web";
import { useComments } from "@/features/feed/hooks/use-comments";
import { useReaction, type ResultadoReacao } from "@/features/feed/hooks/use-reaction";
import { useReactionList } from "@/features/feed/hooks/use-reaction-list";

// Code splitting: lazy load sheet components (used only on user interaction)
const CommentSheet = dynamic(() => import("./comment-sheet").then(m => ({ default: m.CommentSheet })), {
  ssr: false,
});

const ReactionListSheet = dynamic(() => import("./reaction-list-sheet").then(m => ({ default: m.ReactionListSheet })), {
  ssr: false,
});

const ReportSheet = dynamic(() => import("./report-sheet").then(m => ({ default: m.ReportSheet })), {
  ssr: false,
});

const CLASSE_BOTAO_ICONE =
  "flex min-h-11 cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 font-inherit text-inherit transition-[opacity,transform] duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-acento focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.96] disabled:cursor-default disabled:opacity-50 motion-reduce:transition-none motion-reduce:transform-none";

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
  onVerAutor?: ((sessaoId: string) => void) | undefined;
};

/** Reação não espera gate (ADR 0009); comentário, compartilhar, denunciar e bloquear esperam `interacao === "completo"`. */
export const PhotoInteraction = memo(function PhotoInteraction({
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
  onVerAutor,
}: Props) {
  const completo = interacao === "completo";

  const reacao = useReaction(uploadId, reacoesInicial, minhaInicial);
  const listaReacoes = useReactionList(uploadId);
  const comentarios = useComments(uploadId, completo);
  const [denunciaAberta, setDenunciaAberta] = useState(false);
  const [animandoStar, setAnimandoStar] = useState(false);

  const alternarReacao = useCallback(async () => {
    const curtindo = reacao.minha === null;
    
    if (curtindo) {
      setAnimandoStar(true);
      setTimeout(() => setAnimandoStar(false), 500);
    }

    const resultado = await reacao.alternar();
    
    if (!resultado) {
      showToast("Não foi possível curtir. Tente novamente.", "error");
      announce("Erro ao curtir");
      return;
    }
    
    if (resultado) {
      onReacoes?.(resultado);
      announce(curtindo ? "Curtiu" : "Removeu curtida");
    }
  }, [reacao, onReacoes]);

  const handleCompartilhar = useCallback(async () => {
    if (!onCompartilhar) return;
    
    try {
      await onCompartilhar();
      showToast("Preparado para stories", "success");
      announce("Foto preparada para compartilhar no stories");
    } catch {
      showToast("Não foi possível preparar. Tente novamente.", "error");
      announce("Erro ao preparar foto");
    }
  }, [onCompartilhar]);

  return (
    <>
      <div className="flex items-center gap-3.5 text-ink">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-pressed={reacao.minha !== null}
            data-testid="like-button"
            aria-label={reacao.minha ? "Remover curtida" : "Curtir"}
            disabled={reacao.alternando}
            onClick={() => void alternarReacao()}
            className={CLASSE_BOTAO_ICONE}
          >
            <Star
              size={24}
              filled={reacao.minha !== null}
              className={`${reacao.minha !== null ? "text-acento" : "text-ink-2"}${animandoStar ? " scale-110 transition-transform duration-[var(--tempo-rapido)]" : ""}`}
            />
          </button>
          {reacao.reacoes > 0 ? (
            <button
              type="button"
              aria-label="Ver quem curtiu"
              onClick={() => void listaReacoes.abrir()}
              className={`${CLASSE_BOTAO_ICONE} underline-offset-2 hover:underline`}
            >
              <AnimatedCounter
                value={reacao.reacoes}
                className="font-titulo text-[0.8125rem] tracking-rotulo text-ink"
              />
            </button>
          ) : (
            <span className="font-titulo text-[0.8125rem] tracking-rotulo text-ink-3">
              0
            </span>
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
            {comentarios.total > 0 && (
              <AnimatedCounter
                value={comentarios.total}
                className="font-titulo text-[0.8125rem] tracking-rotulo"
              />
            )}
          </button>
        )}

        {completo && minha && onCompartilhar && (
          <button
            type="button"
            aria-label="Compartilhar no Instagram ou WhatsApp"
            disabled={compartilhando}
            onClick={() => void handleCompartilhar()}
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

      <ReactionListSheet lista={listaReacoes} {...(onVerAutor ? { onVerAutor } : {})} />
      {completo && <CommentSheet comentarios={comentarios} {...(onVerAutor ? { onVerAutor } : {})} />}
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
});
