"use client";

import { useCallback, useEffect, useState } from "react";
import type { InteractionBannerLabels } from "../lib/interaction-banner";
import { resolveInteractionBanner } from "../lib/interaction-banner";

type GateSnapshot = {
  interacaoAbreEm: string | null;
  fuso: string;
};

function parseGate(raw: GateSnapshot) {
  return {
    interacaoAbreEm: raw.interacaoAbreEm ? new Date(raw.interacaoAbreEm) : null,
    fuso: raw.fuso,
  };
}

export function useInteractionGate(
  slug: string,
  initial: { open: boolean; label: string; opensAtIso: string | null; fuso: string },
  labels: InteractionBannerLabels,
) {
  const computeLocal = useCallback(
    (gate: GateSnapshot) => {
      const resolved = resolveInteractionBanner(parseGate(gate), labels);
      return { open: resolved.open, label: resolved.label };
    },
    [labels],
  );

  const [state, setState] = useState(() => ({
    open: initial.open,
    label: initial.label,
  }));

  useEffect(() => {
    const gate: GateSnapshot = {
      interacaoAbreEm: initial.opensAtIso,
      fuso: initial.fuso,
    };
    setState(computeLocal(gate));
    const tick = () => setState(computeLocal(gate));
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [computeLocal, initial.fuso, initial.opensAtIso]);

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch(`/api/e/${encodeURIComponent(slug)}/stats`);
        if (!r.ok) return;
        const d = (await r.json()) as GateSnapshot & { interacaoAberta?: boolean };
        if (d.interacaoAbreEm === undefined && d.interacaoAberta === undefined) return;
        setState(computeLocal({ interacaoAbreEm: d.interacaoAbreEm ?? null, fuso: d.fuso ?? initial.fuso }));
      } catch {
        // degradar silenciosamente
      }
    };

    const id = window.setInterval(() => void poll(), 60_000);
    return () => window.clearInterval(id);
  }, [slug, computeLocal, initial.fuso]);

  return state;
}
