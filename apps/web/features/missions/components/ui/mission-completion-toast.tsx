"use client";

import Link from "next/link";
import { photoPathForMission } from "../../lib/missions-utils";

type MissionCompletionToastProps = {
  missionTitle: string;
  nextMissionTitle?: string;
  nextMissionId?: string;
  slug: string;
  milestone: "individual" | "halfway" | "all" | null;
  onDismiss: () => void;
  acimaDaNav?: boolean;
};

export function MissionCompletionToast({
  missionTitle,
  nextMissionTitle,
  nextMissionId,
  slug,
  milestone,
  onDismiss,
  acimaDaNav = true,
}: MissionCompletionToastProps) {
  const title =
    milestone === "all"
      ? "Todas as missões completas"
      : milestone === "halfway"
        ? "Metade das missões completas"
        : `${missionTitle} completa`;

  const posicao = acimaDaNav
    ? "bottom-[calc(var(--safe-inset-bottom,0px)+5.5rem)]"
    : "bottom-6";

  return (
    <>
      <style>{`
        @keyframes missaoToastEntra {
          from { opacity:0; transform:translate(-50%, 0.75rem) scale(0.96); }
          to   { opacity:1; transform:translate(-50%, 0) scale(1); }
        }
        .missao-toast-anima { animation: missaoToastEntra var(--tempo-lento) var(--mola) both; }
        @media (prefers-reduced-motion: reduce) {
          .missao-toast-anima { animation: none; }
        }
      `}</style>
      <div
        className={`missao-toast-anima fixed ${posicao} left-1/2 z-40 w-[calc(100%-2rem)] max-w-md elev-2 rounded-token border border-acento-borda bg-acento-superficie px-5 py-4`}
        role="status"
        aria-live="polite"
      >
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-2 grid size-8 cursor-pointer place-items-center rounded-token border-none bg-transparent text-ink-3 hover:text-ink"
          aria-label="Fechar"
        >
          ×
        </button>
        <p className="tipo-subtitle m-0 pr-6 text-ink">{title}</p>
        {nextMissionTitle && nextMissionId && milestone !== "all" && (
          <Link
            href={photoPathForMission(slug, nextMissionId)}
            onClick={onDismiss}
            className="tipo-caption mt-2 inline-block text-acento-texto no-underline hover:underline"
          >
            Próxima: {nextMissionTitle}
          </Link>
        )}
      </div>
    </>
  );
}
