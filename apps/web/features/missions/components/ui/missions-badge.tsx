"use client";

import React from "react";
import { Badge } from "@albora/ui-web";

type MissionsBadgeProps = {
  done: number;
  total: number;
  variant?: "default" | "compact";
};

export function MissionsBadge({ done, total, variant = "default" }: MissionsBadgeProps) {
  if (total === 0) return null;

  const allDone = done === total;
  const tone = allDone ? "accent" : "outline";
  const label = `${done} de ${total} missões completas`;

  return (
    <Badge tone={tone} aria-label={label}>
      {variant === "compact"
        ? `${done}/${total}`
        : allDone
          ? `${total} missões`
          : `${done}/${total} missões`}
    </Badge>
  );
}
