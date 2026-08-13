"use client";

import { useEffect, useState } from "react";
import { BarraDeAbas } from "../barra-de-abas";
import {
  BotaoPrimario,
  CabecalhoConvidado,
  ChaoConvidado,
  MioloConvidado,
  RecadoErro,
  TextoSecundario,
} from "../../../telas/shell-convidado";
import { Pilula } from "../../../telas/pecas-de-tela";

type Musica = {
  provedor: string;
  rotulo: string;
  url: string;
} | null;

type Sugestao = {
  provedor: string;
  tipo: string;
  url: string;
  votos: number;
};

export function PaginaMusica({ slug }: { slug: string }) {
  const [musica, setMusica] = useState<Musica>(null);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [url, setUrl] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/musica", { credentials: "same-origin" });
        if (!r.ok) throw new Error("falhou");
        const corpo = (await r.json()) as { musica: Musica; sugestoes: Sugestao[] };
        setMusica(corpo.musica);
        setSugestoes(corpo.sugestoes ?? []);
      } catch {
        setErro(true);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const sugerir = async () => {
    if (!url.trim()) return;
    setEnviando(true);
    setErro(false);
    try {
      const r = await fetch("/api/musica", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!r.ok) throw new Error("falhou");
      const corpo = (await r.json()) as { sugestoes: Sugestao[] };
      setSugestoes(corpo.sugestoes ?? []);
      setUrl("");
    } catch {
      setErro(true);
    } finally {
      setEnviando(false);
    }
  };

  const votar = async (link: string) => {
    setEnviando(true);
    setErro(false);
    try {
      const r = await fetch("/api/musica", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ url: link }),
      });
      if (!r.ok) throw new Error("falhou");
      const corpo = (await r.json()) as { sugestoes: Sugestao[] };
      setSugestoes(corpo.sugestoes ?? []);
    } catch {
      setErro(true);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <ChaoConvidado>
        <MioloConvidado>
          <CabecalhoConvidado
            titulo="Música da festa"
            acao={carregando ? <Pilula>Carregando…</Pilula> : undefined}
          />

          {carregando && <TextoSecundario>Carregando…</TextoSecundario>}

          {!carregando && musica && (
            <section style={{ marginBottom: "2rem" }}>
              <p
                style={{
                  margin: "0 0 0.35rem",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "var(--tracking-rotulo)",
                  color: "var(--ink-3)",
                }}
              >
                Escolhida pelos anfitriões
              </p>
              <p style={{ margin: "0 0 0.5rem", fontSize: "1.0625rem" }}>{musica.rotulo}</p>
              <a href={musica.url} style={{ color: "var(--acento)", fontSize: "0.9rem" }}>
                Abrir no {musica.provedor}
              </a>
            </section>
          )}

          {!carregando && (
            <section>
              <p
                style={{
                  margin: "0 0 0.75rem",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "var(--tracking-rotulo)",
                  color: "var(--ink-3)",
                }}
              >
                Sugestões dos convidados
              </p>
              <ul style={{ margin: "0 0 1.25rem", padding: 0, listStyle: "none" }}>
                {sugestoes.map((s) => (
                  <li
                    key={s.url}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      padding: "0.75rem 0",
                      borderBottom: "1px solid var(--linha)",
                      fontSize: "0.9rem",
                    }}
                  >
                    <a
                      href={s.url}
                      style={{ color: "var(--ink)", flex: 1, wordBreak: "break-all" }}
                    >
                      {s.url}
                    </a>
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={() => void votar(s.url)}
                      style={{
                        flexShrink: 0,
                        minHeight: "36px",
                        padding: "0 0.75rem",
                        border: "1px solid var(--linha)",
                        borderRadius: "var(--raio-pilula)",
                        background: "transparent",
                        color: "var(--ink-2)",
                        font: "inherit",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      +1 · {s.votos}
                    </button>
                  </li>
                ))}
                {sugestoes.length === 0 && (
                  <li style={{ color: "var(--ink-3)", fontSize: "0.9rem" }}>
                    Ninguém sugeriu ainda.
                  </li>
                )}
              </ul>

              <div style={{ display: "grid", gap: "0.75rem" }}>
                <input
                  type="url"
                  value={url}
                  placeholder="Cole um link do Spotify ou YouTube"
                  onChange={(e) => setUrl(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: "48px",
                    padding: "0 0.875rem",
                    border: "1px solid var(--linha)",
                    borderRadius: "var(--raio-pilula)",
                    background: "var(--superficie)",
                    color: "var(--ink)",
                    font: "inherit",
                  }}
                />
                <BotaoPrimario
                  desabilitado={enviando || url.trim() === ""}
                  onClick={() => void sugerir()}
                >
                  {enviando ? "…" : "Sugerir"}
                </BotaoPrimario>
              </div>
            </section>
          )}

          {erro && <RecadoErro>Não deu agora. Tente de novo.</RecadoErro>}
        </MioloConvidado>
      </ChaoConvidado>
      <BarraDeAbas slug={slug} />
    </>
  );
}
