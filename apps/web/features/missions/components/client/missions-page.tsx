"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  FloatingNav,
  GuestHeader,
  GuestMain,
  GuestShell,
  PrimaryButton,
  Star,
} from "@albora/ui-web";

export type VisibleMission = { id: string; title: string; done: boolean };

function turnIndex(missions: readonly VisibleMission[]): number {
  const open = missions.findIndex((m) => !m.done);
  if (open >= 0) return open + 1;
  return missions.length;
}

function photoPathForMission(slug: string, missionId: string | null): string {
  const base = `/e/${encodeURIComponent(slug)}/photo`;
  if (!missionId) return base;
  return `${base}?missao=${encodeURIComponent(missionId)}`;
}

export function MissionsPage({
  slug,
  missions,
}: {
  slug: string;
  missions: VisibleMission[];
}) {
  const base = `/e/${encodeURIComponent(slug)}`;
  const doneCount = missions.filter((m) => m.done).length;
  const current = missions.find((m) => !m.done) ?? null;
  const index = turnIndex(missions);
  const summary =
    missions.length === 0
      ? "Modo livre"
      : doneCount === missions.length
        ? `${missions.length} de ${missions.length}`
        : `${index} de ${missions.length}`;

  return (
    <>
      <GuestShell>
        <GuestMain>
          <GuestHeader
            title="Missões"
            homeHref={`/e/${encodeURIComponent(slug)}/cover`}
            action={<Badge>{summary}</Badge>}
          />

          {missions.length === 0 ? (
            <FreeModeState slug={slug} />
          ) : current ? (
            <>
              <Link
                href={photoPathForMission(slug, current.id)}
                className="grid gap-3 rounded-token border border-acento-borda bg-acento-superficie-forte p-6 text-inherit no-underline"
              >
                <span className="text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
                  Missão de agora
                </span>
                <span className="font-titulo text-[1.375rem] leading-[1.15] tracking-titulo">
                  {current.title}
                </span>
                <span className="text-[0.8125rem] text-ink-2">Toque para fotografar</span>
              </Link>

              <div className="mt-6 grid gap-2">
                <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
                  Outras missões
                </p>
                <ul className="m-0 grid list-none gap-2 p-0">
                  {missions.map((mission) => (
                    <li key={mission.id}>
                      <MissionItem
                        slug={slug}
                        mission={mission}
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
            <div className="mt-6 pt-4 border-t border-linha">
              <CameraButton slug={slug} label="Fotografar sem missão" />
            </div>
          )}
        </GuestMain>
      </GuestShell>

      <FloatingNav active="missoes" base={base} linkComponent={Link} />
    </>
  );
}

function FreeModeState({ slug }: { slug: string }) {
  return (
    <>
      <div className="grid gap-4 py-8 text-center">
        <p className="m-0 font-titulo text-[1.5rem] leading-[1.2] tracking-titulo text-ink">
          Modo livre
        </p>
        <p className="m-0 text-[0.9375rem] leading-relaxed text-ink-3">
          Este evento não tem missões. Fotografe o que quiser e envie para o álbum da festa.
        </p>
      </div>
      <CameraButton slug={slug} label="Abrir a câmera" />
    </>
  );
}

function CompletedList({
  slug,
  missions,
}: {
  slug: string;
  missions: readonly VisibleMission[];
}) {
  return (
    <div className="mt-8 grid gap-2">
      <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
        Missões completadas
      </p>
      <ul className="m-0 grid list-none gap-2 p-0">
        {missions.map((mission) => (
          <li key={mission.id}>
            <MissionItem slug={slug} mission={mission} highlighted={false} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MissionItem({
  slug,
  mission,
  highlighted,
}: {
  slug: string;
  mission: VisibleMission;
  highlighted: boolean;
}) {
  const icon = (
    <span
      className={[
        "grid size-10 flex-none place-items-center rounded-token border",
        mission.done
          ? "border-acento bg-superficie-alta"
          : "border-linha bg-superficie",
      ].join(" ")}
    >
      <Star size={18} filled={mission.done} />
    </span>
  );

  const body = (
    <>
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block font-titulo text-base leading-[1.25]">{mission.title}</span>
        <span className="text-[0.75rem] text-ink-3">
          {mission.done ? "Feita" : highlighted ? "Agora" : "Aberta"}
        </span>
      </span>
    </>
  );

  const shellClass = [
    "flex w-full items-center gap-3.5 rounded-token border px-4 py-3.5 text-left",
    highlighted && !mission.done
      ? "border-linha bg-superficie-alta"
      : "border-transparent bg-superficie",
  ].join(" ");

  if (mission.done) {
    return (
      <div className={`${shellClass} text-ink-2`} aria-disabled>
        {body}
      </div>
    );
  }

  return (
    <Link href={photoPathForMission(slug, mission.id)} className={`${shellClass} text-inherit no-underline`}>
      {body}
    </Link>
  );
}

function CameraButton({
  slug,
  label,
  missionId = null,
}: {
  slug: string;
  label: string;
  missionId?: string | null;
}) {
  const router = useRouter();
  return (
    <PrimaryButton onClick={() => router.push(photoPathForMission(slug, missionId ?? null))}>
      {label}
    </PrimaryButton>
  );
}
