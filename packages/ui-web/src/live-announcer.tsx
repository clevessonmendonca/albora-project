"use client";

import { useEffect, useRef, useState } from "react";

const announceQueue: string[] = [];
const listeners = new Set<() => void>();

export function announce(message: string) {
  announceQueue.push(message);
  listeners.forEach((fn) => fn());
}

export function LiveAnnouncer() {
  const [current, setCurrent] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = () => {
      if (announceQueue.length === 0) return;
      const msg = announceQueue.shift();
      if (msg) {
        setCurrent(msg);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCurrent(""), 100);
      }
    };

    listeners.add(handler);
    return () => {
      listeners.delete(handler);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {current}
    </div>
  );
}
