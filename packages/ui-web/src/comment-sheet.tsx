"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "./button";
import { BottomSheet, ErrorMessage } from "./guest-shell";

export type Comentario = {
  id: string;
  autor: string;
  texto: string;
  quando: string;
};

const MENSAGEM_ERRO_VAZIO = "Escreve algo primeiro.";
const ERRO_ID = "comment-sheet-erro";
const TITULO_ID = "comment-sheet-titulo";

export function CommentSheet({
  aberto,
  comentarios,
  onEnviar,
  onFechar,
}: {
  aberto: boolean;
  comentarios: Comentario[];
  onEnviar: (texto: string) => void;
  onFechar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function handleChange(ev: ChangeEvent<HTMLInputElement>) {
    setTexto(ev.target.value);
    if (erro) setErro(null);
  }

  function handleEnviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();

    if (texto.trim() === "") {
      setErro(MENSAGEM_ERRO_VAZIO);
      return;
    }

    onEnviar(texto);
    setTexto("");
    setErro(null);
  }

  return (
    <BottomSheet
      title="Comentários"
      open={aberto}
      onClose={onFechar}
      titleId={TITULO_ID}
      footer={
        <form onSubmit={handleEnviar} noValidate className="grid gap-2">
          <div className="flex items-end gap-2.5">
            <input
              type="text"
              value={texto}
              onChange={handleChange}
              placeholder="Escreva um comentário…"
              aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? ERRO_ID : undefined}
              className="min-h-[3.375rem] flex-1 border-0 border-b border-b-linha bg-transparent px-0.5 text-[0.9375rem] text-ink outline-none placeholder:italic placeholder:text-ink-3 focus:border-b-acento"
            />
            <Button type="submit" variant="primary" size="lg">
              Enviar
            </Button>
          </div>
          {erro && (
            <div id={ERRO_ID}>
              <ErrorMessage>{erro}</ErrorMessage>
            </div>
          )}
        </form>
      }
    >
      {comentarios.length === 0 ? (
        <p className="m-0 text-[0.9rem] text-ink-2">Seja o primeiro a comentar.</p>
      ) : (
        <ul className="m-0 grid list-none gap-3.5 p-0">
          {comentarios.map((comentario) => (
            <li key={comentario.id}>
              <p className="m-0 flex items-baseline gap-1.5">
                <span className="font-titulo text-[0.8125rem] tracking-titulo text-ink">
                  {comentario.autor}
                </span>
                <span className="text-[0.75rem] text-ink-3">{comentario.quando}</span>
              </p>
              <p className="m-0 mt-0.5 text-[0.875rem] leading-snug text-ink-2">
                {comentario.texto}
              </p>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
