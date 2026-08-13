"use client";

import {
  MODELOS_DE_TELAO,
  problemasDaEscolha,
  type ModeloDeTelao,
} from "@albora/core";
import { PACKS, texto, type Pack } from "@albora/packs";
import { MARCA_ALBORA, MODELOS_DE_IDENTIDADE, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CamadaTokens } from "@albora/tokens";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { raio } from "../../landing/pecas";

const OPCOES = Object.values(PACKS).map((p) => ({ id: p.id, nome: texto(p, "evento.nome") }));

const PASSOS = ["Quando", "Identidade", "Missões", "Parede", "Peças"] as const;

const MODELOS_PADRAO: readonly ModeloDeTelao[] = ["polaroide", "mural", "colagem", "dump"];

type Criado = { slug: string; eventoId: string };

export function NovoEvento() {
  const [passo, setPasso] = useState(0);
  const [packId, setPackId] = useState(OPCOES[0]!.id);
  const [comeca, setComeca] = useState("");
  const [termina, setTermina] = useState("");
  const [expectedGuests, setExpectedGuests] = useState("150");
  const [presetId, setPresetId] = useState(MODELOS_DE_IDENTIDADE[0]!.id);
  const [missoesMarcadas, setMissoesMarcadas] = useState<Set<string>>(() => new Set());
  const [modelosParede, setModelosParede] = useState<Set<ModeloDeTelao>>(
    () => new Set(MODELOS_PADRAO),
  );
  const [estado, setEstado] = useState<"editando" | "criando" | "erro">("editando");
  const [criado, setCriado] = useState<Criado | null>(null);

  const pack = PACKS[packId]!;

  const datasValidas = comeca !== "" && termina !== "" && termina > comeca;
  const convidadosValidos = Number(expectedGuests) > 0 && Number.isFinite(Number(expectedGuests));

  const missoesIniciais = useMemo(() => {
    const chaves = pack.missoes.map((m) => m.chaveTitulo);
    return chaves;
  }, [pack]);

  const missoesAtivas =
    missoesMarcadas.size > 0
      ? [...missoesMarcadas]
      : missoesIniciais;

  const problemasParede = problemasDaEscolha([...modelosParede]);

  const preset = MODELOS_DE_IDENTIDADE.find((m) => m.id === presetId) ?? MODELOS_DE_IDENTIDADE[0]!;

  const identityTokens = useMemo(() => {
    const base: Record<string, unknown> = {
      presetId: preset.id,
      telaoModelos: [...modelosParede],
      ...preset.camada,
    };
    return base;
  }, [preset, modelosParede]);

  const previewVars = useMemo(() => {
    return paraVariaveis(
      resolverTokens({
        marca: MARCA_ALBORA,
        ...(pack.tokens ? { pack: pack.tokens } : {}),
        evento: identityTokens as CamadaTokens,
      }),
    ) as CSSProperties;
  }, [pack, identityTokens]);

  const podeAvancar =
    passo === 0
      ? datasValidas && convidadosValidos
      : passo === 3
        ? problemasParede.length === 0
        : true;

  const criar = async () => {
    if (!datasValidas || !convidadosValidos || problemasParede.length > 0) return;
    setEstado("criando");
    try {
      const r = await fetch("/api/admin/eventos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          packId,
          comecaEm: comeca,
          terminaEm: termina,
          expectedGuests: Number(expectedGuests),
          identityTokens,
          missoes: missoesAtivas,
          telaoModelos: [...modelosParede],
        }),
      });
      if (!r.ok) return setEstado("erro");
      setCriado((await r.json()) as Criado);
    } catch {
      setEstado("erro");
    }
  };

  if (criado) return <Resultado criado={criado} />;

  return (
    <Shell titulo={PASSOS[passo] ?? "Criar evento"} passo={passo} total={PASSOS.length}>
      {passo === 0 && (
        <>
          <label style={rotulo}>
            Tipo de evento
            <select value={packId} onChange={(e) => setPackId(e.target.value)} style={campo}>
              {OPCOES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
          <label style={rotulo}>
            Convidados esperados
            <input
              type="number"
              min={1}
              value={expectedGuests}
              onChange={(e) => setExpectedGuests(e.target.value)}
              style={campo}
            />
          </label>
          <label style={rotulo}>
            Começo
            <input
              type="datetime-local"
              value={comeca}
              onChange={(e) => setComeca(e.target.value)}
              style={campo}
            />
          </label>
          <label style={rotulo}>
            Fim
            <input
              type="datetime-local"
              value={termina}
              onChange={(e) => setTermina(e.target.value)}
              style={campo}
            />
          </label>
        </>
      )}

      {passo === 1 && (
        <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {MODELOS_DE_IDENTIDADE.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPresetId(m.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  textAlign: "left",
                  border:
                    presetId === m.id ? "2px solid var(--acento)" : "1px solid var(--linha)",
                  backgroundColor:
                    presetId === m.id ? "var(--superficie-alta)" : "var(--bg)",
                  cursor: "pointer",
                  ...raio("var(--raio)"),
                }}
              >
                <span
                  style={{
                    width: "1.75rem",
                    height: "1.75rem",
                    borderRadius: "50%",
                    backgroundColor: m.amostra,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontFamily: "var(--fonte-titulo)" }}>{m.nome}</span>
              </button>
            ))}
          </div>
          <div
            style={{
              ...previewVars,
              padding: "1.25rem",
              ...raio("var(--raio)"),
              backgroundColor: "var(--bg)",
              color: "var(--ink)",
              fontFamily: "var(--fonte-corpo)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--fonte-titulo)",
                fontSize: "1.25rem",
                color: "var(--acento-texto)",
              }}
            >
              {texto(pack, "landing.exemplo.nome")}
            </p>
            <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem", color: "var(--ink-2)" }}>
              Preview ao vivo — o convidado vê isto com os mesmos tokens.
            </p>
          </div>
        </div>
      )}

      {passo === 2 && (
        <ListaMissoes
          pack={pack}
          marcadas={missoesMarcadas.size > 0 ? missoesMarcadas : new Set(missoesIniciais)}
          onToggle={(chave) => {
            setMissoesMarcadas((antes) => {
              const base = antes.size > 0 ? new Set(antes) : new Set(missoesIniciais);
              if (base.has(chave)) {
                base.delete(chave);
              } else {
                base.add(chave);
              }
              return base;
            });
          }}
        />
      )}

      {passo === 3 && (
        <>
          <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.5, fontSize: "0.9375rem" }}>
            Marque os modelos que entram no rodízio da parede.
          </p>
          {problemasParede.length > 0 && (
            <p style={{ margin: 0, color: "var(--critico)", fontSize: "0.875rem" }}>
              {problemasParede.join(" ")}
            </p>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(8rem, 1fr))",
              gap: "0.5rem",
            }}
          >
            {MODELOS_DE_TELAO.map((modelo) => {
              const marcado = modelosParede.has(modelo);
              return (
                <button
                  key={modelo}
                  type="button"
                  onClick={() => {
                    setModelosParede((antes) => {
                      const prox = new Set(antes);
                      if (prox.has(modelo)) prox.delete(modelo);
                      else prox.add(modelo);
                      return prox;
                    });
                  }}
                  style={{
                    padding: "0.75rem",
                    border: marcado ? "2px solid var(--acento)" : "1px solid var(--linha)",
                    backgroundColor: marcado ? "var(--superficie-alta)" : "var(--bg)",
                    cursor: "pointer",
                    ...raio("var(--raio)"),
                    fontFamily: "var(--fonte-titulo)",
                    fontSize: "0.875rem",
                  }}
                >
                  {modelo}
                </button>
              );
            })}
          </div>
        </>
      )}

      {passo === 4 && (
        <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6 }}>
          Pronto para criar. Depois você baixa a placa com QR nos controles do evento — SVG hoje,
          PDF na fila do CI.
        </p>
      )}

      {estado === "erro" && (
        <p style={aviso}>Não deu para criar agora. Confira os dados e tente de novo.</p>
      )}

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        {passo > 0 && (
          <button type="button" onClick={() => setPasso((p) => p - 1)} style={botaoSecundario}>
            Voltar
          </button>
        )}
        {passo < PASSOS.length - 1 ? (
          <button
            type="button"
            disabled={!podeAvancar}
            onClick={() => setPasso((p) => p + 1)}
            style={{ ...botao, opacity: podeAvancar ? 1 : 0.5 }}
          >
            Continuar
          </button>
        ) : (
          <button
            type="button"
            disabled={estado === "criando" || !podeAvancar}
            onClick={() => void criar()}
            style={{ ...botao, opacity: estado === "criando" ? 0.6 : 1 }}
          >
            {estado === "criando" ? "Criando…" : "Criar e abrir painel"}
          </button>
        )}
      </div>
    </Shell>
  );
}

