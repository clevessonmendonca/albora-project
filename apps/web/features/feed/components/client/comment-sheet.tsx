"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MoreIcon, SecondaryButton, BottomSheet, announce } from "@albora/ui-web";
import type { ComentarioVisivel, CommentsController } from "@/features/feed/hooks/use-comments";

const CLASSE_ACAO_SECUNDARIA =
  "tipo-label flex min-h-11 items-center cursor-pointer border-none bg-transparent p-0 uppercase text-ink-3 transition-colors duration-instantaneo ease-mola hover:text-ink";

const CLASSE_ITEM_MENU =
  "block min-h-11 w-full cursor-pointer border-none bg-transparent px-3.5 py-2.5 text-left font-inherit text-[0.85rem] text-ink transition-colors duration-instantaneo ease-mola hover:bg-superficie-alta";

export function CommentSheet({
  comentarios,
  onVerAutor,
}: {
  comentarios: CommentsController;
  onVerAutor?: (sessaoId: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const prevPublicando = useRef(false);

  useEffect(() => {
    if (prevPublicando.current && !comentarios.publicando) {
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
    prevPublicando.current = comentarios.publicando;
  }, [comentarios.publicando]);

  const publicarEScrollar = useCallback(async () => {
    const sucesso = await comentarios.publicar();
    if (sucesso) {
      announce("Comentário enviado");
    }
  }, [comentarios]);

  return (
    <BottomSheet
      title={comentarios.total > 0 ? `Comentários (${comentarios.total})` : "Comentários"}
      open={comentarios.aberto}
      onClose={comentarios.fechar}
      titleId="sheet-comentarios-titulo"
      footer={
        <Composer comentarios={comentarios} onPublicar={publicarEScrollar} />
      }
    >
      {comentarios.carregando && (
        <p className="tipo-caption m-0 text-ink-3">Carregando…</p>
      )}

      {comentarios.threads.length === 0 && !comentarios.carregando && (
        <p className="tipo-caption m-0 text-ink-2">
          Seja o primeiro a comentar.
        </p>
      )}

      <ul className="m-0 grid list-none gap-3.5 p-0">
        {comentarios.threads.map((t) => (
          <li key={t.id}>
            <LinhaComentario
              comentario={t}
              comentarios={comentarios}
              indent={0}
              onVerAutor={onVerAutor}
            />
          </li>
        ))}
      </ul>
      <div ref={endRef} />
    </BottomSheet>
  );
}

function Composer({
  comentarios,
  onPublicar,
}: {
  comentarios: CommentsController;
  onPublicar: () => void;
}) {
  function aoSubmeter(e: React.FormEvent) {
    e.preventDefault();
    if (!comentarios.publicando && comentarios.texto.trim()) onPublicar();
  }

  return (
    <form onSubmit={aoSubmeter} className="grid gap-2">
      {comentarios.respostaA && (
        <p className="tipo-caption m-0 text-ink-3">
          Respondendo…{" "}
          <button
            type="button"
            onClick={comentarios.cancelarResposta}
            className="cursor-pointer border-none bg-transparent p-0 font-inherit text-acento transition-opacity duration-instantaneo ease-mola hover:opacity-70"
          >
            Cancelar
          </button>
        </p>
      )}

      <div className="flex gap-2">
        <label htmlFor="comment-input" className="sr-only">
          {comentarios.respostaA ? "Sua resposta" : "Escrever comentário"}
        </label>
        <input
          id="comment-input"
          type="text"
          value={comentarios.texto}
          maxLength={comentarios.maxCaracteres}
          placeholder={comentarios.respostaA ? "Sua resposta…" : "Escreva um comentário…"}
          onChange={(e) => comentarios.setTexto(e.target.value)}
          className="min-h-12 flex-1 rounded-pilula border border-linha bg-bg px-4 text-[0.9rem] text-ink outline-none transition-[border-color,box-shadow] duration-instantaneo ease-mola placeholder:text-ink-3 focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto"
        />
        <button
          type="submit"
          disabled={comentarios.publicando || comentarios.texto.trim() === ""}
          aria-label={comentarios.publicando ? "Enviando comentário" : "Enviar comentário"}
          className={`min-h-12 cursor-pointer rounded-pilula border-none bg-acento px-4 text-[0.85rem] text-sobre-acento transition-transform duration-instantaneo ease-mola hover:opacity-90 active:scale-[0.96] disabled:cursor-default disabled:active:scale-100 ${
            comentarios.publicando || comentarios.texto.trim() === "" ? "opacity-50" : ""
          }`}
        >
          {comentarios.publicando ? "Enviando…" : "Enviar"}
        </button>
      </div>
      {comentarios.texto.length > 0 && (
        <span className="text-right text-[0.6875rem] tabular-nums text-ink-3">
          {comentarios.maxCaracteres - comentarios.texto.length}
        </span>
      )}

      {comentarios.erro && (
        <p className="tipo-caption m-0 text-critico" role="alert">
          Não deu agora. Tente de novo.
        </p>
      )}

      <SecondaryButton onClick={comentarios.fechar}>Fechar</SecondaryButton>
    </form>
  );
}

function LinhaComentario({
  comentario,
  comentarios,
  indent,
  onVerAutor,
}: {
  comentario: ComentarioVisivel;
  comentarios: CommentsController;
  indent: number;
  onVerAutor?: ((sessaoId: string) => void) | undefined;
}) {
  const hora = formatarHora(comentario.criadaEm);

  const nomeAutor =
    !comentario.meu && !comentario.pendente && comentario.sessaoAutor && onVerAutor ? (
      <button
        type="button"
        onClick={() => onVerAutor(comentario.sessaoAutor)}
        className="cursor-pointer border-none bg-transparent p-0 font-inherit text-ink underline transition-opacity duration-instantaneo ease-mola hover:opacity-70"
      >
        {comentario.autor}
      </button>
    ) : (
      <span className="text-ink">{comentario.autor}</span>
    );

  return (
    <div className={indent ? "ml-4" : undefined}>
      <p className={`tipo-caption m-0 ${indent ? "text-[0.8125rem]" : ""}`}>
        {nomeAutor} {comentario.texto}
        {hora && (
          <span className="ml-[0.35rem] text-[0.75rem] text-ink-3">
            · {hora}
          </span>
        )}
        {comentario.pendente && (
          <span className="ml-[0.35rem] text-[0.75rem] text-ink-3">
            · enviando
          </span>
        )}
      </p>
      <div className="mt-1 flex flex-wrap gap-3">
        {indent === 0 && !comentario.pendente && (
          <button
            type="button"
            onClick={() => comentarios.iniciarResposta(comentario.id)}
            className={CLASSE_ACAO_SECUNDARIA}
          >
            Responder
          </button>
        )}
        {comentario.meu && !comentario.pendente && (
          <button
            type="button"
            disabled={comentarios.publicando}
            onClick={() => {
              void comentarios.remover(comentario.id);
              announce("Comentário removido");
            }}
            className={`${CLASSE_ACAO_SECUNDARIA} disabled:cursor-default`}
          >
            Remover
          </button>
        )}
        {!comentario.meu && !comentario.pendente && comentario.sessaoAutor && (
          <MenuOpcoes
            autor={comentario.autor}
            onDenunciar={() => void comentarios.denunciar(comentario.id)}
            onBloquear={() => void comentarios.bloquear(comentario.sessaoAutor)}
          />
        )}
      </div>
      {comentario.respostas.map((r) => (
        <div key={r.id} className="mt-[0.35rem]">
          <LinhaComentario comentario={r} comentarios={comentarios} indent={1} onVerAutor={onVerAutor} />
        </div>
      ))}
    </div>
  );
}

function MenuOpcoes({
  autor,
  onDenunciar,
  onBloquear,
}: {
  autor: string;
  onDenunciar: () => void;
  onBloquear: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    
    // Focus trap: foca o primeiro botão ao abrir
    firstButtonRef.current?.focus();
    
    function fecharFora(ev: MouseEvent) {
      if (ref.current && !ref.current.contains(ev.target as Node)) setAberto(false);
    }
    function tecla(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        setAberto(false);
        ev.stopPropagation();
      }
    }
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Mais opções"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        className={CLASSE_ACAO_SECUNDARIA}
      >
        <MoreIcon size={16} />
      </button>
      {aberto && (
        <div
          role="menu"
          aria-label="Opções do comentário"
          className="elev-2 absolute left-0 top-full z-10 mt-[0.15rem] min-w-34 origin-top-left scale-100 rounded-token py-[0.35rem] opacity-100 transition-[opacity,transform] duration-instantaneo ease-mola starting:scale-95 starting:opacity-0"
        >
          <button
            ref={firstButtonRef}
            type="button"
            role="menuitem"
            className={CLASSE_ITEM_MENU}
            onClick={() => {
              setAberto(false);
              onDenunciar();
              announce("Comentário denunciado");
            }}
          >
            Denunciar
          </button>
          <button
            type="button"
            role="menuitem"
            className={CLASSE_ITEM_MENU}
            onClick={() => {
              setAberto(false);
              onBloquear();
              announce(`${autor} bloqueado`);
            }}
          >
            Bloquear {autor}
          </button>
        </div>
      )}
    </div>
  );
}

function formatarHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
