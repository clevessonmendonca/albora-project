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
    <div
      className={`fixed ${posicao} left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-token border border-acento-borda bg-acento-superficie px-5 py-4 shadow-e2`}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-2 top-2 cursor-pointer border-none bg-transparent p-1 text-ink-3 hover:text-ink"
        aria-label="Fechar"
      >
        ×
      </button>
      <p className="m-0 pr-6 font-titulo text-base leading-snug tracking-titulo text-ink">{title}</p>
      {nextMissionTitle && nextMissionId && milestone !== "all" && (
        <Link
          href={photoPathForMission(slug, nextMissionId)}
          onClick={onDismiss}
          className="mt-2 inline-block text-[0.8125rem] text-acento-texto no-underline hover:underline"
        >
          Próxima: {nextMissionTitle}
        </Link>
      )}
    </div>
  );
}