function ListaMissoes({
  pack,
  marcadas,
  onToggle,
}: {
  pack: Pack;
  marcadas: Set<string>;
  onToggle: (chave: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {pack.missoes.map((m) => (
        <label
          key={m.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem",
            ...raio("var(--raio)"),
            border: "1px solid var(--linha)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={marcadas.has(m.chaveTitulo)}
            onChange={() => onToggle(m.chaveTitulo)}
          />
          <span>{texto(pack, m.chaveTitulo)}</span>
        </label>
      ))}
    </div>
  );
}

function Resultado({ criado }: { criado: Criado }) {
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <Shell titulo="Evento criado" passo={4} total={5}>
      <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.5 }}>
        Imprima o QR do link do convidado na mesa. Abra o telão numa TV do salão e pareie com o
        código que aparece nela.
      </p>
      <Link titulo="Controles durante a festa" url={`${origem}/admin/e/${criado.eventoId}`} />
      <Link titulo="Link do convidado (QR)" url={`${origem}/e/${criado.slug}`} />
      <a
        href={`/admin/e/${criado.eventoId}`}
        style={{ ...botao, textAlign: "center", textDecoration: "none" }}
      >
        Abrir controles do evento
      </a>
    </Shell>
  );
}

function Link({ titulo, url }: { titulo: string; url: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <span
        style={{
          fontSize: "0.8rem",
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

function Shell({
  titulo,
  passo,
  total,
  children,
}: {
  titulo: string;
  passo: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "min(36rem, 100%)",
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
          padding: "2rem",
          backgroundColor: "var(--superficie)",
          ...raio("var(--raio-superficie)"),
        }}
      >
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: "0.25rem",
                ...raio("var(--raio-pilula)"),
                backgroundColor: i <= passo ? "var(--acento)" : "var(--linha)",
              }}
            />
          ))}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "0.6875rem",
            letterSpacing: "var(--tracking-rotulo)",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          Passo {passo + 1} de {total}
        </p>
        <h1 style={{ margin: 0, fontFamily: "var(--fonte-titulo)", fontSize: "1.5rem" }}>{titulo}</h1>
        {children}
      </div>
    </main>
  );
}

const rotulo: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
  fontSize: "0.9rem",
  color: "var(--ink-2)",
};
const campo: CSSProperties = {
  padding: "0.75rem 0.9rem",
  fontSize: "1rem",
  color: "var(--ink)",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--linha)",
  ...raio("var(--raio)"),
};
const aviso: CSSProperties = { margin: 0, color: "var(--critico)", fontSize: "0.9rem" };
const botao: CSSProperties = {
  flex: 1,
  padding: "0.875rem 1rem",
  fontFamily: "var(--fonte-titulo)",
  fontSize: "1.05rem",
  color: "var(--sobre-acento)",
  backgroundColor: "var(--acento)",
  border: "none",
  cursor: "pointer",
  ...raio("var(--raio-pilula)"),
};
const botaoSecundario: CSSProperties = {
  padding: "0.875rem 1rem",
  fontFamily: "var(--fonte-titulo)",
  fontSize: "1rem",
  color: "var(--ink-2)",
  backgroundColor: "transparent",
  border: "1px solid var(--linha)",
  cursor: "pointer",
  ...raio("var(--raio-pilula)"),
};
