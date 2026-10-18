import { useEffect, useRef } from "react";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocoDoModal<T extends HTMLElement>(ativo = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const raiz = ref.current;
    if (!ativo || !raiz) return;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    raiz.focus({ preventScroll: true });

    function prender(ev: KeyboardEvent) {
      if (ev.key !== "Tab" || !raiz) return;
      const itens = [...raiz.querySelectorAll<HTMLElement>(FOCAVEIS)];
      if (itens.length === 0) {
        ev.preventDefault();
        return;
      }
      const primeiro = itens[0]!;
      const ultimo = itens[itens.length - 1]!;
      const atual = document.activeElement;
      if (ev.shiftKey && (atual === primeiro || atual === raiz)) {
        ev.preventDefault();
        ultimo.focus();
      } else if (!ev.shiftKey && atual === ultimo) {
        ev.preventDefault();
        primeiro.focus();
      }
    }

    raiz.addEventListener("keydown", prender);
    return () => {
      raiz.removeEventListener("keydown", prender);
      if (anterior && anterior.isConnected) anterior.focus({ preventScroll: true });
    };
  }, [ativo]);

  return ref;
}
