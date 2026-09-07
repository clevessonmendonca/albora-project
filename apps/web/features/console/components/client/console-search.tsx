"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CommandPalette, type CommandPaletteResult } from "@albora/ui-web";
import { searchConsoleAction } from "@/features/console/actions";

const DEBOUNCE_MS = 200;

/**
 * Substitui o `<input>` estático que só imprimia "⌘K" (Onda A, T14) — o
 * atalho agora abre de verdade. `Cmd+K` no mac, `Ctrl+K` no resto.
 */
export function ConsoleSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommandPaletteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function aoTeclar(ev: KeyboardEvent) {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  const buscar = useCallback((valor: string) => {
    setQuery(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (valor.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const encontrados = await searchConsoleAction(valor);
      setResults(encontrados);
      setLoading(false);
    }, DEBOUNCE_MS);
  }, []);

  function fechar() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tipo-den-corpo relative ml-2 hidden min-h-11 max-w-md flex-1 items-center rounded-superficie border border-linha bg-superficie-alta py-2 pl-3 pr-12 text-left text-ink-3 min-[900px]:flex"
      >
        Buscar…
        <kbd className="tipo-den-rotulo pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">⌘K</kbd>
      </button>
      <CommandPalette
        open={open}
        onClose={fechar}
        query={query}
        onQueryChange={buscar}
        results={results}
        loading={loading}
        onSelect={(resultado) => {
          fechar();
          router.push(resultado.href);
        }}
      />
    </>
  );
}
