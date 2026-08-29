"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FUSO_PADRAO, type WallDisplayModel } from "@albora/core";
import { PACKS, resolvePackText } from "@albora/packs";
import { ALBORA_BRAND, IDENTITY_MODELS, type ModeloDeIdentidade } from "@albora/tokens";
import { resolveIdentityPreviewVars } from "@/features/admin/lib/identity-preview";

export const OPTIONS = Object.values(PACKS).map((p) => ({
  id: p.id,
  nome: resolvePackText(p, "evento.nome"),
  rotulo: resolvePackText(p, "landing.rotulo"),
}));

export const STEPS = ["Tipo", "Evento", "Identidade", "Missões", "Confirmar"] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_MODELS: readonly WallDisplayModel[] = ["polaroide", "mural", "colagem", "dump"];

const BRAND = ALBORA_BRAND.cores!;

export type CreatedEvent = { slug: string; eventoId: string; planIntent: "free" | "celebration" };

export type VendorOption = { vendorId: string; name: string; role: "admin" | "staff" };

export function normalizarBackground(bg: string | undefined): "light" | "dark" {
  return bg === "light" || bg === "claro" ? "light" : "dark";
}

export function presetParaCores(m: ModeloDeIdentidade) {
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

export function useCreateEventWizard() {
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
  const [created, setCreated] = useState<CreatedEvent | null>(null);
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

  const initialMissions = useMemo(() => pack.missoes.map((m) => m.chaveTitulo), [pack]);

  const activeMissions = checkedMissions.size > 0 ? [...checkedMissions] : initialMissions;

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

  const canAdvance = step === 1 ? datesValid && guestsValid && coupleEmailValid : true;

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

  return {
    planIntent,
    step,
    setStep,
    packId,
    setPackId,
    title,
    setTitle,
    starts,
    setStarts,
    ends,
    setEnds,
    timezone,
    setTimezone,
    expectedGuests,
    setExpectedGuests,
    presetAtivo,
    setPresetAtivo,
    acentoCor,
    setAcentoCor,
    baseCor,
    setBaseCor,
    textoCor,
    setTextoCor,
    bgModo,
    checkedMissions,
    setCheckedMissions,
    status,
    created,
    vendors,
    vendorId,
    setVendorId,
    coupleEmail,
    setCoupleEmail,
    pack,
    datesValid,
    guestsValid,
    coupleEmailValid,
    initialMissions,
    activeMissions,
    preset,
    identityTokens,
    previewVars,
    canAdvance,
    selecionarPreset,
    trocarModo,
    create,
  };
}
