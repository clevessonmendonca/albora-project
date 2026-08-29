"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useProfileViewer() {
  const [indice, setIndice] = useState<number | null>(null);
  const scrollSalvo = useRef<number | null>(null);

  const abrir = useCallback((i: number) => {
    scrollSalvo.current = window.scrollY;
    setIndice(i);
  }, []);

  const fechar = useCallback(() => {
    setIndice(null);
    if (scrollSalvo.current !== null) {
      window.scrollTo({ top: scrollSalvo.current, behavior: "auto" });
      scrollSalvo.current = null;
    }
  }, []);

  useEffect(() => {
    if (indice === null) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [indice]);

  return { indice, abrir, fechar, navegar: setIndice };
}
