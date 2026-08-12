"use client";

import type { ModoInteracao } from "@albora/core";
import { useState } from "react";
import { Estrela, IconeComentario, IconeMais } from "../../telas/pecas-de-tela";
import { usarComentarios, type ComentarioVisivel } from "@/lib/usar-comentarios";
import { usarReacao, type ResultadoReacao } from "@/lib/usar-reacao";

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
}: Omit<Props, "interacao">) {
  const reacao = usarReacao(uploadId, reacoesInicial, minhaInicial);
  const comentarios = usarComentarios(uploadId, true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [denunciando, setDenunciando] = useState(false);
  const [denunciado, setDenunciado] = useState(false);

  const alternarReacao = async () => {
    const resultado = await reacao.alternar();
    if (resultado) onReacoes?.(resultado);
  };

  const denunciar = async () => {
    setDenunciando(true);
    setMenuAberto(false);
    try {
      const r = await fetch("/api/midia/denuncia", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ uploadId }),
      });
      if (r.ok) setDenunciado(true);
    } finally {
      setDenunciando(false);
    }
  };

  const bloquearAutor = async () => {
    if (!sessaoAutor) return;
    setMenuAberto(false);
    const ok = await comentarios.bloquear(sessaoAutor);
    if (ok) onBloqueado?.();
  };

  return (
    <div style={{ display: "grid", gap: "calc(var(--espaco) * 2)" }}>
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

        <div style={{ marginLeft: "auto", position: "relative" }}>
          <button
            type="button"
            aria-expanded={menuAberto}
            aria-label="Mais opções"
            disabled={denunciando}
            onClick={() => setMenuAberto((a) => !a)}
            style={botaoIcone}
          >
            <IconeMais tamanho={20} />
          </button>
          {menuAberto && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: "0.25rem",
                minWidth: "9rem",
                padding: "0.35rem 0",
                borderRadius: "var(--raio)",
                border: "1px solid var(--linha)",
                background: "var(--bg)",
                boxShadow: "0 4px 16px color-mix(in srgb, var(--ink) 12%, transparent)",
                zIndex: 2,
              }}
            >
              <button
                type="button"
                disabled={denunciado}
                onClick={() => void denunciar()}
                style={itemMenu}
              >
                {denunciado ? "Denúncia enviada" : "Denunciar foto"}
              </button>
              {sessaoAutor && !minha && (
                <button type="button" onClick={() => void bloquearAutor()} style={itemMenu}>
                  Bloquear {autor ?? "autor"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {comentarios.aberto && (
        <section style={{ display: "grid", gap: "0.75rem" }}>
          {comentarios.carregando && (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-3)" }}>Carregando…</p>
          )}

          {comentarios.threads.map((t) => (
            <LinhaComentario
              key={t.id}
              comentario={t}
              comentarios={comentarios}
              indent={0}
            />
          ))}

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
              placeholder={comentarios.respostaA ? "Sua resposta…" : "Escreva algo…"}
              onChange={(e) => comentarios.setTexto(e.target.value)}
              style={{
                flex: 1,
                minHeight: TOQUE,
                padding: "0 0.875rem",
                fontSize: "0.9rem",
                border: "1px solid var(--linha)",
                borderRadius: "var(--raio-pilula)",
                background: "var(--superficie)",
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
        </section>
      )}
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

  return (
    <div style={{ marginLeft: indent ? "1rem" : 0 }}>
      <p style={{ margin: 0, fontSize: indent ? "0.8125rem" : "0.84375rem", lineHeight: 1.45 }}>
        <span style={{ color: "var(--ink)" }}>{comentario.autor}</span> {comentario.texto}
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
