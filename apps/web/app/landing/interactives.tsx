"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/** Começa visível e JS esconde (spec 013 check 2); desconecta ao revelar; reduced-motion no JS — sem isso o elemento começaria em `opacity:0` até o observer disparar (blink em Android lento). */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const target = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = target.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setVisible(false);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={target}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(1.25rem)",
        transitionProperty: "opacity, transform",
        transitionDuration: "var(--tempo-lento)",
        transitionTimingFunction: "var(--curva)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
