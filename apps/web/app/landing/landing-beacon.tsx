"use client";

import { useEffect } from "react";
import { fireLandingProduct } from "./landing-product";

/** Best-effort landing funnel. Falha engolida. */
export function LandingBeacon({ packHint }: { packHint?: string }) {
  useEffect(() => {
    fireLandingProduct("landing_view", packHint);
  }, [packHint]);

  useEffect(() => {
    let fired = false;
    const onScroll = () => {
      if (fired) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= 0.5) {
        fired = true;
        fireLandingProduct("landing_scroll_50", packHint);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [packHint]);

  return null;
}
