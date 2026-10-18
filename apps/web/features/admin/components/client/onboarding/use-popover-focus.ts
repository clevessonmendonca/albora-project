import { useEffect, useRef, type RefObject } from "react";

const FOCAVEL = "input, button, [href], select, textarea, [tabindex]:not([tabindex='-1'])";

export function usePopoverFocus(open: boolean, raiz: RefObject<HTMLElement | null>) {
  const abriu = useRef(false);
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    if (open) {
      abriu.current = true;
      el.querySelector('[role="dialog"]')?.querySelector<HTMLElement>(FOCAVEL)?.focus();
      return;
    }
    if (!abriu.current) return;
    abriu.current = false;
    const ativo = document.activeElement;
    if (!ativo || ativo === document.body || el.contains(ativo)) {
      el.querySelector<HTMLElement>("button")?.focus();
    }
  }, [open, raiz]);
}
