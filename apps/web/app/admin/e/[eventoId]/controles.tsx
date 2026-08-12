"use client";

import { interacaoAberta, padroesDoEvento } from "@albora/core";
import { useEffect, useState } from "react";
import { raio } from "../../../landing/pecas";
import { SecaoAdmin, estilosAdmin } from "../../casca";

type Moderacao = {
  panico: boolean;
  modoEndurecido: boolean;
  haMenores: boolean;
};

type Props = {
  eventoId: string;
  slug: string;
  inicial: Moderacao;
  interacaoAbreEmInicial: string | null;
};

export function ControlesDoEvento({
  eventoId,
  slug,
  inicial,
  interacaoAbreEmInicial,
}: Props) {
  const [moderacao, setModeracao] = useState(inicial);
  const [interacaoAbreEm, setInteracaoAbreEm] = useState(interacaoAbreEmInicial);
  const [salvando, setSalvando] = useState<
    "panico" | "haMenores" | "modoEndurecido" | "interacao" | null
  >(null);
  const [erro, setErro] = useState(false);

  const padroes = padroesDoEvento({ haMenores: moderacao.haMenores });
  const gateAberto = interacaoAberta(
    { interacaoAbreEm: interacaoAbreEm ? new Date(interacaoAbreEm) : null },
    new Date(),
  );

  const patch = async (
    corpo: Record<string, boolean>,
    campo: NonNullable<typeof salvando>,
  ) => {
    setSalvando(campo);
    setErro(false);
    const moderacaoAnterior = moderacao;
    const gateAnterior = interacaoAbreEm;

    if ("panico" in corpo) setModeracao((m) => ({ ...m, panico: corpo.panico! }));
    if ("haMenores" in corpo) setModeracao((m) => ({ ...m, haMenores: corpo.haMenores! }));
    if ("modoEndurecido" in corpo) {
      setModeracao((m) => ({ ...m, modoEndurecido: corpo.modoEndurecido! }));
    }
    if (corpo.abrirInteracao) setInteracaoAbreEm(new Date().toISOString());

    try {
      const r = await fetch(`/api/admin/eventos/${eventoId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (!r.ok) throw new Error("falhou");
      const resposta = (await r.json()) as {
        moderacao: Moderacao;
        interacaoAbreEm?: string | null;
      };
      setModeracao(resposta.moderacao);
      if (resposta.interacaoAbreEm !== undefined) {
        setInteracaoAbreEm(resposta.interacaoAbreEm);
      }
    } catch {
      setModeracao(moderacaoAnterior);
      setInteracaoAbreEm(gateAnterior);
      setErro(true);
    } finally {
      setSalvando(null);
    }
  };

  const origem = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <SecaoAdmin>
        <p style={{ margin: "0 0 1rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
          Controles durante a festa. O pânico pausa o telão em segundos; o interruptor
          de menores sobe o limiar de denúncia sem marcar ninguém.
        </p>

        <button
          type="button"
          disabled={salvando === "panico"}
          onClick={() => void patch({ panico: !moderacao.panico }, "panico")}
          style={{
            ...estilosAdmin.botaoPerigo,
            opacity: salvando === "panico" ? 0.6 : 1,
            backgroundColor: moderacao.panico ? "var(--ink-2)" : "var(--critico)",
          }}
        >
          {salvando === "panico"
            ? "Salvando…"
            : moderacao.panico
              ? "Retomar telão"
              : "Pausar telão"}
        </button>

        {moderacao.panico && (
          <p style={{ margin: "0.75rem 0 0", color: "var(--critico)", fontSize: "0.9rem" }}>
            O telão está pausado. Nenhuma foto nova aparece na parede.
          </p>
        )}
      </SecaoAdmin>

      <SecaoAdmin>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                fontFamily: "var(--fonte-titulo)",
                fontSize: "1.0625rem",
              }}
            >
              Há menores nesta festa
            </span>
            <span style={{ display: "block", marginTop: "0.25rem", fontSize: "0.875rem", color: "var(--ink-3)" }}>
              Uma denúncia já segura do telão. Compartilhar para fora nasce desligado.
            </span>
          </div>
          <Interruptor
            ligado={moderacao.haMenores}
            desabilitado={salvando === "haMenores"}
            rotulo="Há menores nesta festa"
            onChange={(v) => void patch({ haMenores: v }, "haMenores")}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))",
            gap: "0.5rem",
            marginTop: "1rem",
          }}
        >
          <Efeito rotulo="Para segurar" valor={`${padroes.denunciasParaSegurar} denúncia(s)`} />
          <Efeito
            rotulo="Compartilhar fora"
            valor={padroes.compartilhamentoExterno ? "ligado" : "desligado"}
          />
          <Efeito
            rotulo="Gate"
            valor={gateAberto ? "aberto" : padroes.gateComecaFechado ? "fechado" : "aberto"}
          />
        </div>
      </SecaoAdmin>

      <SecaoAdmin>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                fontFamily: "var(--fonte-titulo)",
                fontSize: "1.0625rem",
              }}
            >
              Modo endurecido
            </span>
            <span style={{ display: "block", marginTop: "0.25rem", fontSize: "0.875rem", color: "var(--ink-3)" }}>
              Novas fotos e comentários ficam na fila até você liberar.
            </span>
          </div>
          <Interruptor
            ligado={moderacao.modoEndurecido}
            desabilitado={salvando === "modoEndurecido"}
            rotulo="Modo endurecido"
            onChange={(v) => void patch({ modoEndurecido: v }, "modoEndurecido")}
          />
        </div>
      </SecaoAdmin>

      <SecaoAdmin>
        <h2 style={{ margin: "0 0 0.75rem", fontFamily: "var(--fonte-titulo)", fontSize: "1.125rem" }}>
          Interação social
        </h2>
        <p style={{ margin: "0 0 1rem", color: "var(--ink-2)", lineHeight: 1.6, fontSize: "0.9375rem" }}>
          Reações e comentários no feed só aparecem depois que o casal liberar.
        </p>
        {gateAberto ? (
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink)" }}>
            Aberta desde{" "}
            {interacaoAbreEm
              ? new Date(interacaoAbreEm).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </p>
        ) : (
          <button
            type="button"
            disabled={salvando === "interacao"}
            onClick={() => void patch({ abrirInteracao: true }, "interacao")}
            style={{
              ...estilosAdmin.botaoPrimario,
              opacity: salvando === "interacao" ? 0.6 : 1,
            }}
          >
            {salvando === "interacao" ? "Abrindo…" : "Abrir interação agora"}
          </button>
        )}
      </SecaoAdmin>

      <SecaoAdmin>
        <h2 style={{ margin: "0 0 1rem", fontFamily: "var(--fonte-titulo)", fontSize: "1.125rem" }}>
          Fila de revisão
        </h2>
        <FilaRevisao eventoId={eventoId} />
      </SecaoAdmin>

      <SecaoAdmin>
        <h2 style={{ margin: "0 0 1rem", fontFamily: "var(--fonte-titulo)", fontSize: "1.125rem" }}>
          Comentários recentes
        </h2>
        <ModeracaoComentarios eventoId={eventoId} />
      </SecaoAdmin>

      <SecaoAdmin>
        <h2 style={{ margin: "0 0 1rem", fontFamily: "var(--fonte-titulo)", fontSize: "1.125rem" }}>
          Música do casal
        </h2>
        <MusicaDoEvento eventoId={eventoId} />
      </SecaoAdmin>

      <SecaoAdmin>
        <h2 style={{ margin: "0 0 1rem", fontFamily: "var(--fonte-titulo)", fontSize: "1.125rem" }}>
          Peças para imprimir
        </h2>
        <PecasDoEvento eventoId={eventoId} slug={slug} />
      </SecaoAdmin>

      <SecaoAdmin>
        <h2 style={{ margin: "0 0 1rem", fontFamily: "var(--fonte-titulo)", fontSize: "1.125rem" }}>
          Links do evento
        </h2>
        <LinkEvento titulo="Convidado (QR)" url={`${origem}/e/${slug}`} />
        <LinkEvento titulo="Telão" url={`${origem}/telao`} />
      </SecaoAdmin>

      {erro && (
        <p style={{ margin: 0, color: "var(--critico)", fontSize: "0.9rem" }}>
          Não salvou agora. Tente de novo.
        </p>
      )}
    </div>
  );
}

function FilaRevisao({ eventoId }: { eventoId: string }) {
  const [midias, setMidias] = useState<
    { id: string; autor: string; denuncias: number; motivo: string; criadaEm: string }[]
  >([]);
  const [comentarios, setComentarios] = useState<
    { id: string; autor: string; texto: string; denuncias: number }[]
  >([]);
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setErro(null);
    try {
      const r = await fetch(`/api/admin/eventos/${eventoId}/revisao`);
      if (!r.ok) throw new Error("falhou");
      const corpo = (await r.json()) as {
        midias: { id: string; autor: string; denuncias: number; motivo: string; criadaEm: string }[];
        comentarios: { id: string; autor: string; texto: string; denuncias: number }[];
      };
      setMidias(corpo.midias);
      setComentarios(corpo.comentarios);
    } catch {
      setErro("Não carregou a fila.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, [eventoId]);

  const liberar = async (tipo: "midia" | "comentario", id: string) => {
    setAcao(`${tipo}:${id}`);
    setErro(null);
    try {
      const r = await fetch(`/api/admin/eventos/${eventoId}/revisao`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo, id, acao: "liberar" }),
      });
      if (!r.ok) throw new Error("falhou");
      await carregar();
    } catch {
      setErro("Não liberou agora. Tente de novo.");
    } finally {
      setAcao(null);
    }
  };

  if (carregando) {
    return <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "0.9rem" }}>Carregando…</p>;
  }

  if (midias.length === 0 && comentarios.length === 0) {
    return (
      <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6, fontSize: "0.9375rem" }}>
        Nada retido agora. Denúncias e classificador aparecem aqui.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {midias.map((m) => (
        <div
          key={m.id}
          style={{
            padding: "0.75rem",
            backgroundColor: "var(--bg)",
            ...raio("var(--raio)"),
            display: "grid",
            gap: "0.35rem",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--ink)" }}>
            Foto · {m.autor} · {m.denuncias} denúncia(s) · {m.motivo}
          </span>
          <button
            type="button"
            disabled={acao === `midia:${m.id}`}
            onClick={() => void liberar("midia", m.id)}
            style={{
              ...estilosAdmin.botaoPrimario,
              justifySelf: "start",
              fontSize: "0.8125rem",
              padding: "0.45rem 0.75rem",
              opacity: acao === `midia:${m.id}` ? 0.6 : 1,
            }}
          >
            {acao === `midia:${m.id}` ? "Liberando…" : "Liberar foto"}
          </button>
        </div>
      ))}

      {comentarios.map((c) => (
        <div
          key={c.id}
          style={{
            padding: "0.75rem",
            backgroundColor: "var(--bg)",
            ...raio("var(--raio)"),
            display: "grid",
            gap: "0.35rem",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--ink)" }}>
            {c.autor} · {c.denuncias} denúncia(s)
          </span>
          <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
            {c.texto}
          </p>
          <button
            type="button"
            disabled={acao === `comentario:${c.id}`}
            onClick={() => void liberar("comentario", c.id)}
            style={{
              ...estilosAdmin.botaoPrimario,
              justifySelf: "start",
              fontSize: "0.8125rem",
              padding: "0.45rem 0.75rem",
              opacity: acao === `comentario:${c.id}` ? 0.6 : 1,
            }}
          >
            {acao === `comentario:${c.id}` ? "Liberando…" : "Liberar comentário"}
          </button>
        </div>
      ))}

      {erro && (
        <p style={{ margin: 0, color: "var(--critico)", fontSize: "0.875rem" }}>{erro}</p>
      )}
    </div>
  );
}

function ModeracaoComentarios({ eventoId }: { eventoId: string }) {
  const [lista, setLista] = useState<
    {
      id: string;
      autor: string;
      texto: string;
      denuncias: number;
      criadaEm: string;
      classificador: string | null;
    }[]
  >([]);
  const [carregando, setCarregando] = useState(true);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setErro(null);
    try {
      const r = await fetch(`/api/admin/eventos/${eventoId}/comentarios`);
      if (!r.ok) throw new Error("falhou");
      const corpo = (await r.json()) as {
        comentarios: {
          id: string;
          autor: string;
          texto: string;
          denuncias: number;
          criadaEm: string;
          classificador: string | null;
        }[];
      };
      setLista(corpo.comentarios);
    } catch {
      setErro("Não carregou os comentários.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, [eventoId]);

  const remover = async (comentarioId: string) => {
    setRemovendo(comentarioId);
    setErro(null);
    try {
      const r = await fetch(`/api/admin/eventos/${eventoId}/comentarios`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ comentarioId }),
      });
      if (!r.ok) throw new Error("falhou");
      setLista((antes) => antes.filter((c) => c.id !== comentarioId));
    } catch {
      setErro("Não removeu agora. Tente de novo.");
    } finally {
      setRemovendo(null);
    }
  };

  if (carregando) {
    return <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "0.9rem" }}>Carregando…</p>;
  }

  if (lista.length === 0) {
    return (
      <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6, fontSize: "0.9375rem" }}>
        Nenhum comentário publicado ainda.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6, fontSize: "0.9375rem" }}>
        Comentários recentes, com denúncias primeiro. Remover tira da festa na hora.
      </p>

      {lista.map((c) => (
        <div
          key={c.id}
          style={{
            padding: "0.75rem",
            backgroundColor: "var(--bg)",
            ...raio("var(--raio)"),
            display: "grid",
            gap: "0.35rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--ink)" }}>{c.autor}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--ink-3)" }}>
              {c.denuncias > 0 ? `${c.denuncias} denúncia(s)` : "sem denúncias"}
              {c.classificador === "suspeito" ? " · classificador" : ""}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
            {c.texto}
          </p>
          <button
            type="button"
            disabled={removendo === c.id}
            onClick={() => void remover(c.id)}
            style={{
              ...estilosAdmin.botaoPerigo,
              justifySelf: "start",
              opacity: removendo === c.id ? 0.6 : 1,
              fontSize: "0.8125rem",
              padding: "0.45rem 0.75rem",
            }}
          >
            {removendo === c.id ? "Removendo…" : "Remover"}
          </button>
        </div>
      ))}

      {erro && (
        <p style={{ margin: 0, color: "var(--critico)", fontSize: "0.875rem" }}>{erro}</p>
      )}
    </div>
  );
}

function MusicaDoEvento({ eventoId }: { eventoId: string }) {
  const [url, setUrl] = useState("");
  const [atual, setAtual] = useState<{ provedor: string; rotulo: string; url: string } | null>(
    null,
  );
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(`/api/admin/eventos/${eventoId}/musica`);
        if (!r.ok) throw new Error("falhou");
        const corpo = (await r.json()) as {
          musica: { provedor: string; rotulo: string; url: string } | null;
        };
        setAtual(corpo.musica);
        if (corpo.musica) setUrl(corpo.musica.url);
      } catch {
        setErro("Não carregou a música salva.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [eventoId]);

  const salvar = async () => {
    const limpo = url.trim();
    if (!limpo) return;

    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/admin/eventos/${eventoId}/musica`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: limpo }),
      });
      const corpo = (await r.json()) as {
        musica?: { provedor: string; rotulo: string; url: string } | null;
        message?: string;
      };
      if (!r.ok) {
        setErro(corpo.message ?? "Link não aceito.");
        return;
      }
      setAtual(corpo.musica ?? null);
    } catch {
      setErro("Não salvou agora. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6, fontSize: "0.9375rem" }}>
        Cole o link da faixa no Spotify ou YouTube Music. Convidados veem na confirmação da foto
        e na aba Música.
      </p>

      {carregando ? (
        <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "0.9rem" }}>Carregando…</p>
      ) : (
        atual && (
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink)" }}>
            Agora: {atual.rotulo}
          </p>
        )
      )}

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--ink-3)",
            letterSpacing: "var(--tracking-rotulo)",
            textTransform: "uppercase",
          }}
        >
          Link da faixa
        </span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://open.spotify.com/track/…"
          style={{
            padding: "0.65rem 0.85rem",
            border: "1px solid var(--linha)",
            backgroundColor: "var(--bg)",
            color: "var(--ink)",
            fontFamily: "var(--fonte-corpo)",
            fontSize: "0.95rem",
            ...raio("var(--raio)"),
            width: "100%",
          }}
        />
      </label>

      <button
        type="button"
        disabled={salvando || !url.trim()}
        onClick={() => void salvar()}
        style={{
          ...estilosAdmin.botaoPrimario,
          opacity: salvando || !url.trim() ? 0.6 : 1,
        }}
      >
        {salvando ? "Salvando…" : "Salvar música"}
      </button>

      {erro && (
        <p style={{ margin: 0, color: "var(--critico)", fontSize: "0.875rem" }}>{erro}</p>
      )}
    </div>
  );
}

