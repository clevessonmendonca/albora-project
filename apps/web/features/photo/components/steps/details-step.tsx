"use client";

import { useState } from "react";
import { SecondaryButton } from "@albora/ui-web";

type DetailsStepProps = {
  arquivo: File;
  uploadId: string;
  onConfirm: (details: { legenda?: string; lugar?: string }) => void;
  onBack: () => void;
  isSubmitting?: boolean;
};

/**
 * Etapa de detalhes da foto (legenda e lugar).
 * Permite adicionar contexto opcional à foto.
 */
export function DetailsStep({
  arquivo,
  uploadId,
  onConfirm,
  onBack,
  isSubmitting = false,
}: DetailsStepProps) {
  const [legenda, setLegenda] = useState("");
  const [lugar, setLugar] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      legenda: legenda.trim() || undefined,
      lugar: lugar.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <h2 className="font-titulo text-[1.2rem] font-normal">
        Adicionar detalhes
      </h2>

      <p className="text-[0.85rem] text-ink-2">
        Upload ID: {uploadId.slice(0, 8)}...
      </p>

      <div className="grid gap-3">
        <label className="grid gap-1.5">
          <span className="text-[0.9rem] text-ink-2">Legenda (opcional)</span>
          <input
            type="text"
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
            placeholder="Descreva o momento..."
            maxLength={280}
            className="min-h-12 rounded-superficie border border-linha bg-superficie px-4 text-[0.9rem] text-ink outline-none transition-colors focus:border-acento"
            disabled={isSubmitting}
          />
          <span className="text-[0.75rem] text-ink-3">
            {legenda.length}/280
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className="text-[0.9rem] text-ink-2">Lugar (opcional)</span>
          <input
            type="text"
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            placeholder="Onde foi tirada..."
            maxLength={100}
            className="min-h-12 rounded-superficie border border-linha bg-superficie px-4 text-[0.9rem] text-ink outline-none transition-colors focus:border-acento"
            disabled={isSubmitting}
          />
        </label>
      </div>

      <div className="grid gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-12 cursor-pointer rounded-pilula border-none bg-acento px-6 text-[0.9rem] font-medium text-sobre-acento transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Enviando..." : "Finalizar"}
        </button>

        <SecondaryButton onClick={onBack} disabled={isSubmitting}>
          Voltar
        </SecondaryButton>
      </div>
    </form>
  );
}
