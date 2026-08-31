import type { DrainSummary } from "@albora/core";

export type OrigemDrain = "foreground" | "background" | "manual";

export type DrainTelemetry = {
  origem: OrigemDrain;
  em: string;
  enviados: number;
  retentar: number;
  desistiram: number;
};

const CACHE_KEY = "albora-drain-telemetry.json";

let ultimo: DrainTelemetry | null = null;

export function formatarHorarioDrain(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function resumoDrainTexto(t: DrainTelemetry): string {
  const hora = formatarHorarioDrain(t.em);
  const origem =
    t.origem === "background" ? "em background" : t.origem === "manual" ? "manual" : "ao voltar";
  if (t.enviados > 0) {
    return `Último drain ${origem} (${hora}): ${t.enviados} enviada(s).`;
  }
  if (t.retentar > 0) {
    return `Último drain ${origem} (${hora}): ${t.retentar} aguardando sinal.`;
  }
  return `Último drain ${origem} (${hora}): fila parada.`;
}

export function telemetryFromSummary(
  summary: DrainSummary,
  origem: OrigemDrain,
  em: string = new Date().toISOString(),
): DrainTelemetry {
  return {
    origem,
    em,
    enviados: summary.enviados,
    retentar: summary.retentar,
    desistiram: summary.desistiram,
  };
}

export function recordDrainSummaryMemory(summary: DrainSummary, origem: OrigemDrain): DrainTelemetry {
  ultimo = telemetryFromSummary(summary, origem);
  return ultimo;
}

export function readLastDrainTelemetryMemory(): DrainTelemetry | null {
  return ultimo;
}

export function resetDrainTelemetryForTests(): void {
  ultimo = null;
}

export async function persistDrainTelemetry(
  telemetry: DrainTelemetry,
  writeJson: (path: string, json: string) => Promise<void>,
  path: string = CACHE_KEY,
): Promise<void> {
  ultimo = telemetry;
  await writeJson(path, JSON.stringify(telemetry));
}

export async function readPersistedDrainTelemetry(
  readJson: (path: string) => Promise<string | null>,
  path: string = CACHE_KEY,
): Promise<DrainTelemetry | null> {
  const raw = await readJson(path);
  if (!raw) return ultimo;
  try {
    const parsed = JSON.parse(raw) as DrainTelemetry;
    if (typeof parsed.em !== "string") return ultimo;
    ultimo = parsed;
    return parsed;
  } catch {
    return ultimo;
  }
}
