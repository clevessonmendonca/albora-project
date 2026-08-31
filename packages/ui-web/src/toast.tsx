"use client";

import { useEffect, useState } from "react";
import { cn } from "./variants";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

const toasts = new Set<Toast>();
const listeners = new Set<(toasts: Toast[]) => void>();

function notifyListeners() {
  const arr = Array.from(toasts);
  listeners.forEach((listener) => listener(arr));
}

export function showToast(message: string, type: ToastType = "info", duration = 3000) {
  const id = Math.random().toString(36).slice(2);
  const toast: Toast = { id, message, type, duration };
  toasts.add(toast);
  notifyListeners();

  if (duration > 0) {
    setTimeout(() => {
      toasts.delete(toast);
      notifyListeners();
    }, duration);
  }

  return id;
}

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (t: Toast[]) => setCurrentToasts(t);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (currentToasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-inset-bottom,0px)+5.5rem)] z-50 flex flex-col items-center gap-2 px-4"
      role="region"
      aria-live="polite"
      aria-label="Notificações"
    >
      {currentToasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setVisible(true);
    });
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-auto rounded-pilula px-5 py-3.5 text-center font-corpo text-[0.9375rem] leading-[1.6] shadow-e2 transition-[opacity,transform] duration-[var(--tempo-rapido)] ease-[var(--curva)]",
        "motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        toast.type === "success" && "bg-acento text-tinta",
        toast.type === "error" && "bg-critico text-papel",
        toast.type === "info" && "bg-superficie text-ink",
      )}
      role="status"
    >
      {toast.message}
    </div>
  );
}
