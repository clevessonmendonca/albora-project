"use client";

import {
  MODELOS_DE_TELAO,
  problemasDaEscolha,
  type ModeloDeTelao,
} from "@albora/core";
import { PACKS, texto, type Pack } from "@albora/packs";
import { MODELOS_DE_IDENTIDADE } from "@albora/tokens";
import { useMemo, useState } from "react";
import {
  identityPreviewClassName,
  presetSwatchProps,
  resolveIdentityPreviewVars,
} from "@/features/admin/lib/identity-preview";
import { adminClasses } from "@/features/admin/components/server/admin-shell";

const OPCOES = Object.values(PACKS).map((p) => ({ id: p.id, nome: texto(p, "evento.nome") }));

const PASSOS = ["Quando", "Identidade", "Missões", "Parede", "Peças"] as const;

const MODELOS_PADRAO: readonly ModeloDeTelao[] = ["polaroide", "mural", "colagem", "dump"];

type Criado = { slug: string; eventoId: string };

export function CreateEventWizard() {
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

  const previewVars = useMemo(
    () => resolveIdentityPreviewVars(pack, identityTokens),
    [pack, identityTokens],
  );

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
      const r = await fetch("/api/admin/events", {
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
          <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
            Tipo de evento
            <select
              value={packId}
              onChange={(e) => setPackId(e.target.value)}
              className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink"
            >
              {OPCOES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
            Convidados esperados
            <input
              type="number"
              min={1}
              value={expectedGuests}
              onChange={(e) => setExpectedGuests(e.target.value)}
              className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
            Começo
            <input
              type="datetime-local"
              value={comeca}
              onChange={(e) => setComeca(e.target.value)}
              className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
            Fim
            <input
              type="datetime-local"
              value={termina}
              onChange={(e) => setTermina(e.target.value)}
              className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink"
            />
          </label>
        </>
      )}

      {passo === 1 && (
        <div className="grid grid-cols-2 gap-5">
          <div className="flex flex-col gap-3">
            {MODELOS_DE_IDENTIDADE.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPresetId(m.id)}
                className={`flex cursor-pointer items-center gap-3 rounded-token p-3 text-left ${
                  presetId === m.id
                    ? "border-2 border-acento bg-superficie-alta"
                    : "border border-linha bg-bg"
                }`}
              >
                <span {...presetSwatchProps(m.amostra)} />
                <span className="font-titulo">{m.nome}</span>
              </button>
            ))}
          </div>
          <div className={identityPreviewClassName} style={previewVars}>
            <p className="m-0 font-titulo text-xl text-acento-texto">
              {texto(pack, "landing.exemplo.nome")}
            </p>
            <p className="mb-0 mt-3 text-sm text-ink-2">
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
          <p className="m-0 text-[0.9375rem] leading-normal text-ink-2">
            Marque os modelos que entram no rodízio da parede.
          </p>
          {problemasParede.length > 0 && (
            <p className="m-0 text-sm text-critico">{problemasParede.join(" ")}</p>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2">
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
                  className={`cursor-pointer rounded-token p-3 font-titulo text-sm ${
                    marcado
                      ? "border-2 border-acento bg-superficie-alta"
                      : "border border-linha bg-bg"
                  }`}
                >
                  {modelo}
                </button>
              );
            })}
          </div>
        </>
      )}

      {passo === 4 && (
        <p className="m-0 leading-relaxed text-ink-2">
          Pronto para criar. Depois você baixa a placa com QR nos controles do evento — SVG hoje,
          PDF na fila do CI.
        </p>
      )}

      {estado === "erro" && (
        <p className="m-0 text-[0.9rem] text-critico">
          Não deu para criar agora. Confira os dados e tente de novo.
        </p>
      )}

      <div className="mt-2 flex gap-3">
        {passo > 0 && (
          <button
            type="button"
            onClick={() => setPasso((p) => p - 1)}
            className={`${adminClasses.secondaryButton} px-4 py-3.5`}
          >
            Voltar
          </button>
        )}
        {passo < PASSOS.length - 1 ? (
          <button
            type="button"
            disabled={!podeAvancar}
            onClick={() => setPasso((p) => p + 1)}
            className={`${adminClasses.primaryButton} flex-1 py-3.5 text-[1.05rem] ${
              podeAvancar ? "opacity-100" : "opacity-50"
            }`}
          >
            Continuar
          </button>
        ) : (
          <button
            type="button"
            disabled={estado === "criando" || !podeAvancar}
            onClick={() => void criar()}
            className={`${adminClasses.primaryButton} flex-1 py-3.5 text-[1.05rem] ${
              estado === "criando" ? "opacity-60" : "opacity-100"
            }`}
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
    <div className="flex flex-col gap-2">
      {pack.missoes.map((m) => (
        <label
          key={m.id}
          className="flex cursor-pointer items-center gap-3 rounded-token border border-linha p-3"
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
      <p className="m-0 leading-normal text-ink-2">
        Imprima o QR do link do convidado na mesa. Abra o telão numa TV do salão e pareie com o
        código que aparece nela.
      </p>
      <Link titulo="Controles durante a festa" url={`${origem}/admin/e/${criado.eventoId}`} />
      <Link titulo="Link do convidado (QR)" url={`${origem}/e/${criado.slug}`} />
      <a
        href={`/admin/e/${criado.eventoId}`}
        className={`${adminClasses.primaryButton} block py-3.5 text-center text-[1.05rem]`}
      >
        Abrir controles do evento
      </a>
    </Shell>
  );
}

function Link({ titulo, url }: { titulo: string; url: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.8rem] uppercase tracking-rotulo text-ink-3">{titulo}</span>
      <a href={url} className="break-all text-[0.95rem] text-acento">
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
    <main className="fixed inset-0 grid place-items-center overflow-y-auto bg-bg p-6 font-corpo text-ink">
      <div className="flex w-full max-w-[36rem] flex-col gap-[1.1rem] rounded-superficie bg-superficie p-8">
        <div className="flex gap-1.5">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-pilula ${
                i <= passo ? "bg-acento" : "bg-linha"
              }`}
            />
          ))}
        </div>
        <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
          Passo {passo + 1} de {total}
        </p>
        <h1 className="m-0 font-titulo text-2xl">{titulo}</h1>
        {children}
      </div>
    </main>
  );
}
