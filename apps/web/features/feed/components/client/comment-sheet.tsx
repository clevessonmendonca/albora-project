"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MoreIcon, SecondaryButton, BottomSheet } from "@albora/ui-web";
import type { ComentarioVisivel, CommentsController } from "@/features/feed/hooks/use-comments";

const CLASSE_ACAO_SECUNDARIA =
  "cursor-pointer border-none bg-transparent p-0 font-inherit text-[0.75rem] uppercase tracking-[0.06em] text-ink-3";

const CLASSE_ITEM_MENU =
  "block w-full cursor-pointer border-none bg-transparent px-3.5 py-2.5 text-left font-inherit text-[0.85rem] text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta";

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

  const publicarEScrollar = useCallback(() => {
    void comentarios.publicar();
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
        <p className="m-0 text-[0.85rem] text-ink-3">Carregando…</p>
      )}

      {comentarios.threads.length === 0 && !comentarios.carregando && (
        <p className="m-0 text-[0.9rem] text-ink-2">
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
        <p className="m-0 text-[0.8rem] text-ink-3">
          Respondendo…{" "}
          <button
            type="button"
            onClick={comentarios.cancelarResposta}
            className="cursor-pointer border-none bg-transparent p-0 font-inherit text-acento"
          >
            Cancelar
          </button>
        </p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={comentarios.texto}
          maxLength={comentarios.maxCaracteres}
          placeholder={comentarios.respostaA ? "Sua resposta…" : "Escreva um comentário…"}
          onChange={(e) => comentarios.setTexto(e.target.value)}
          className="min-h-11 flex-1 rounded-pilula border border-linha bg-bg px-3.5 text-[0.9rem] text-ink outline-none focus:border-acento"
        />
        <button
          type="submit"
          disabled={comentarios.publicando || comentarios.texto.trim() === ""}
          className={`min-h-11 cursor-pointer rounded-pilula border-none bg-acento px-4 text-[0.85rem] text-sobre-acento transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80 disabled:cursor-default ${
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
        <p className="m-0 text-[0.85rem] text-critico">
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
  const [menu, setMenu] = useState(false);
  const hora = formatarHora(comentario.criadaEm);

  const nomeAutor =
    !comentario.meu && !comentario.pendente && comentario.sessaoAutor && onVerAutor ? (
      <button
        type="button"
        onClick={() => onVerAutor(comentario.sessaoAutor)}
        className="border-none bg-transparent p-0 font-inherit text-ink underline cursor-pointer"
      >
        {comentario.autor}
      </button>
    ) : (
      <span className="text-ink">{comentario.autor}</span>
    );

  return (
    <div className={indent ? "ml-4" : undefined}>
      <p className={`m-0 leading-[1.45] ${indent ? "text-[0.8125rem]" : "text-[0.84375rem]"}`}>
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
            onClick={() => void comentarios.remover(comentario.id)}
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

  useEffect(() => {
    if (!aberto) return;
    function fecharFora(ev: MouseEvent) {
      if (ref.current && !ref.current.contains(ev.target as Node)) setAberto(false);
    }
    function tecla(ev: KeyboardEvent) {
      if (ev.key === "Escape") setAberto(false);
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
        <div className="absolute left-0 top-full z-10 mt-[0.15rem] min-w-34 rounded-token border border-linha bg-bg py-[0.35rem]">
          <button
            type="button"
            className={CLASSE_ITEM_MENU}
            onClick={() => {
              setAberto(false);
              onDenunciar();
            }}
          >
            Denunciar
          </button>
          <button
            type="button"
            className={CLASSE_ITEM_MENU}
            onClick={() => {
              setAberto(false);
              onBloquear();
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
