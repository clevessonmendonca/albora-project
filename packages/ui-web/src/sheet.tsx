"use client";

import type { ReactNode } from "react";
import { Dialog } from "./dialog";

export function BottomSheet({
  title,
  open,
  onClose,
  children,
  footer,
  titleId,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  titleId?: string;
}) {
  const headingId = titleId ?? "sheet-title";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={headingId}
      className="place-items-end pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      <div
        className="grid max-h-[min(78dvh,32rem)] w-[min(26rem,100%)] grid-rows-[auto_1fr_auto] gap-3.5 overflow-hidden rounded-superficie border border-linha bg-superficie p-5"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id={headingId} className="m-0 font-titulo text-[1.0625rem] font-normal">
          {title}
        </h2>
        <div className="min-h-0 overflow-auto">{children}</div>
        {footer}
      </div>
    </Dialog>
  );
}
