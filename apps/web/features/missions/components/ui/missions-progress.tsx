"use client";

import { ProgressBar } from "@albora/ui-web";

type MissionsProgressProps = {
  done: number;
  total: number;
};

/** Delega ao `ProgressBar` premium do design system — sem markup duplicado. */
export function MissionsProgress({ done, total }: MissionsProgressProps) {
  return (
    <ProgressBar
      current={done}
      total={total}
      label={`${done} de ${total} missões`}
      completedLabel="Todas completas"
    />
  );
}
