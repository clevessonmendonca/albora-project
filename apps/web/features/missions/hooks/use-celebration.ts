"use client";

import { useEffect, useState } from "react";

export function useCelebration(allDone: boolean) {
  const [celeb, setCeleb] = useState(allDone);

  useEffect(() => {
    if (!celeb) return;
    const t = setTimeout(() => setCeleb(false), 2800);
    return () => clearTimeout(t);
  }, [celeb]);

  return {
    celeb,
    dismiss: () => setCeleb(false),
  };
}
