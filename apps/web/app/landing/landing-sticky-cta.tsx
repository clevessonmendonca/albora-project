"use client";

import { useEffect, useState } from "react";
import { cn } from "@albora/ui-web";
import { LandingCtaLink } from "./landing-cta-link";
import { pillClasses } from "./pieces";

/** CTA fixo mobile após scroll — apenas tokens, sem hex. */
export function LandingStickyCta({
  href,
  packHint,
  label,
}: {
  href: string;
  packHint: string;
  label: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const threshold = window.innerHeight * 0.4;
      setVisible(scrolled > threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "cta-fixo fixed bottom-3 left-3 right-3 z-[70] gap-3 rounded-pilula bg-ink p-2.5 pl-5",
        "transition-all duration-[600ms]",
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none",
      )}
      style={{
        transitionTimingFunction: "var(--curva)",
      }}
    >
      <span className="flex-1 text-[0.84375rem] leading-[1.3] text-bg">
        Montar é grátis. Leva 3 minutos.
      </span>
      <LandingCtaLink
        href={href}
        packHint={packHint}
        className={cn(pillClasses, "bg-bg px-[1.375rem] py-3 text-ink")}
      >
        {label}
      </LandingCtaLink>
    </div>
  );
}
