"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useEventQueue } from "@/features/photo/hooks/use-event-queue";
import { QueueHeader } from "@/features/photo/components/client/queue-panel";

export function GlobalQueue({ eventoId }: { eventoId: string }) {
  const pathname = usePathname();
  const naCamera = pathname.endsWith("/photo") || pathname.includes("/photo/");
  const { pendentes, bytesPendentes, online, drenarAgora } = useEventQueue(eventoId);
  const [drenando, setDrenando] = useState(false);

  if (naCamera) return null;
  if (pendentes === 0 && online) return null;

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top)+0.625rem)] right-4 z-20">
      <QueueHeader
        eventoId={eventoId}
        pendentes={pendentes}
        bytesPendentes={bytesPendentes}
        online={online}
        drenando={drenando}
        onDrenar={async () => {
          setDrenando(true);
          try {
            await drenarAgora();
          } finally {
            setDrenando(false);
          }
        }}
      />
    </div>
  );
}
