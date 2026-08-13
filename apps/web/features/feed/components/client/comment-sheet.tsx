"use client";

import { useState } from "react";
import { SecondaryButton, BottomSheet } from "@albora/ui-web";
import type { ComentarioVisivel, CommentsController } from "@/features/feed/hooks/use-comments";

const CLASSE_ACAO_SECUNDARIA =
  "cursor-pointer border-none bg-transparent p-0 font-inherit text-[0.75rem] uppercase tracking-[0.06em] text-ink-3";

const CLASSE_ITEM_MENU =
  "block w-full cursor-pointer border-none bg-transparent px-3.5 py-2.5 text-left font-inherit text-[0.85rem] text-ink";

export function CommentSheet({
  comentarios,
}: {
  comentarios: CommentsController;
}) {
  return (
    <BottomSheet
      title="Comentários"
      open={comentarios.aberto}
      onClose={comentarios.fechar}
      titleId="sheet-comentarios-titulo"
      footer={
        <Composer comentarios={comentarios} />
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
            <LinhaComentario comentario={t} comentarios={comentarios} indent={0} />
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}

function Composer({ comentarios }: { comentarios: CommentsController }) {
  return (
    <div className="grid gap-2">
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
          className="min-h-11 flex-1 rounded-pilula border border-linha bg-bg px-3.5 text-[0.9rem] text-ink"
        />
        <button
          type="button"
          disabled={comentarios.publicando || comentarios.texto.trim() === ""}
          onClick={() => void comentarios.publicar()}
          className={`min-h-11 cursor-pointer rounded-pilula border-none bg-acento px-4 text-[0.85rem] text-sobre-acento disabled:cursor-default ${
            comentarios.texto.trim() === "" ? "opacity-50" : ""
          }`}
        >
          Enviar
        </button>
      </div>

      {comentarios.erro && (
        <p className="m-0 text-[0.85rem] text-critico">
          Não deu agora. Tente de novo.
        </p>
      )}

      <SecondaryButton onClick={comentarios.fechar}>Fechar</SecondaryButton>
    </div>
  );
}

function LinhaComentario({
  comentario,
  comentarios,
  indent,
}: {
  comentario: ComentarioVisivel;
  comentarios: CommentsController;
  indent: number;
}) {
  const [menu, setMenu] = useState(false);
  const hora = formatarHora(comentario.criadaEm);

  return (
    <div className={indent ? "ml-4" : undefined}>
      <p className={`m-0 leading-[1.45] ${indent ? "text-[0.8125rem]" : "text-[0.84375rem]"}`}>
        <span className="text-ink">{comentario.autor}</span> {comentario.texto}
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
          <div className="relative">
            <button type="button" onClick={() => setMenu((a) => !a)} className={CLASSE_ACAO_SECUNDARIA}>
              ⋯
            </button>
            {menu && (
              <div className="absolute left-0 top-full z-2 mt-[0.15rem] min-w-34 rounded-token border border-linha bg-bg py-[0.35rem]">
                <button
                  type="button"
                  className={CLASSE_ITEM_MENU}
                  onClick={() => {
                    setMenu(false);
                    void comentarios.denunciar(comentario.id);
                  }}
                >
                  Denunciar
                </button>
                <button
                  type="button"
                  className={CLASSE_ITEM_MENU}
                  onClick={() => {
                    setMenu(false);
                    void comentarios.bloquear(comentario.sessaoAutor);
                  }}
                >
                  Bloquear {comentario.autor}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {comentario.respostas.map((r) => (
        <div key={r.id} className="mt-[0.35rem]">
          <LinhaComentario comentario={r} comentarios={comentarios} indent={1} />
        </div>
      ))}
    </div>
  );
}

function formatarHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
