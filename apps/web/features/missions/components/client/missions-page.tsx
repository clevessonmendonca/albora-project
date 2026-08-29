"use client";

import Link from "next/link";
import { Badge, FloatingNav, GuestHeader, GuestMain, GuestShell, LiveAnnouncer, SkipLink } from "@albora/ui-web";
import { useMissionsProgress } from "../../hooks/use-missions-progress";
import { useCelebration } from "../../hooks/use-celebration";
import { useMissionCompletionToast } from "../../hooks/use-mission-completion-toast";
import { photoPathForMission, toRoman, turnIndex } from "../../lib/missions-utils";
import {
  MissionsProgress,
  FreeModeState,
  MissionItem,
  CompletedList,
  CelebrationOverlay,
  CameraButton,
  MissionsBadge,
  MissionCompletionToast,
} from "../ui";

export type VisibleMission = { id: string; title: string; done: boolean; emoji?: string | null };

export function MissionsPage({
  slug,
  missions,
}: {
  slug: string;
  missions: VisibleMission[];
}) {
  const base = `/e/${encodeURIComponent(slug)}`;
  const { doneCount, allDone, current, summary } = useMissionsProgress(missions);
  const { celeb, dismiss } = useCelebration(allDone);
  const completion = useMissionCompletionToast(missions);

  return (
    <>
      <SkipLink />
      <LiveAnnouncer />
      {celeb && <CelebrationOverlay onDismiss={dismiss} />}
      {completion.event && !celeb && (
        <MissionCompletionToast
          missionTitle={completion.event.mission.title}
          milestone={completion.event.milestone}
          slug={slug}
          onDismiss={completion.dismiss}
          {...(completion.event.nextMission
            ? {
                nextMissionTitle: completion.event.nextMission.title,
                nextMissionId: completion.event.nextMission.id,
              }
            : {})}
        />
      )}
      <GuestShell>
        <GuestMain>
          <GuestHeader
            title="Missões"
            homeHref={`/e/${encodeURIComponent(slug)}/cover`}
            action={
              missions.length > 0 ? (
                <MissionsBadge done={doneCount} total={missions.length} />
              ) : (
                <Badge tone="outline">{summary}</Badge>
              )
            }
          />

          {missions.length > 0 && <MissionsProgress done={doneCount} total={missions.length} />}

          {missions.length === 0 ? (
            <FreeModeState slug={slug} />
          ) : current ? (
            <>
              <Link
                href={photoPathForMission(slug, current.id)}
                className="grid gap-3 rounded-token border border-acento-borda bg-acento-superficie-forte p-6 text-inherit no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90"
              >
                <span className="text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
                  Missão {toRoman(turnIndex(missions))}
                </span>
                <span className="font-titulo text-[1.375rem] leading-[1.15] tracking-titulo">
                  {current.emoji ? `${current.emoji} ` : ""}
                  {current.title}
                </span>
                <span className="text-[0.8125rem] text-ink-2">Toque para fotografar</span>
              </Link>

              <div className="mt-6 grid gap-2">
                <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
                  Outras missões
                </p>
                <ul className="m-0 grid list-none gap-2 p-0">
                  {missions.map((mission, i) => (
                    <li key={mission.id}>
                      <MissionItem
                        slug={slug}
                        mission={mission}
                        index={i + 1}
                        highlighted={mission.id === current.id}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 py-8 text-center">
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-acento text-[1.75rem] text-sobre-acento">
                  ✓
                </div>
                <div>
                  <p className="m-0 font-titulo text-[1.5rem] leading-[1.2] tracking-titulo text-ink">
                    Todas as {missions.length} missões completas!
                  </p>
                  <p className="m-0 mt-2 text-[0.9375rem] leading-relaxed text-ink-3">
                    Agora você pode fotografar o que quiser, sem restrições.
                  </p>
                </div>
              </div>
              <CameraButton slug={slug} label="Abrir câmera livre" />
              <CompletedList slug={slug} missions={missions} />
            </>
          )}

          {current && (
            <div className="mt-6 border-t border-linha pt-4">
              <CameraButton slug={slug} label="Fotografar sem missão" />
            </div>
          )}
        </GuestMain>
      </GuestShell>

      <FloatingNav active="missoes" base={base} linkComponent={Link} />
    </>
  );
}
