"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  FUSO_PADRAO,
  WALL_DISPLAY_MODELS,
  wallDisplayChoiceProblems,
  type WallDisplayModel,
} from "@albora/core";
import { PACKS, resolvePackText, type Pack } from "@albora/packs";
import { IDENTITY_MODELS } from "@albora/tokens";
import { useSearchParams } from "next/navigation";
import {
  identityPreviewClassName,
  presetSwatchProps,
  resolveIdentityPreviewVars,
} from "@/features/admin/lib/identity-preview";
import { adminClasses } from "@/features/admin/components/server/admin-shell";
import { eventEntryUrl, whatsappInviteUrl } from "@/lib/qr";
import { TimezoneField } from "@/features/admin/components/client/timezone-field";

const OPTIONS = Object.values(PACKS).map((p) => ({ id: p.id, nome: resolvePackText(p, "evento.nome") }));

const STEPS = ["Quando", "Identidade", "Missões", "Parede", "Peças"] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_MODELS: readonly WallDisplayModel[] = ["polaroide", "mural", "colagem", "dump"];

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
  const [expectedGuests, setExpectedGuests] = useState("150");
  const [presetId, setPresetId] = useState(IDENTITY_MODELS[0]!.id);
  const [checkedMissions, setCheckedMissions] = useState<Set<string>>(() => new Set());
  const [wallModels, setWallModels] = useState<Set<WallDisplayModel>>(
    () => new Set(DEFAULT_MODELS),
  );
  const [status, setStatus] = useState<"editing" | "creating" | "error">("editing");
  const [created, setCreated] = useState<Created | null>(null);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vendorId, setVendorId] = useState<string>("");
  const [coupleEmail, setCoupleEmail] = useState<string>("");

  // Passo condicional (spec-canal-fornecedor §2, item 4): a maioria dos
  // anfitriões não é membro de fornecedor nenhum — lista vazia é o caso comum
  // e não muda a tela. Falha na busca degrada para "sem fornecedor", nunca
  // trava a criação do evento por ela.
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
  // Criar sob fornecedor: o casal, não quem clica "criar", vira dono do
  // evento (canManageCoupleOnly é do casal) — o e-mail dele é obrigatório
  // aqui pra emitir o magic link que abre o painel para ele.
  const coupleEmailValid = vendorId === "" || EMAIL_RE.test(coupleEmail.trim());

  const initialMissions = useMemo(() => {
    const keys = pack.missoes.map((m) => m.chaveTitulo);
    return keys;
  }, [pack]);

  const activeMissions =
    checkedMissions.size > 0
      ? [...checkedMissions]
      : initialMissions;

  const wallProblems = wallDisplayChoiceProblems([...wallModels]);

  const preset = IDENTITY_MODELS.find((m) => m.id === presetId) ?? IDENTITY_MODELS[0]!;

  const identityTokens = useMemo(() => {
    const base: Record<string, unknown> = {
      presetId: preset.id,
      telaoModelos: [...wallModels],
      ...preset.camada,
    };
    return base;
  }, [preset, wallModels]);

  const previewVars = useMemo(
    () => resolveIdentityPreviewVars(pack, identityTokens),
    [pack, identityTokens],
  );

  const canAdvance =
    step === 0
      ? datesValid && guestsValid && coupleEmailValid
      : step === 3
        ? wallProblems.length === 0
        : true;

  const create = async () => {
    if (!datesValid || !guestsValid || !coupleEmailValid || wallProblems.length > 0) return;
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

  return (
    <Shell title={STEPS[step] ?? "Criar evento"} step={step} total={STEPS.length}>
      {planIntent === "celebration" && step === 0 && (
        <p className="m-0 rounded-token bg-superficie-alta px-3 py-2 text-sm text-ink-2">
          Completo (R$ 199): o evento nasce grátis para montar; o pagamento abre depois, sem
          bloquear o convidado.
        </p>
      )}
      {step === 0 && (
        <>
          <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
            Nome do evento
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={resolvePackText(pack, "landing.exemplo.nome")}
              className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink outline-none focus:border-acento"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
            Tipo de evento
            <select
              value={packId}
              onChange={(e) => setPackId(e.target.value)}
              className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink outline-none focus:border-acento"
            >
              {OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
          {vendors.length > 0 && (
            <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
              Criar sob
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink outline-none focus:border-acento"
              >
                <option value="">Minha conta</option>
                {vendors.map((v) => (
                  <option key={v.vendorId} value={v.vendorId}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {vendorId !== "" && (
            <>
              <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
                E-mail do casal
                <input
                  type="email"
                  value={coupleEmail}
                  onChange={(e) => setCoupleEmail(e.target.value)}
                  placeholder="nome@exemplo.com"
                  className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink outline-none focus:border-acento"
                />
              </label>
              <p className="m-0 text-[0.8rem] text-ink-3">
                O casal recebe um link por e-mail pra abrir o painel — quem cria aqui entra como
                cerimonialista, não como dono do evento.
              </p>
            </>
          )}
          <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
            Convidados esperados
            <input
              type="number"
              min={1}
              value={expectedGuests}
              onChange={(e) => setExpectedGuests(e.target.value)}
              className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink outline-none focus:border-acento"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
            Começo
            <input
              type="datetime-local"
              value={starts}
              onChange={(e) => setStarts(e.target.value)}
              className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink outline-none focus:border-acento"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
            Fim
            <input
              type="datetime-local"
              value={ends}
              onChange={(e) => setEnds(e.target.value)}
              className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink outline-none focus:border-acento"
            />
          </label>
          <TimezoneField value={timezone} onChange={setTimezone} />
        </>
      )}

      {step === 1 && (
        <div className="grid grid-cols-2 gap-5">
          <div className="flex flex-col gap-3">
            {IDENTITY_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPresetId(m.id)}
                className={`flex cursor-pointer items-center gap-3 rounded-token p-3 text-left ${
                  presetId === m.id
                    ? "border-2 border-acento bg-superficie-alta"
                    : "border border-linha bg-bg hover:border-acento-texto transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]"
                }`}
              >
                <span {...presetSwatchProps(m.amostra)} />
                <span className="font-titulo">{m.nome}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <div className={identityPreviewClassName} style={previewVars}>
              <div className="mb-2 h-1 w-12 rounded-pilula bg-acento" />
              <p className="m-0 font-titulo text-xl text-acento-texto">
                {resolvePackText(pack, "landing.exemplo.nome")}
              </p>
              <p className="mb-0 mt-2 text-sm text-ink-2">
                Exemplo com tokens desta identidade
              </p>
            </div>
            <p className="m-0 text-xs text-ink-3">
              Preview ao vivo — o convidado vê isto com a mesma tipografia, cores e bordas.
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
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
        />
      )}

      {step === 3 && (
        <>
          <p className="m-0 text-[0.9375rem] leading-normal text-ink-2">
            Marque os modelos que entram no rodízio da parede.
          </p>
          {wallProblems.length > 0 && (
            <p className="m-0 text-sm text-critico">{wallProblems.join(" ")}</p>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2">
            {WALL_DISPLAY_MODELS.map((model) => {
              const selected = wallModels.has(model);
              return (
                <button
                  key={model}
                  type="button"
                  onClick={() => {
                    setWallModels((prev) => {
                      const next = new Set(prev);
                      if (next.has(model)) next.delete(model);
                      else next.add(model);
                      return next;
                    });
                  }}
                  className={`cursor-pointer rounded-token p-3 font-titulo text-sm transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                    selected
                      ? "border-2 border-acento bg-superficie-alta"
                      : "border border-linha bg-bg hover:border-acento-texto"
                  }`}
                >
                  {model}
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 4 && (
        <p className="m-0 leading-relaxed text-ink-2">
          Pronto para criar. Depois você baixa a placa com QR nos controles do evento — PDF
          pronto para a gráfica.
        </p>
      )}

      {status === "error" && (
        <p className="m-0 text-[0.9rem] text-critico">
          Não deu para criar agora. Confira os dados e tente de novo.
        </p>
      )}

      <div className="mt-2 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((p) => p - 1)}
            className={`${adminClasses.secondaryButton} px-4 py-3.5`}
          >
            Voltar
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!canAdvance}
            onClick={() => setStep((p) => p + 1)}
            className={`${adminClasses.primaryButton} flex-1 py-3.5 text-[1.05rem] ${
              canAdvance ? "opacity-100" : "opacity-50"
            }`}
          >
            Continuar
          </button>
        ) : (
          <button
            type="button"
            disabled={status === "creating" || !canAdvance}
            onClick={() => void create()}
            className={`${adminClasses.primaryButton} flex-1 py-3.5 text-[1.05rem] ${
              status === "creating" ? "opacity-60" : "opacity-100"
            }`}
          >
            {status === "creating" ? "Criando…" : "Criar e abrir painel"}
          </button>
        )}
      </div>
    </Shell>
  );
}

function MissionList({
  pack,
  checked,
  onToggle,
}: {
  pack: Pack;
  checked: Set<string>;
  onToggle: (key: string) => void;
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
            checked={checked.has(m.chaveTitulo)}
            onChange={() => onToggle(m.chaveTitulo)}
          />
          <span>{resolvePackText(pack, m.chaveTitulo)}</span>
        </label>
      ))}
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
    <Shell title="Evento criado" step={4} total={5}>
      <p className="m-0 leading-normal text-ink-2">
        Imprima o QR do link do convidado na mesa. Abra o telão numa TV do salão e pareie com o
        código que aparece nela.
      </p>
      <Link title="Controles durante a festa" url={`${origin}/admin/e/${created.eventoId}`} />
      <Link title="Link do convidado" url={eventEntryUrl(origin, created.slug, "link")} />
      <Link title="WhatsApp" url={whatsappInviteUrl(origin, created.slug)} />
      {created.planIntent === "celebration" && (
        <button
          type="button"
          disabled={paying}
          onClick={() => void startCheckout()}
          className={`${adminClasses.primaryButton} block w-full py-3.5 text-center text-[1.05rem] ${
            paying ? "opacity-60" : ""
          }`}
        >
          {paying ? "Abrindo pagamento…" : "Pagar Completo (R$ 199)"}
        </button>
      )}
      {payError && (
        <p className="m-0 text-sm text-critico">Não abriu o checkout. Tente de novo no painel.</p>
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
      <span className="text-[0.8rem] uppercase tracking-rotulo text-ink-3">{title}</span>
      <div className="flex items-center gap-2">
        <a href={url} className="min-w-0 flex-1 break-all text-[0.95rem] text-acento">
          {url}
        </a>
        <button
          type="button"
          onClick={copiar}
          className="shrink-0 cursor-pointer rounded-pilula border border-linha bg-superficie-alta px-3 py-1 font-titulo text-[0.75rem] text-ink transition-colors"
        >
          {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function Shell({
  title,
  step,
  total,
  children,
}: {
  title: string;
  step: number;
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
                i <= step ? "bg-acento" : "bg-linha"
              }`}
            />
          ))}
        </div>
        <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
          Passo {step + 1} de {total}
        </p>
        <h1 className="m-0 font-titulo text-2xl">{title}</h1>
        {children}
      </div>
    </main>
  );
}
