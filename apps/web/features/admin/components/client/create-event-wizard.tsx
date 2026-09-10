"use client";

import React, { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import NextLink from "next/link";
import { FUSO_PADRAO, type VendorPlanTier, type WallDisplayModel } from "@albora/core";
import { PACKS, packsDeCriacao, resolvePackText } from "@albora/packs";
import { Select } from "@albora/ui-web";
import { useSearchParams } from "next/navigation";
import { resolveIdentityPreviewVars } from "@/features/admin/lib/identity-preview";
import { adminClasses } from "@/features/admin/components/server/admin-shell";
import { eventEntryUrl, whatsappInviteUrl } from "@/lib/qr";
import { CoverImageEditor } from "@/features/admin/components/client/cover-image-editor";
import { delayedAuthEnabled } from "@/lib/flags";
import { TypeStep, type TypeOption } from "./onboarding/type-step";
import { AppearanceStep } from "./onboarding/appearance-step";
import { AccessEmailStep } from "./onboarding/access-email-step";
import { EVENT_STYLES, COLOR_COMBOS, type EventStyle } from "./onboarding/appearance-data";
import { LivePreview, type PreviewSurface } from "./onboarding/live-preview";
import { paletteFromImage } from "./onboarding/photo-palette";
import { Glyph } from "./onboarding/glyph";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_MODELS: readonly WallDisplayModel[] = ["polaroide", "mural", "colagem", "dump"];
const DEFAULT_STYLE = EVENT_STYLES[0]!;
const DEFAULT_COMBO = COLOR_COMBOS[DEFAULT_STYLE.comboIndex]!;

/** Fuso e idioma são auto-detectados (design v3): não ocupam o caminho principal. */
function detectarFuso(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FUSO_PADRAO;
  } catch {
    return FUSO_PADRAO;
  }
}

