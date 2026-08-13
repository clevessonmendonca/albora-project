"use client";

import { useState } from "react";
import { BotaoSecundario, SheetBaixo } from "../../telas/shell-convidado";
import { usarComentarios, type ComentarioVisivel } from "@/lib/usar-comentarios";

const TOQUE = "44px";

export function SheetComentarios({
  comentarios,
}: {
  comentarios: ReturnType<typeof usarComentarios>;
}) {
  return (
    <SheetBaixo
      titulo="Comentários"
      aberto={comentarios.aberto}
      onFechar={comentarios.fechar}
      idTitulo="sheet-comentarios-titulo"
      rodape={
        <Composer comentarios={comentarios} />
      }
    >
      {comentarios.carregando && (
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-3)" }}>Carregando…</p>
      )}

      {comentarios.threads.length === 0 && !comentarios.carregando && (
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-2)" }}>
          Seja o primeiro a comentar.
        </p>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.875rem" }}>
        {comentarios.threads.map((t) => (
          <li key={t.id}>
            <LinhaComentario comentario={t} comentarios={comentarios} indent={0} />
          </li>
        ))}
      </ul>
    </SheetBaixo>
  );
}

function Composer({ comentarios }: { comentarios: ReturnType<typeof usarComentarios> }) {
  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {comentarios.respostaA && (
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--ink-3)" }}>
          Respondendo…{" "}
          <button
            type="button"
            onClick={comentarios.cancelarResposta}
            style={{
              border: "none",
              background: "transparent",
              color: "var(--acento)",
              cursor: "pointer",
              font: "inherit",
              padding: 0,
            }}
          >
            Cancelar
          </button>
        </p>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          value={comentarios.texto}
          maxLength={comentarios.maxCaracteres}
          placeholder={comentarios.respostaA ? "Sua resposta…" : "Escreva um comentário…"}
          onChange={(e) => comentarios.setTexto(e.target.value)}
          style={{
            flex: 1,
            minHeight: TOQUE,
            padding: "0 0.875rem",
            fontSize: "0.9rem",
            border: "1px solid var(--linha)",
            borderRadius: "var(--raio-pilula)",
            background: "var(--bg)",
            color: "var(--ink)",
          }}
        />
        <button
          type="button"
          disabled={comentarios.publicando || comentarios.texto.trim() === ""}
          onClick={() => void comentarios.publicar()}
          style={{
            minHeight: TOQUE,
            padding: "0 1rem",
            fontSize: "0.85rem",
            border: "none",
            borderRadius: "var(--raio-pilula)",
            background: "var(--acento)",
            color: "var(--sobre-acento)",
            cursor: "pointer",
            opacity: comentarios.texto.trim() === "" ? 0.5 : 1,
          }}
        >
          Enviar
        </button>
      </div>

      {comentarios.erro && (
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--critico)" }}>
          Não deu agora. Tente de novo.
        </p>
      )}

      <BotaoSecundario onClick={comentarios.fechar}>Fechar</BotaoSecundario>
    </div>
  );
}

function LinhaComentario({
  comentario,
  comentarios,
  indent,
}: {
  comentario: ComentarioVisivel;
  comentarios: ReturnType<typeof usarComentarios>;
  indent: number;
}) {
  const [menu, setMenu] = useState(false);
  const hora = formatarHora(comentario.criadaEm);

  return (
    <div style={{ marginLeft: indent ? "1rem" : 0 }}>
      <p style={{ margin: 0, fontSize: indent ? "0.8125rem" : "0.84375rem", lineHeight: 1.45 }}>
        <span style={{ color: "var(--ink)" }}>{comentario.autor}</span> {comentario.texto}
        {hora && (
          <span style={{ marginLeft: "0.35rem", color: "var(--ink-3)", fontSize: "0.75rem" }}>
            · {hora}
          </span>
        )}
        {comentario.pendente && (
          <span style={{ marginLeft: "0.35rem", color: "var(--ink-3)", fontSize: "0.75rem" }}>
            · enviando
          </span>
        )}
      </p>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
        {indent === 0 && !comentario.pendente && (
          <button
            type="button"
            onClick={() => comentarios.iniciarResposta(comentario.id)}
            style={acaoSecundaria}
          >
            Responder
          </button>
        )}
        {comentario.meu && !comentario.pendente && (
          <button
            type="button"
            disabled={comentarios.publicando}
            onClick={() => void comentarios.remover(comentario.id)}
            style={acaoSecundaria}
          >
            Remover
          </button>
        )}
        {!comentario.meu && !comentario.pendente && comentario.sessaoAutor && (
          <div style={{ position: "relative" }}>
            <button type="button" onClick={() => setMenu((a) => !a)} style={acaoSecundaria}>
              ⋯
            </button>
            {menu && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "100%",
                  marginTop: "0.15rem",
                  minWidth: "8.5rem",
                  padding: "0.35rem 0",
                  borderRadius: "var(--raio)",
                  border: "1px solid var(--linha)",
                  background: "var(--bg)",
                  zIndex: 2,
                }}
              >
                <button
                  type="button"
                  style={itemMenu}
                  onClick={() => {
                    setMenu(false);
                    void comentarios.denunciar(comentario.id);
                  }}
                >
                  Denunciar
                </button>
                <button
                  type="button"
                  style={itemMenu}
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
        <div key={r.id} style={{ marginTop: "0.35rem" }}>
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

const itemMenu: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.625rem 0.875rem",
  border: "none",
  background: "transparent",
  color: "var(--ink)",
  font: "inherit",
  fontSize: "0.85rem",
  textAlign: "left",
  cursor: "pointer",
};

const acaoSecundaria: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--ink-3)",
  font: "inherit",
  fontSize: "0.75rem",
  padding: 0,
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};
