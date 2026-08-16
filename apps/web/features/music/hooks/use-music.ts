"use client";

import { useCallback, useEffect, useState } from "react";
import type { ModoInteracao } from "@albora/core";
import { suggestionMessage } from "@/features/music/lib/suggestion-copy";
import type { VisibleSuggestion } from "@/features/music/types/visible-suggestion";
import type { VisibleTrack } from "@/features/music/types/visible-track";

export type MusicFailure = "network" | "session";

export type MusicState = {
  track: VisibleTrack | null;
  suggestions: VisibleSuggestion[];
  interaction: ModoInteracao;
  loading: boolean;
  loaded: boolean;
  failure: MusicFailure | null;
  submitting: boolean;
  suggestionError: string | null;
  capReached: boolean;
};

export function initialState(): MusicState {
  return {
    track: null,
    suggestions: [],
    interaction: "espelho",
    loading: true,
    loaded: false,
    failure: null,
    submitting: false,
    suggestionError: null,
    capReached: false,
  };
}

export type MusicPageData = {
  track: VisibleTrack | null;
  suggestions: VisibleSuggestion[];
  interaction: ModoInteracao;
};

export type FetchMusicResult =
  | { ok: true; page: MusicPageData }
  | { ok: false; failure: MusicFailure };

export type SubmitSuggestionResult =
  | { ok: true; suggestions: VisibleSuggestion[] }
  | { ok: false; failure: MusicFailure }
  | { ok: false; code: string; details?: Record<string, unknown> };

function readSuggestions(value: unknown): VisibleSuggestion[] {
  if (!Array.isArray(value)) return [];
  const out: VisibleSuggestion[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      typeof item.provedor === "string" &&
      typeof item.tipo === "string" &&
      typeof item.url === "string" &&
      typeof item.votos === "number"
    ) {
      out.push({
        provedor: item.provedor,
        tipo: item.tipo,
        url: item.url,
        votos: item.votos,
      });
    }
  }
  return out;
}

function readTrack(value: unknown): VisibleTrack | null {
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  if (typeof m.provedor !== "string" || typeof m.rotulo !== "string" || typeof m.url !== "string") {
    return null;
  }
  return {
    provedor: m.provedor,
    rotulo: m.rotulo,
    url: m.url,
    capaUrl: typeof m.capaUrl === "string" ? m.capaUrl : null,
  };
}

export async function fetchMusic(): Promise<FetchMusicResult> {
  let res: Response;
  try {
    res = await fetch("/api/music", { credentials: "same-origin" });
  } catch {
    return { ok: false, failure: "network" };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, failure: "session" };
  if (!res.ok) return { ok: false, failure: "network" };

  try {
    const body = (await res.json()) as Record<string, unknown>;
    return {
      ok: true,
      page: {
        track: readTrack(body.musica),
        suggestions: readSuggestions(body.sugestoes),
        interaction: body.interacao === "completo" ? "completo" : "espelho",
      },
    };
  } catch {
    return { ok: false, failure: "network" };
  }
}

export async function submitSuggestion(url: string): Promise<SubmitSuggestionResult> {
  let res: Response;
  try {
    res = await fetch("/api/music", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch {
    return { ok: false, failure: "network" };
  }

  if (res.status === 401) return { ok: false, failure: "session" };

  let body: Record<string, unknown>;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, failure: "network" };
  }

  if (res.ok) {
    return { ok: true, suggestions: readSuggestions(body.sugestoes) };
  }

  const code = typeof body.code === "string" ? body.code : "erro.interno";
  if (code === "musica.evento_divergente") return { ok: false, failure: "session" };

  const details =
    body.details && typeof body.details === "object"
      ? (body.details as Record<string, unknown>)
      : undefined;
  return details ? { ok: false, code, details } : { ok: false, code };
}

export function withPage(state: MusicState, page: MusicPageData): MusicState {
  return {
    ...state,
    track: page.track,
    suggestions: page.suggestions,
    interaction: page.interaction,
    loading: false,
    loaded: true,
    failure: null,
  };
}

export function withFailure(state: MusicState, failure: MusicFailure): MusicState {
  return { ...state, loading: false, loaded: true, submitting: false, failure };
}

export function withSubmit(state: MusicState): MusicState {
  return { ...state, submitting: true, suggestionError: null };
}

export function withAcceptedSuggestion(
  state: MusicState,
  suggestions: VisibleSuggestion[],
): MusicState {
  return {
    ...state,
    submitting: false,
    suggestionError: null,
    suggestions,
  };
}

export function withRejectedSuggestion(
  state: MusicState,
  code: string,
  details?: Record<string, unknown>,
): MusicState {
  return {
    ...state,
    submitting: false,
    suggestionError: suggestionMessage(code, details),
    capReached: code === "musica.teto_de_sugestoes" ? true : state.capReached,
    interaction: code === "musica.interacao_fechada" ? "espelho" : state.interaction,
  };
}

export function withNetworkErrorOnSubmit(state: MusicState): MusicState {
  return {
    ...state,
    submitting: false,
    suggestionError: suggestionMessage("erro.interno"),
  };
}

export function useMusic() {
  const [state, setState] = useState<MusicState>(initialState);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, failure: null }));
    const r = await fetchMusic();
    setState((s) => (r.ok ? withPage(s, r.page) : withFailure(s, r.failure)));
  }, []);

  const suggest = useCallback(async (url: string): Promise<boolean> => {
    const trimmed = url.trim();
    if (trimmed === "") {
      setState((s) => withRejectedSuggestion(s, "validation_error"));
      return false;
    }

    setState(withSubmit);
    const r = await submitSuggestion(trimmed);
    if (r.ok) {
      setState((s) => withAcceptedSuggestion(s, r.suggestions));
      return true;
    }
    if ("failure" in r) {
      setState((s) => (r.failure === "session" ? withFailure(s, "session") : withNetworkErrorOnSubmit(s)));
      return false;
    }
    setState((s) => withRejectedSuggestion(s, r.code, r.details));
    return false;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, suggest };
}