function rotuloData(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d} · ${m} · ${y}` : "";
}

type Created = {
  slug: string;
  eventoId: string;
  planIntent: "free" | "celebration";
  vendorSlug?: string;
  vendorPlan?: VendorPlanTier;
};
type VendorOption = { vendorId: string; name: string; role: "admin" | "staff" };

const STEPS = ["Evento", "Aparência", "Pronto"] as const;

export function CreateEventWizard() {
  const search = useSearchParams();
  const planIntent: "free" | "celebration" =
    search.get("plano") === "celebration" ? "celebration" : "free";

  const typeOptions: TypeOption[] = useMemo(
    () =>
      packsDeCriacao().map((p) => ({
        id: p.id,
        nome: resolvePackText(p, "evento.nome"),
        icone: p.icone ?? "calendar",
        preparo: resolvePackText(p, "evento.preparo"),
        posse: resolvePackText(p, "evento.posse"),
      })),
    [],
  );

  const [step, setStep] = useState(0);
  const [packId, setPackId] = useState(typeOptions[0]!.id);
  // Nome vindo da landing (`?nome=`): a pessoa já digitou o nome da festa na
  // demo, então a criação começa preenchida com ele.
  const [title, setTitle] = useState(() => (search.get("nome") ?? "").slice(0, 60));
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [timezone] = useState(detectarFuso);

  const [styleKey, setStyleKey] = useState<EventStyle["chave"]>(DEFAULT_STYLE.chave);
  const [cor, setCor] = useState(DEFAULT_COMBO.cor);
  const [cor2, setCor2] = useState(DEFAULT_COMBO.cor2);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [photoColors, setPhotoColors] = useState<string[]>([]);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [surface, setSurface] = useState<PreviewSurface>("convidado");
  const [previewOpen, setPreviewOpen] = useState(false);

  const [status, setStatus] = useState<"editing" | "creating" | "error">("editing");
  const [created, setCreated] = useState<Created | null>(null);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [coupleEmail, setCoupleEmail] = useState("");
  const requestedVendorId = search.get("vendor") ?? "";
  const vendorSlug = search.get("vendorSlug") ?? "";
  const vendorPlanParam = search.get("vendorPlan");
  const vendorPlan =
    vendorPlanParam === "starter" || vendorPlanParam === "studio" || vendorPlanParam === "agency"
      ? vendorPlanParam
      : undefined;
  const vendorApplied = useRef(false);

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

  useEffect(() => {
    if (vendorApplied.current || requestedVendorId === "") return;
    if (vendors.some((vendor) => vendor.vendorId === requestedVendorId)) {
      setVendorId(requestedVendorId);
      vendorApplied.current = true;
    }
  }, [requestedVendorId, vendors]);

  useEffect(() => {
    return () => {
      if (coverUrl) URL.revokeObjectURL(coverUrl);
    };
  }, [coverUrl]);

  const pack = PACKS[packId]!;
  const style = EVENT_STYLES.find((s) => s.chave === styleKey) ?? DEFAULT_STYLE;
  const titlePlaceholder = resolvePackText(pack, "landing.exemplo.nome") || "Seu evento";
  const displayTitle = title.trim() || titlePlaceholder;

  const momentos = useMemo(
    () => (pack.momentos ?? []).map((m) => resolvePackText(pack, m.chaveTitulo)),
    [pack],
  );
  const activeMissions = useMemo(() => pack.missoes.map((m) => m.chaveTitulo), [pack]);

  const identityTokens = useMemo((): Record<string, unknown> => {
    const { cores: styleCores, ...restCamada } = style.camada;
    return {
      presetId: styleKey,
      telaoModelos: [...DEFAULT_MODELS],
      ...restCamada,
      // `acento` recebe a cor 1 para o tema atual do convidado seguir pintado; a camada de duas
      // cores (`--ev`/`--ev-2`) vem de `eventCores`, que o Fluxo B adota sem repintar o produto.
      cores: { ...(styleCores ?? {}), acento: cor },
      eventCores: { cor, cor2 },
    };
  }, [style, styleKey, cor, cor2]);

  const previewVars = useMemo(
    () => resolveIdentityPreviewVars(pack, identityTokens) as CSSProperties,
    [pack, identityTokens],
  );

  const titleValid = title.trim().length > 0;
  const dateValid = date.length > 0;
  const coupleEmailValid = vendorId === "" || EMAIL_RE.test(coupleEmail.trim());
  const step0Valid = titleValid && dateValid && coupleEmailValid;
  const [showErrors, setShowErrors] = useState(false);

  function pickStyle(s: EventStyle) {
    setStyleKey(s.chave);
    const combo = COLOR_COMBOS[s.comboIndex]!;
    setCor(combo.cor);
    setCor2(combo.cor2);
  }

  function setColor(slot: "cor" | "cor2", hex: string) {
    if (slot === "cor") setCor(hex);
    else setCor2(hex);
  }

  function onPickCover() {
    coverInputRef.current?.click();
  }

  function onCoverFile(file: File | undefined) {
    if (!file) return;
    if (coverUrl) URL.revokeObjectURL(coverUrl);
    const url = URL.createObjectURL(file);
    setCoverFile(file);
    setCoverUrl(url);
    void paletteFromImage(url).then(setPhotoColors);
  }

  function advance() {
    if (step === 0 && !step0Valid) {
      setShowErrors(true);
      return;
    }
    if (step === 0) {
      setStep(1);
      setShowErrors(false);
    } else if (step === 1) {
      void create();
    }
  }

  const create = async () => {
    setStatus("creating");
    try {
      const r = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          packId,
          title: title.trim() || undefined,
          comecaEm: `${date}T16:00`,
          terminaEm: `${date}T22:00`,
          timezone,
          ...(guests.trim() ? { expectedGuests: Number(guests) } : {}),
          identityTokens,
          missoes: activeMissions,
          telaoModelos: [...DEFAULT_MODELS],
          ...(vendorId ? { vendorId, coupleEmail: coupleEmail.trim() } : {}),
        }),
      });
      if (!r.ok) return setStatus("error");
      const data = (await r.json()) as { slug: string; eventoId: string };
      setCreated({
        ...data,
        planIntent,
        ...(vendorSlug ? { vendorSlug } : {}),
        ...(vendorPlan ? { vendorPlan } : {}),
      });
    } catch {
      setStatus("error");
    }
  };

  // Teclado (Linear): número seleciona tipo/estilo, Enter avança, ⌫ volta — nunca dentro de campo.
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const alvo = e.target as HTMLElement;
    const digitando =
      alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable;
    if (created) return;
    if (e.key === "Enter" && !digitando) {
      e.preventDefault();
      advance();
      return;
    }
    if ((e.key === "Backspace" || e.key === "Escape") && !digitando && step > 0) {
      e.preventDefault();
      setStep((p) => p - 1);
      return;
    }
    if (!digitando && /^[1-9]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (step === 0 && typeOptions[i]) setPackId(typeOptions[i]!.id);
      if (step === 1 && EVENT_STYLES[i]) pickStyle(EVENT_STYLES[i]!);
    }
  }

  if (created) return <ReadyStep created={created} title={displayTitle} coverFile={coverFile} previewVars={previewVars} />;

  const previewData = {
    vars: previewVars,
    title: displayTitle,
    dateLabel: rotuloData(date),
    ctaLabel: "Entrar na festa",
    momentos,
    coverImage: coverUrl,
    layout: styleKey,
    onEditTitle: (v: string) => setTitle(v),
    onPickCover,
  };

  return (
    <div onKeyDown={onKeyDown}>
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          onCoverFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <main className="min-h-dvh bg-bg font-corpo text-ink">
        <ProgressHeader step={step} onExit />
        <div className="mx-auto grid w-full max-w-[64rem] gap-8 px-[clamp(1.1rem,4vw,2rem)] py-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h1 className="tipo-title m-0">{step === 0 ? "Vamos criar seu evento" : "Como ele aparece"}</h1>
              <p className="tipo-body m-0 text-ink-2">
                {step === 0
                  ? "O tipo define os momentos e as missões — você muda depois."
                  : "Escolha um estilo. Personalize se quiser — a prévia acompanha."}
              </p>
            </div>

            {step === 0 && (
              <>
                <TypeStep
                  options={typeOptions}
                  selectedId={packId}
                  onSelectType={setPackId}
                  title={title}
                  onTitle={setTitle}
                  titlePlaceholder={titlePlaceholder}
                  date={date}
                  onDate={setDate}
                  titleError={showErrors && !titleValid}
                  dateError={showErrors && !dateValid}
                  guests={guests}
                  onGuests={setGuests}
                  showDetails={showDetails}
                  onToggleDetails={() => setShowDetails((v) => !v)}
                />
                {vendors.length > 0 && (
                  <div className="flex flex-col gap-3 border-t border-linha pt-4">
                    <Select label="Criar sob" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                      <option value="">Minha conta</option>
                      {vendors.map((v) => (
                        <option key={v.vendorId} value={v.vendorId}>
                          {v.name}
                        </option>
                      ))}
                    </Select>
                    {vendorId !== "" && (
                      <>
                        <input
                          type="email"
                          value={coupleEmail}
                          onChange={(e) => setCoupleEmail(e.target.value)}
                          placeholder="e-mail de quem recebe o painel"
                          aria-label="E-mail de quem recebe o painel"
                          aria-invalid={showErrors && !coupleEmailValid ? true : undefined}
                          aria-describedby={showErrors && !coupleEmailValid ? "casal-erro" : undefined}
                          className="min-h-[46px] rounded-token border border-linha bg-superficie px-3 py-2 text-ink outline-none focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto"
                        />
                        <p className="tipo-caption m-0 text-ink-3">
                          Quem cria aqui entra como cerimonialista; o painel vai pra quem recebe o e-mail.
                        </p>
                        {showErrors && !coupleEmailValid && (
                          <p id="casal-erro" role="alert" className="tipo-caption m-0 text-critico">
                            Informe um e-mail válido pra quem recebe o painel.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {step === 1 && (
              <>
                <AppearanceStep
                  styleKey={styleKey}
                  onStyle={pickStyle}
                  cor={cor}
                  cor2={cor2}
                  onColor={setColor}
                  photoColors={photoColors}
                  hasCover={Boolean(coverUrl)}
                />
                {/* Prévia inline compacta no mobile, na Aparência (design v3). */}
                <div className="lg:hidden">
                  <LivePreview data={previewData} surface={surface} onSurfaceChange={setSurface} />
                </div>
              </>
            )}

            {status === "error" && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                Não deu para criar agora. Confira os dados e tente de novo.
              </p>
            )}

            <NavBar
              step={step}
              canAdvance={step === 0 ? true : true}
              creating={status === "creating"}
              onBack={() => setStep((p) => p - 1)}
              onAdvance={advance}
            />
          </div>

          {/* Prévia persistente no desktop. */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <LivePreview data={previewData} surface={surface} onSurfaceChange={setSurface} />
            </div>
          </aside>
        </div>

        {/* Mobile: "Ver prévia" fora da Aparência (sheet). */}
        {step !== 1 && (
          <>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-1.5 rounded-pilula border border-linha bg-superficie-alta px-4 py-3 tipo-label text-ink shadow-alta lg:hidden"
            >
              <Glyph name="eye" size={16} /> Ver prévia
            </button>
            {previewOpen && (
              <div className="fixed inset-0 z-50 flex items-end bg-ink/40 lg:hidden" onClick={() => setPreviewOpen(false)}>
                <div
                  className="max-h-[85dvh] w-full overflow-y-auto rounded-t-superficie bg-bg p-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mx-auto mb-4 h-1 w-10 rounded-pilula bg-linha" />
                  <LivePreview data={previewData} surface={surface} onSurfaceChange={setSurface} />
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(false)}
                    className={`${adminClasses.secondaryButton} mt-5 w-full py-3 text-center`}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ProgressHeader({ step, onExit }: { step: number; onExit?: boolean }) {
  return (
    <div className="sticky top-0 z-30 border-b border-linha bg-bg px-[clamp(1.1rem,4vw,2rem)] py-3.5">
      <div className="mx-auto flex max-w-[64rem] items-center gap-4">
        {onExit && (
          <NextLink href="/admin" className="tipo-label shrink-0 text-ink-3 no-underline hover:text-ink">
            ← Sair
          </NextLink>
        )}
        <nav aria-label="Progresso" className="flex flex-1 items-center gap-2">
          {STEPS.map((label, i) => (
            <span key={label} className="flex flex-1 items-center gap-2">
              <span className="min-w-0 flex-1">
                <span
                  aria-hidden
                  className={`block h-1 rounded-pilula transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                    i <= step ? "bg-acento" : "bg-superficie-alta"
                  }`}
                />
                <span className={`tipo-label mt-1 hidden sm:block ${i === step ? "text-ink" : "text-ink-3"}`}>
                  {`0${i + 1}`} {label}
                </span>
              </span>
            </span>
          ))}
        </nav>
        <span className="tipo-label shrink-0 text-ink-3" aria-hidden>
          {step + 1}/{STEPS.length}
        </span>
      </div>
    </div>
  );
}

function NavBar({
  step,
  canAdvance,
  creating,
  onBack,
  onAdvance,
}: {
  step: number;
  canAdvance: boolean;
  creating: boolean;
  onBack: () => void;
  onAdvance: () => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-3 border-t border-linha pt-5">
      {step > 0 && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 shrink-0 items-center rounded-pilula px-3 text-[0.875rem] text-ink-3 transition-colors hover:text-ink"
        >
          ← Voltar
        </button>
      )}
      <button
        type="button"
        disabled={creating || !canAdvance}
        onClick={onAdvance}
        className={`${adminClasses.primaryButton} flex-1 py-3.5 text-center text-[1.05rem] ${creating ? "opacity-60" : ""}`}
      >
        {step === 0 ? "Tudo pronto →" : creating ? "Criando…" : "Criar evento"}
      </button>
    </div>
  );
}

function ReadyStep({
  created,
  title,
  coverFile,
  previewVars,
}: {
  created: Created;
  title: string;
  coverFile: File | null;
  previewVars: CSSProperties;
}) {
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
    <main className="min-h-dvh bg-bg font-corpo text-ink" style={previewVars}>
      <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-6 px-[clamp(1.1rem,4vw,2rem)] py-12">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-acento text-sobre-acento">
            <Glyph name="check" size={22} />
          </span>
          <h1 className="tipo-title m-0 mt-2">
            <span style={{ color: "var(--ev, var(--acento-texto))" }}>{title}</span> está pronto.
          </h1>
          <p className="tipo-body m-0 text-ink-2">Você montou tudo isso sem sair do caminho.</p>
        </div>

        <CoverImageEditor eventId={created.eventoId} initialCoverImageUrl={null} initialCoverImageKey={null} autoUploadFile={coverFile} />

        {/* E-mail-como-acesso: hipótese de delayed auth, atrás de flag (ADR 0020). Off = caminho atual. */}
        {delayedAuthEnabled() && <AccessEmailStep eventId={created.eventoId} />}

        <a href={`/admin/e/${created.eventoId}`} className={`${adminClasses.primaryButton} w-full py-3.5 text-center text-[1.05rem]`}>
          Ir para meu evento
        </a>

        {created.vendorSlug && (
          <a
            href={`/f/${encodeURIComponent(created.vendorSlug)}${created.vendorPlan ? `?plan=${created.vendorPlan}#assinatura` : ""}`}
            className={`${adminClasses.secondaryButton} w-full py-3 text-center text-[0.95rem]`}
          >
            Abrir portal do fornecedor
          </a>
        )}

        <div className="grid grid-cols-2 gap-2">
          <a href={eventEntryUrl(origin, created.slug, "link")} className={`${adminClasses.secondaryButton} py-3 text-center text-[0.95rem]`}>
            Ver como convidado
          </a>
          <a href={whatsappInviteUrl(origin, created.slug)} className={`${adminClasses.secondaryButton} py-3 text-center text-[0.95rem]`}>
            Compartilhar
          </a>
        </div>

        {created.planIntent === "celebration" && (
          <button
            type="button"
            disabled={paying}
            onClick={() => void startCheckout()}
            className={`${adminClasses.primaryButton} w-full py-3.5 text-center text-[1.05rem] ${paying ? "opacity-60" : ""}`}
          >
            {paying ? "Abrindo pagamento…" : "Pagar Completo (R$ 199)"}
          </button>
        )}
        {payError && (
          <p role="alert" className="m-0 text-sm text-critico">
            Não abriu o checkout. Tente de novo no painel.
          </p>
        )}

        <p className="tipo-caption m-0 text-center text-ink-3">
          Configure depois: Missões · Telão · QR · Equipe
        </p>
      </div>
    </main>
  );
}
