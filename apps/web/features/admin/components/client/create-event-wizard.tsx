"use client";

import React, { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import { FUSO_PADRAO, type WallDisplayModel } from "@albora/core";
import { PACKS, resolvePackText, type Pack } from "@albora/packs";
import { ALBORA_BRAND, IDENTITY_MODELS, type ModeloDeIdentidade } from "@albora/tokens";
import { Card, Select, TextField } from "@albora/ui-web";
import { useSearchParams } from "next/navigation";
import { resolveIdentityPreviewVars } from "@/features/admin/lib/identity-preview";
import { adminClasses } from "@/features/admin/components/server/admin-shell";
import { eventEntryUrl, whatsappInviteUrl } from "@/lib/qr";
import { TimezoneField } from "@/features/admin/components/client/timezone-field";

const OPTIONS = Object.values(PACKS).map((p) => ({
  id: p.id,
  nome: resolvePackText(p, "evento.nome"),
  // Descrição do núcleo, nunca copy de landing: pack escolhido aqui pode não ter
  // funil próprio, e `resolvePackText` devolveria a chave crua na tela de criação.
  rotulo: resolvePackText(p, "evento.descricao"),
}));

const STEPS = ["Tipo", "Evento", "Identidade", "Missões", "Confirmar"] as const;

/** Uma frase calma por passo — o foco da tela, não uma instrução extra pra ler. */
const STEP_DESCRIPTIONS: readonly string[] = [
  "Define os textos padrão e as missões sugeridas — dá pra trocar depois.",
  "Nome, datas e quantos convidados você espera na festa.",
  "As cores que aparecem pro convidado, no telão e na impressão.",
  "Quais fotos pedir durante a festa — liga e desliga cada uma.",
  "Revise antes de criar. Depois de criado, dá pra ajustar tudo no painel.",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_MODELS: readonly WallDisplayModel[] = ["polaroide", "mural", "colagem", "dump"];

const BRAND = ALBORA_BRAND.cores!;

function normalizarBackground(bg: string | undefined): "light" | "dark" {
  return bg === "light" || bg === "claro" ? "light" : "dark";
}

function presetParaCores(m: ModeloDeIdentidade) {
  const modo = normalizarBackground(m.camada.background);
  const acento = m.camada.cores?.acento ?? BRAND.acento!;
  const base =
    modo === "dark"
      ? (m.camada.cores?.noite ?? BRAND.noite!)
      : (m.camada.cores?.papel ?? BRAND.papel!);
  const texto =
    modo === "dark"
      ? (m.camada.cores?.papel ?? BRAND.papel!)
      : (m.camada.cores?.tinta ?? BRAND.tinta!);
  return { acento, base, texto, modo };
}

type Created = { slug: string; eventoId: string; planIntent: "free" | "celebration" };

type VendorOption = { vendorId: string; name: string; role: "admin" | "staff" };

export function CreateEventWizard() {
  const search = useSearchParams();
  const planIntent: "free" | "celebration" =
    search.get("plano") === "celebration" ? "celebration" : "free";

  const [step, setStep] = useState(0);
  const [packId, setPackId] = useState(OPTIONS[0]!.id);
  const [title, setTitle] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [timezone, setTimezone] = useState(FUSO_PADRAO);
  // Sem valor inicial: participação (`sessoes_com_upload / expected_guests`) é a
  // métrica que decide a tese, e um default preenchido vira denominador inventado
  // sempre que o anfitrião não olha o campo.
  const [expectedGuests, setExpectedGuests] = useState("");
  const [presetId, setPresetId] = useState(IDENTITY_MODELS[0]!.id);
  const [presetAtivo, setPresetAtivo] = useState<string | null>(IDENTITY_MODELS[0]!.id);
  const [acentoCor, setAcentoCor] = useState(() => presetParaCores(IDENTITY_MODELS[0]!).acento);
  const [baseCor, setBaseCor] = useState(() => presetParaCores(IDENTITY_MODELS[0]!).base);
  const [textoCor, setTextoCor] = useState(() => presetParaCores(IDENTITY_MODELS[0]!).texto);
  const [bgModo, setBgModo] = useState<"light" | "dark">(
    () => presetParaCores(IDENTITY_MODELS[0]!).modo,
  );
  const [checkedMissions, setCheckedMissions] = useState<Set<string>>(() => new Set());
  const [wallModels] = useState<Set<WallDisplayModel>>(() => new Set(DEFAULT_MODELS));
  const [status, setStatus] = useState<"editing" | "creating" | "error">("editing");
  const [created, setCreated] = useState<Created | null>(null);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vendorId, setVendorId] = useState<string>("");
  const [coupleEmail, setCoupleEmail] = useState<string>("");

  useEffect(() => {
    let vivo = true;
    void fetch("/api/admin/vendors")
      .then((r) => (r.ok ? (r.json() as Promise<{ vendors: VendorOption[] }>) : null))
      .then((data) => {
        if (vivo && data) setVendors(data.vendors);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const pack = PACKS[packId]!;

  const datesValid = starts !== "" && ends !== "" && ends > starts;
  const guestsValid = Number(expectedGuests) > 0 && Number.isFinite(Number(expectedGuests));
  const coupleEmailValid = vendorId === "" || EMAIL_RE.test(coupleEmail.trim());

  const initialMissions = useMemo(() => {
    const keys = pack.missoes.map((m) => m.chaveTitulo);
    return keys;
  }, [pack]);

  const activeMissions =
    checkedMissions.size > 0 ? [...checkedMissions] : initialMissions;

  const preset = IDENTITY_MODELS.find((m) => m.id === presetId) ?? IDENTITY_MODELS[0]!;

  const identityTokens = useMemo((): Record<string, unknown> => {
    return {
      presetId,
      telaoModelos: [...wallModels],
      ...preset.camada,
      cores: {
        ...(preset.camada.cores ?? {}),
        acento: acentoCor,
        ...(bgModo === "dark"
          ? { noite: baseCor, papel: textoCor }
          : { papel: baseCor, tinta: textoCor }),
      },
      background: bgModo,
    };
  }, [preset, wallModels, acentoCor, baseCor, textoCor, bgModo, presetId]);

  const previewVars = useMemo(
    () => resolveIdentityPreviewVars(pack, identityTokens),
    [pack, identityTokens],
  );

  const canAdvance =
    step === 1 ? datesValid && guestsValid && coupleEmailValid : true;

  function selecionarPreset(m: ModeloDeIdentidade) {
    const { acento, base, texto, modo } = presetParaCores(m);
    setPresetId(m.id);
    setPresetAtivo(m.id);
    setAcentoCor(acento);
    setBaseCor(base);
    setTextoCor(texto);
    setBgModo(modo);
  }

  function trocarModo(modo: "light" | "dark") {
    if (modo === bgModo) return;
    setBgModo(modo);
    setPresetAtivo(null);
    setBaseCor(modo === "dark" ? BRAND.noite! : BRAND.papel!);
    setTextoCor(modo === "dark" ? BRAND.papel! : BRAND.tinta!);
  }

  const create = async () => {
    if (!datesValid || !guestsValid || !coupleEmailValid) return;
    setStatus("creating");
    try {
      const r = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          packId,
          title: title.trim() || undefined,
          comecaEm: starts,
          terminaEm: ends,
          timezone,
          expectedGuests: Number(expectedGuests),
          identityTokens,
          missoes: activeMissions,
          telaoModelos: [...wallModels],
          ...(vendorId ? { vendorId, coupleEmail: coupleEmail.trim() } : {}),
        }),
      });
      if (!r.ok) return setStatus("error");
      const data = (await r.json()) as { slug: string; eventoId: string };
      setCreated({ ...data, planIntent });
    } catch {
      setStatus("error");
    }
  };

  if (created) return <Result created={created} />;

  const subtitle = STEP_DESCRIPTIONS[step] ?? "";

  return (
    <Shell title={STEPS[step] ?? "Criar evento"} subtitle={subtitle} step={step} total={STEPS.length}>
      {planIntent === "celebration" && step === 0 && (
        <p className="tipo-caption m-0 rounded-token bg-superficie-alta px-3 py-2 text-ink-2">
          Completo (R$ 199): o evento nasce grátis para montar; o pagamento abre depois, sem
          bloquear o convidado.
        </p>
      )}

      <div
        key={step}
        className="flex flex-col gap-5 animate-[wall-aparecer_320ms_var(--curva)] motion-reduce:animate-none"
      >
        {step === 0 && (
          <div className="flex flex-col gap-2.5">
            {OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={packId === opt.id}
                onClick={() => setPackId(opt.id)}
                className={`flex w-full cursor-pointer items-start justify-between gap-4 rounded-token p-5 text-left transition-all duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                  packId === opt.id
                    ? "border-2 border-acento bg-superficie-alta"
                    : "border border-linha bg-superficie hover:border-acento-texto"
                }`}
              >
                <div className="flex flex-col gap-1.5">
                  <span className="font-titulo text-[1.0625rem] capitalize text-ink">
                    {opt.nome}
                  </span>
                  <span className="tipo-caption text-ink-3">{opt.rotulo}</span>
                </div>
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                    packId === opt.id
                      ? "border-acento bg-acento"
                      : "border-linha bg-transparent"
                  }`}
                >
                  {packId === opt.id && (
                    <span className="h-2 w-2 rounded-full bg-sobre-acento" />
                  )}
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <>
            <TextField
              label="Nome do evento"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={resolvePackText(pack, "landing.exemplo.nome")}
            />

            <div className="flex flex-col gap-2">
              <label htmlFor="expected-guests" className="text-sm font-medium text-ink">
                Quantos convidados presentes?
              </label>
              <p className="tipo-caption m-0 text-ink-3">
                Estimativa de quem vai estar na festa. Usamos para medir a participação — a
                métrica principal do álbum.
              </p>
              <div className="flex items-baseline justify-between gap-3">
                <input
                  id="expected-guests"
                  placeholder="—"
                  type="number"
                  min={1}
                  max={999}
                  required
                  value={expectedGuests}
                  onChange={(e) => setExpectedGuests(e.target.value)}
                  aria-describedby={!guestsValid ? "expected-guests-error" : undefined}
                  aria-invalid={!guestsValid ? true : undefined}
                  className="min-h-[48px] w-[5.5rem] rounded-token border border-linha bg-superficie px-3 py-2 font-titulo text-xl text-ink outline-none transition-[border-color,box-shadow] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto"
                />
                <span className="tipo-caption text-ink-3">pessoas na festa</span>
              </div>
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={Math.min(500, Math.max(10, Number(expectedGuests) || 150))}
                onChange={(e) => setExpectedGuests(e.target.value)}
                aria-label="Ajuste rápido de convidados presentes"
                style={{ accentColor: "var(--acento)" }}
                className="h-11 w-full cursor-pointer"
              />
              <div className="flex justify-between text-[0.75rem] text-ink-3">
                <span>10</span>
                <span>500+</span>
              </div>
              {!guestsValid && (
                <p id="expected-guests-error" role="alert" className="m-0 text-sm text-critico">
                  Informe quantos convidados você espera na festa.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Começo"
                type="datetime-local"
                value={starts}
                onChange={(e) => setStarts(e.target.value)}
              />
              <TextField
                label="Fim"
                type="datetime-local"
                value={ends}
                onChange={(e) => setEnds(e.target.value)}
              />
            </div>
            {datesValid && (
              <p className="tipo-caption m-0 text-ink-3">
                Duração:{" "}
                {Math.round(
                  (new Date(ends).getTime() - new Date(starts).getTime()) / 3_600_000,
                )}
                h
              </p>
            )}
            {!datesValid && starts !== "" && ends !== "" && (
              <p role="alert" className="m-0 text-sm text-critico">
                O fim deve ser depois do começo.
              </p>
            )}

            <TimezoneField value={timezone} onChange={setTimezone} />

            {vendors.length > 0 && (
              <Select
                label="Criar sob"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
              >
                <option value="">Minha conta</option>
                {vendors.map((v) => (
                  <option key={v.vendorId} value={v.vendorId}>
                    {v.name}
                  </option>
                ))}
              </Select>
            )}
            {vendorId !== "" && (
              <>
                <TextField
                  label="E-mail do casal"
                  type="email"
                  value={coupleEmail}
                  onChange={(e) => setCoupleEmail(e.target.value)}
                  placeholder="nome@exemplo.com"
                />
                <p className="tipo-caption m-0 text-ink-3">
                  O casal recebe um link por e-mail pra abrir o painel — quem cria aqui entra
                  como cerimonialista, não como dono do evento.
                </p>
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {IDENTITY_MODELS.map((m) => {
                const ativo = presetAtivo === m.id;
                const cores = presetParaCores(m);
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => selecionarPreset(m)}
                    className={`flex cursor-pointer flex-col gap-2.5 rounded-token p-3.5 text-left transition-all duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                      ativo
                        ? "border-2 border-acento bg-superficie-alta"
                        : "border border-linha bg-superficie hover:border-acento-texto"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="size-5 shrink-0 rounded-full border border-linha"
                        style={{ backgroundColor: cores.base }}
                      />
                      <span
                        className="size-5 shrink-0 rounded-full border border-linha"
                        style={{ backgroundColor: cores.acento }}
                      />
                      <span
                        className="size-5 shrink-0 rounded-full border border-linha"
                        style={{ backgroundColor: cores.texto }}
                      />
                      {ativo && (
                        <span className="tipo-label ml-auto text-acento-texto">✓</span>
                      )}
                    </div>
                    <div>
                      <p className="m-0 font-titulo text-[0.9rem] text-ink">{m.nome}</p>
                      <p className="tipo-label m-0 text-ink-3">
                        {m.camada.background === "light" ? "Claro" : "Escuro"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-linha" />
              <span className="tipo-label shrink-0 text-ink-3">ou crie a sua paleta</span>
              <span className="h-px flex-1 bg-linha" />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="m-0 text-[0.9rem] text-ink">Fundo</p>
                  <p className="tipo-caption m-0 text-ink-3">Tom geral da tela do convidado</p>
                </div>
                <div className="flex gap-1 rounded-pilula border border-linha bg-superficie p-0.5">
                  {(["light", "dark"] as const).map((modo) => (
                    <button
                      key={modo}
                      type="button"
                      aria-pressed={bgModo === modo}
                      onClick={() => trocarModo(modo)}
                      className={`inline-flex min-h-11 items-center justify-center rounded-pilula px-4 text-[0.8rem] transition-all duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                        bgModo === modo
                          ? "bg-superficie-alta text-ink shadow-suave"
                          : "text-ink-3 hover:text-ink-2"
                      }`}
                    >
                      {modo === "light" ? "Claro" : "Escuro"}
                    </button>
                  ))}
                </div>
              </div>

              <CorInput
                label="Cor de destaque"
                dica="Botões, marcações e links"
                value={acentoCor}
                onChange={(cor) => {
                  setAcentoCor(cor);
                  setPresetAtivo(null);
                }}
              />
              <CorInput
                label={bgModo === "dark" ? "Canvas escuro" : "Canvas claro"}
                dica="Cor de fundo principal"
                value={baseCor}
                onChange={(cor) => {
                  setBaseCor(cor);
                  setPresetAtivo(null);
                }}
              />
              <CorInput
                label={bgModo === "dark" ? "Tom do texto" : "Cor do texto"}
                dica={
                  bgModo === "dark" ? "Títulos e parágrafos sobre fundo escuro" : "Títulos e parágrafos"
                }
                value={textoCor}
                onChange={(cor) => {
                  setTextoCor(cor);
                  setPresetAtivo(null);
                }}
              />
            </div>

            <div
              className="overflow-hidden rounded-superficie bg-bg font-corpo text-ink"
              style={previewVars}
            >
              <div className="flex items-center justify-between border-b border-linha px-5 py-3">
                <span className="tipo-label text-ink-3">Prévia</span>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-acento" />
                  <span className="size-2 rounded-full bg-acento opacity-50" />
                  <span className="size-2 rounded-full bg-acento opacity-25" />
                </div>
              </div>
              <div className="p-5">
                <div className="mb-3 h-[0.2rem] w-10 rounded-pilula bg-acento" />
                <p className="m-0 font-titulo text-xl leading-snug text-acento-texto">
                  {title.trim() || resolvePackText(pack, "landing.exemplo.nome")}
                </p>
                <p className="mb-5 mt-1.5 text-[0.8125rem] text-ink-2">
                  Missão · Foto no altar
                </p>
                <div className="flex items-center gap-2">
                  <span className="h-9 flex-1 rounded-token bg-acento opacity-90" />
                  <span className="h-9 w-20 rounded-token border border-linha opacity-60" />
                </div>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <MissionList
            pack={pack}
            checked={checkedMissions.size > 0 ? checkedMissions : new Set(initialMissions)}
            onToggle={(key) => {
              setCheckedMissions((prev) => {
                const next = prev.size > 0 ? new Set(prev) : new Set(initialMissions);
                if (next.has(key)) {
                  next.delete(key);
                } else {
                  next.add(key);
                }
                return next;
              });
            }}
            total={pack.missoes.length}
          />
        )}

        {step === 4 && (
          <ConfirmSummary
            pack={pack}
            packNome={OPTIONS.find((o) => o.id === packId)?.nome ?? ""}
            title={title.trim() || resolvePackText(pack, "landing.exemplo.nome")}
            starts={starts}
            ends={ends}
            guests={Number(expectedGuests)}
            presetNome={presetAtivo ? preset.nome : "Personalizado"}
            paleta={[baseCor, acentoCor, textoCor]}
            missionsCount={activeMissions.length}
            previewVars={previewVars}
          />
        )}
      </div>

      {status === "error" && (
        <p role="alert" className="tipo-caption m-0 text-critico">
          Não deu para criar agora. Confira os dados e tente de novo.
        </p>
      )}

      <div className="mt-2 flex items-center gap-4 border-t border-linha pt-5">
        {step === 0 ? (
          <NextLink
            href="/admin"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-pilula px-3 text-[0.875rem] text-ink-3 no-underline transition-[color,transform] duration-instantaneo ease-mola hover:text-ink active:scale-[0.97]"
          >
            Cancelar
          </NextLink>
        ) : (
          <button
            type="button"
            onClick={() => setStep((p) => p - 1)}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-pilula border-none bg-transparent px-3 text-[0.875rem] text-ink-3 transition-[color,transform] duration-instantaneo ease-mola hover:text-ink active:scale-[0.97]"
          >
            ← Voltar
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!canAdvance}
            onClick={() => setStep((p) => p + 1)}
            className={`${adminClasses.primaryButton} flex-1 py-3.5 text-center text-[1.05rem] ${
              canAdvance ? "opacity-100" : "opacity-50"
            }`}
          >
            Continuar
          </button>
        ) : (
          <button
            type="button"
            disabled={status === "creating"}
            onClick={() => void create()}
            className={`${adminClasses.primaryButton} flex-1 py-3.5 text-center text-[1.05rem] ${
              status === "creating" ? "opacity-60" : "opacity-100"
            }`}
          >
            {status === "creating" ? "Criando…" : "Criar evento"}
          </button>
        )}
      </div>
    </Shell>
  );
}

function CorInput({
  label,
  dica,
  value,
  onChange,
}: {
  label: string;
  dica: string;
  value: string;
  onChange: (cor: string) => void;
}) {
  return (
    <label className="relative flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-token border border-linha bg-superficie px-4 py-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto">
      <div className="flex flex-col gap-0.5">
        <span className="text-[0.9rem] text-ink">{label}</span>
        <span className="tipo-caption text-ink-3">{dica}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span
          className="size-8 shrink-0 rounded-full border border-linha"
          style={{
            backgroundColor: value,
            boxShadow: `0 0 0 2px var(--superficie), 0 0 0 3.5px ${value}`,
          }}
        />
        <span className="w-[4.5rem] font-mono text-[0.78rem] uppercase tracking-wider text-ink-2">
          {value.toUpperCase()}
        </span>
      </div>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}

function MissionList({
  pack,
  checked,
  onToggle,
  total,
}: {
  pack: Pack;
  checked: Set<string>;
  onToggle: (key: string) => void;
  total: number;
}) {
  const activeCount = pack.missoes.filter((m) => checked.has(m.chaveTitulo)).length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="tipo-label text-ink-3">
          {activeCount} de {total} ativas
        </span>
        <span className="tipo-caption text-ink-3">toque para ativar</span>
      </div>
      <div className="flex flex-col gap-2">
      {pack.missoes.map((m) => {
        const isChecked = checked.has(m.chaveTitulo);
        return (
          <button
            key={m.id}
            type="button"
            role="switch"
            aria-checked={isChecked}
            onClick={() => onToggle(m.chaveTitulo)}
            className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-token border p-3 text-left transition-all duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
              isChecked
                ? "border-acento bg-superficie-alta"
                : "border-linha bg-superficie opacity-60 hover:opacity-100"
            }`}
          >
            <span className={`text-[0.9375rem] ${isChecked ? "text-ink" : "text-ink-2"}`}>
              {resolvePackText(pack, m.chaveTitulo)}
            </span>
            <span
              aria-hidden
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-pilula transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                isChecked ? "bg-acento" : "bg-linha"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-bg shadow-suave transition-transform duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                  isChecked ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </span>
          </button>
        );
      })}
      </div>
    </div>
  );
}

function ConfirmSummary({
  pack,
  packNome,
  title,
  starts,
  ends,
  guests,
  presetNome,
  paleta,
  missionsCount,
  previewVars,
}: {
  pack: Pack;
  packNome: string;
  title: string;
  starts: string;
  ends: string;
  guests: number;
  presetNome: string;
  paleta: [string, string, string];
  missionsCount: number;
  previewVars: React.CSSProperties;
}) {
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const missaoExemplo = pack.missoes[0]
    ? resolvePackText(pack, pack.missoes[0].chaveTitulo)
    : "Missão";

  return (
    <div className="flex flex-col gap-4">
      <div
        className="overflow-hidden rounded-token font-corpo"
        style={previewVars}
      >
        <div className="bg-bg px-5 py-4">
          <div className="mb-2.5 h-[0.2rem] w-8 rounded-pilula bg-acento" />
          <p className="m-0 font-titulo text-lg leading-snug text-acento-texto">{title}</p>
          <p className="mb-4 mt-1 text-[0.78rem] text-ink-2">Missão · {missaoExemplo}</p>
          <div className="flex gap-2">
            <span className="h-8 flex-1 rounded-token bg-acento opacity-90" />
            <span className="h-8 w-16 rounded-token border border-linha opacity-50" />
          </div>
        </div>
      </div>

      <Card elevation={1} className="flex flex-col gap-3">
        <SummaryRow label="Tipo" value={packNome} />
        <SummaryRow label="Nome" value={title} />
        <SummaryRow label="Começo" value={fmt(starts)} />
        <SummaryRow label="Fim" value={fmt(ends)} />
        <SummaryRow label="Convidados presentes" value={`~${guests} pessoas`} />
        <div className="flex items-center justify-between gap-4">
          <span className="tipo-label shrink-0 text-ink-3">Identidade</span>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {paleta.map((cor, i) => (
                <span
                  key={i}
                  className="size-4 rounded-full border border-linha"
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
            <span className="text-right text-[0.9375rem] text-ink">{presetNome}</span>
          </div>
        </div>
        <SummaryRow label="Missões" value={`${missionsCount} ativas`} />
      </Card>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="tipo-label shrink-0 text-ink-3">{label}</span>
      <span className="text-right text-[0.9375rem] text-ink">{value}</span>
    </div>
  );
}

function Result({ created }: { created: Created }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(false);

  const startCheckout = async () => {
    setPaying(true);
    setPayError(false);
    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId: created.eventoId, plan: "celebration" }),
      });
      if (!r.ok) throw new Error("falhou");
      const data = (await r.json()) as { invoiceUrl?: string | null; asaasPaymentId?: string };
      if (data.invoiceUrl?.startsWith("http")) {
        window.location.href = data.invoiceUrl;
        return;
      }
      if (data.asaasPaymentId?.startsWith("pay_stub_")) {
        const sim = await fetch("/api/billing/simulate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ asaasPaymentId: data.asaasPaymentId }),
        });
        if (!sim.ok) throw new Error("sim");
        window.location.href = `/admin/e/${created.eventoId}?pago=1`;
        return;
      }
      window.location.href = `/admin/e/${created.eventoId}`;
    } catch {
      setPayError(true);
      setPaying(false);
    }
  };

  return (
    <Shell title="Evento criado" step={STEPS.length - 1} total={STEPS.length}>
      <div className="flex items-center gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-acento text-sobre-acento">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path
              d="M3 9.5l4 4L15 5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="m-0 leading-relaxed text-ink-2">
          Imprima o QR e cole na mesa. Abra o telão numa TV do salão e pareie com o código que
          aparece nele.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Link title="Controles durante a festa" url={`${origin}/admin/e/${created.eventoId}`} />
        <Link title="Link do convidado" url={eventEntryUrl(origin, created.slug, "link")} />
        <Link title="WhatsApp" url={whatsappInviteUrl(origin, created.slug)} />
      </div>

      {created.planIntent === "celebration" && (
        <button
          type="button"
          disabled={paying}
          onClick={() => void startCheckout()}
          className={`${adminClasses.primaryButton} w-full py-3.5 text-center text-[1.05rem] ${
            paying ? "opacity-60" : ""
          }`}
        >
          {paying ? "Abrindo pagamento…" : "Pagar Completo (R$ 199)"}
        </button>
      )}
      {payError && (
        <p role="alert" className="m-0 text-sm text-critico">
          Não abriu o checkout. Tente de novo no painel.
        </p>
      )}
      <a
        href={`/admin/e/${created.eventoId}`}
        className={`${adminClasses.secondaryButton} block py-3.5 text-center text-[1.05rem]`}
      >
        Abrir controles do evento
      </a>
    </Shell>
  );
}

function Link({ title, url }: { title: string; url: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = () => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="tipo-label text-ink-3">{title}</span>
      <div className="flex items-center gap-2">
        <a
          href={url}
          className="min-w-0 flex-1 break-all text-[0.95rem] text-acento transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-80"
        >
          {url}
        </a>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-pilula border border-linha bg-superficie-alta px-4 font-titulo text-[0.75rem] text-ink transition-[transform,border-color,color] duration-instantaneo ease-mola hover:border-acento-texto hover:text-ink-2 active:scale-[0.97]"
        >
          {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function Shell({
  title,
  subtitle,
  step,
  total,
  children,
}: {
  title: string;
  subtitle?: string;
  step: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <main className="fixed inset-0 flex flex-col bg-bg font-corpo text-ink">
      <div className="flex-none border-b border-linha px-6 py-4">
        <div className="mx-auto max-w-[34rem]">
          <nav aria-label="Progresso do cadastro">
            <div className="mb-3 flex items-center justify-between">
              <span className="tipo-label text-ink-3">Novo evento</span>
              <span className="tipo-label text-ink-3">
                {step + 1} de {total}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={step + 1}
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuetext={`Passo ${step + 1} de ${total}: ${STEPS[step] ?? ""}`}
              className="flex gap-1.5"
            >
              {STEPS.map((label, i) => (
                <span key={label} className="min-w-0 flex-1">
                  <span
                    aria-hidden
                    className={`block h-1.5 rounded-full transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                      i <= step ? "bg-acento" : "bg-superficie-alta"
                    }`}
                  />
                  <span
                    className={`tipo-label mt-1.5 hidden truncate sm:block ${
                      i === step ? "text-ink" : i < step ? "text-ink-2" : "text-ink-3"
                    }`}
                  >
                    {label}
                  </span>
                </span>
              ))}
            </div>
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-5 px-6 py-8">
          <div className="flex flex-col gap-1.5">
            <h1 className="tipo-title m-0">{title}</h1>
            {subtitle && <p className="tipo-body m-0 text-ink-2">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
