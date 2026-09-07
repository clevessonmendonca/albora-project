"use client";

import React from "react";
import { FUSO_PADRAO, FUSOS_DO_EVENTO } from "@albora/core";
import { Select } from "@albora/ui-web";

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
    <Select label="Fuso horário" value={value || FUSO_PADRAO} onChange={(e) => onChange(e.target.value)}>
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
    </Select>
  );
}