function Efeito({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div
      style={{
        padding: "0.625rem 0.75rem",
        backgroundColor: "var(--bg)",
        ...raio("var(--raio)"),
        fontSize: "0.8125rem",
      }}
    >
      <span style={{ display: "block", color: "var(--ink-3)" }}>{rotulo}</span>
      <span style={{ display: "block", marginTop: "0.125rem", color: "var(--ink)" }}>{valor}</span>
    </div>
  );
}

function PecasDoEvento({ eventoId, slug }: { eventoId: string; slug: string }) {
  const [baixando, setBaixando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const formatos = [
    { id: "placa-a4", rotulo: "Placa A4" },
    { id: "card-de-mesa", rotulo: "Card de mesa" },
    { id: "card-de-missao", rotulo: "Card de missão" },
  ] as const;

  const baixar = async (formato: (typeof formatos)[number]["id"]) => {
    setBaixando(formato);
    setErro(null);
    try {
      const r = await fetch(`/api/admin/eventos/${eventoId}/pecas?formato=${formato}`);
      if (!r.ok) {
        const corpo = (await r.json().catch(() => null)) as { problemas?: string[] } | null;
        const msg = corpo?.problemas?.join(" ") ?? "Não gerou a peça.";
        throw new Error(msg);
      }
      const svg = await r.text();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `albora-${slug}-${formato}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não baixou a peça.");
    } finally {
      setBaixando(null);
    }
  };

  return (
    <div>
      <p style={{ margin: "0 0 1rem", color: "var(--ink-2)", lineHeight: 1.6, fontSize: "0.9375rem" }}>
        SVG pronto para a gráfica converter em PDF. A tela mostra RGB e a impressão sai
        CMYK — peça uma prova antes da tiragem inteira.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {formatos.map((f) => (
          <button
            key={f.id}
            type="button"
            disabled={baixando !== null}
            onClick={() => void baixar(f.id)}
            style={{
              padding: "0.625rem 1rem",
              fontFamily: "var(--fonte-titulo)",
              fontSize: "0.9375rem",
              color: "var(--ink)",
              backgroundColor: "var(--superficie)",
              border: "1px solid var(--linha)",
              cursor: baixando !== null ? "wait" : "pointer",
              ...raio("var(--raio-pilula)"),
              opacity: baixando === f.id ? 0.6 : 1,
            }}
          >
            {baixando === f.id ? "Gerando…" : f.rotulo}
          </button>
        ))}
      </div>
      {erro && (
        <p style={{ margin: "0.75rem 0 0", color: "var(--critico)", fontSize: "0.875rem" }}>{erro}</p>
      )}
    </div>
  );
}

function LinkEvento({ titulo, url }: { titulo: string; url: string }) {
  return (
    <div style={{ marginBottom: "0.875rem" }}>
      <span
        style={{
          display: "block",
          fontSize: "0.75rem",
          color: "var(--ink-3)",
          letterSpacing: "var(--tracking-rotulo)",
          textTransform: "uppercase",
        }}
      >
        {titulo}
      </span>
      <a href={url} style={{ color: "var(--acento)", wordBreak: "break-all", fontSize: "0.95rem" }}>
        {url}
      </a>
    </div>
  );
}

function Interruptor({
  ligado,
  desabilitado,
  rotulo,
  onChange,
}: {
  ligado: boolean;
  desabilitado?: boolean;
  rotulo: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={() => onChange(!ligado)}
      style={{
        flex: "none",
        width: "3.25rem",
        height: "1.875rem",
        ...raio("var(--raio-pilula)"),
        backgroundColor: ligado ? "var(--acento)" : "var(--linha)",
        display: "flex",
        alignItems: "center",
        justifyContent: ligado ? "flex-end" : "flex-start",
        padding: "0.1875rem",
        border: "none",
        cursor: desabilitado ? "wait" : "pointer",
        opacity: desabilitado ? 0.6 : 1,
      }}
    >
      <span
        style={{
          width: "1.5rem",
          height: "1.5rem",
          borderRadius: "50%",
          backgroundColor: "var(--superficie-alta)",
        }}
      />
    </button>
  );
}
