"use client";

import React from "react";
import { FUSO_PADRAO, FUSOS_DO_EVENTO } from "@albora/core";

export function TimezoneField({
  value,
  onChange,
}: {
  value: string;
  onChange: (fuso: string) => void;
}) {
  const extra =
    FUSOS_DO_EVENTO.some((f) => f.id === value) || value === ""
      ? []
      : [{ id: value, rotulo: value }];

  return (
    <label className="flex flex-col gap-1.5 text-[0.9rem] text-ink-2">
      Fuso horário
      <select
        value={value || FUSO_PADRAO}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-token border border-linha bg-bg px-3.5 py-3 text-base text-ink"
      >
        {extra.map((f) => (
          <option key={f.id} value={f.id}>
            {f.rotulo}
          </option>
        ))}
        {FUSOS_DO_EVENTO.map((f) => (
          <option key={f.id} value={f.id}>
            {f.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}
