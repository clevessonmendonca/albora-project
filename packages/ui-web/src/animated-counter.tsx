"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedCounter({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const prev = prevValueRef.current;
    const diff = value - prev;

    if (diff === 0) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const duration = 300;
    const steps = Math.min(Math.abs(diff), 10);
    const stepDuration = duration / steps;
    const stepValue = diff / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const nextValue = prev + Math.round(stepValue * currentStep);

      if (currentStep >= steps) {
        setDisplayValue(value);
        prevValueRef.current = value;
        clearInterval(interval);
      } else {
        setDisplayValue(nextValue);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [value]);

  return <span className={className}>{displayValue}</span>;
}
