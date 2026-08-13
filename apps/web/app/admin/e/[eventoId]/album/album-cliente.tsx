"use client";

import { useCallback, useEffect, useState } from "react";
import { raio } from "../../../../landing/pecas";
import { AdminSection } from "../../../casca";

type Item = {
  id: string;
  missaoId: string | null;
  lugarId: string | null;
  reacoes: number;
  criadaEm: string;
  thumb: string;
};

type Props = {
  eventoId: string;
};

export function AlbumDoAnfitriao({ eventoId }: Props) {
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [ocultando, setOcultando] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      const r = await fetch(`/api/admin/eventos/${eventoId}/album`);
      if (!r.ok) throw new Error("falhou");
      const corpo = (await r.json()) as { itens: Item[] };
      setItens(corpo.itens);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [eventoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const ocultar = async (midiaId: string) => {
    setOcultando(midiaId);
    try {
      const r = await fetch(`/api/admin/eventos/${eventoId}/album`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ midiaId }),
      });
      if (!r.ok) throw new Error("falhou");
      setItens((antes) => antes.filter((i) => i.id !== midiaId));
      setSelecionado(null);
    } catch {
      setErro(true);
    } finally {
      setOcultando(null);
    }
  };

  if (carregando) {
    return (
      <AdminSection>
        <p style={{ margin: 0, color: "var(--ink-2)" }}>Carregando álbum…</p>
      </AdminSection>
    );
  }

  if (erro && itens.length === 0) {
    return (
      <AdminSection>
        <p style={{ margin: 0, color: "var(--critico)" }}>
          Não foi possível carregar o álbum. Tente de novo.
        </p>
      </AdminSection>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <AdminSection>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6 }}>
            Curadoria leve: ocultar tira a foto do feed, do álbum e do telão.
          </p>
          <span
            style={{
              flexShrink: 0,
              padding: "0.35rem 0.75rem",
              fontSize: "0.8125rem",
              fontFamily: "var(--fonte-titulo)",
              backgroundColor: "var(--superficie-alta)",
              ...raio("var(--raio-pilula)"),
            }}
          >
            {itens.length} {itens.length === 1 ? "foto" : "fotos"}
          </span>
        </div>

        {itens.length === 0 ? (
          <p style={{ margin: 0, color: "var(--ink-3)" }}>
            Ainda não há fotos publicadas. Elas aparecem aqui assim que entram.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(7rem, 1fr))",
              gap: "0.375rem",
            }}
          >
            {itens.map((item) => {
              const ativo = selecionado === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelecionado(ativo ? null : item.id)}
                  style={{
                    position: "relative",
                    aspectRatio: "3 / 4",
                    padding: 0,
                    border: ativo ? "2px solid var(--acento)" : "1px solid var(--linha)",
                    cursor: "pointer",
                    overflow: "hidden",
                    backgroundColor: "var(--superficie-alta)",
                    ...raio("var(--raio)"),
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada, curta validade */}
                  <img
                    src={item.thumb}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {item.reacoes > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "0.25rem",
                        right: "0.25rem",
                        padding: "0.125rem 0.375rem",
                        fontSize: "0.6875rem",
                        backgroundColor: "color-mix(in srgb, var(--bg) 85%, transparent)",
                        ...raio("var(--raio-pilula)"),
                      }}
                    >
                      {item.reacoes}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </AdminSection>

      {selecionado && (
        <AdminSection>
          <p style={{ margin: "0 0 1rem", color: "var(--ink-2)", fontSize: "0.9375rem" }}>
            Ocultar esta foto? Ela some do evento para todos os convidados.
          </p>
          <button
            type="button"
            disabled={ocultando !== null}
            onClick={() => void ocultar(selecionado)}
            style={{
              padding: "0.75rem 1.25rem",
              fontFamily: "var(--fonte-titulo)",
              color: "var(--sobre-critico, var(--sobre-acento))",
              backgroundColor: "var(--critico)",
              border: "none",
              cursor: ocultando ? "wait" : "pointer",
              opacity: ocultando ? 0.6 : 1,
              ...raio("var(--raio-pilula)"),
            }}
          >
            {ocultando ? "Ocultando…" : "Ocultar foto"}
          </button>
        </AdminSection>
      )}
    </div>
  );
}
