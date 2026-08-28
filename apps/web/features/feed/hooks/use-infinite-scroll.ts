"use client";

import { useEffect, useRef } from "react";

/** Sentinela de scroll infinita — `rootMargin` antecipa disparo; reobserva em `marcador` para não parar quando o conteúdo ainda cabe na viewport. */
export function useInfiniteScroll(
  carregarMais: () => void,
  ativo: boolean,
  marcador: unknown,
) {
  const alvo = useRef<HTMLDivElement>(null);
  const carregarMaisRef = useRef(carregarMais);
  carregarMaisRef.current = carregarMais;

  useEffect(() => {
    const elemento = alvo.current;
    if (!elemento || !ativo) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) carregarMaisRef.current();
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(elemento);
    return () => observer.disconnect();
  }, [ativo, marcador]);

  return alvo;
}
