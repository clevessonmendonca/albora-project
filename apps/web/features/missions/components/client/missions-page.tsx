"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Badge,
  FloatingNav,
  GuestHeader,
  GuestMain,
  GuestShell,
  PrimaryButton,
  Star,
} from "@albora/ui-web";

export type VisibleMission = { id: string; title: string; done: boolean; emoji?: string | null };

function turnIndex(missions: readonly VisibleMission[]): number {
  const open = missions.findIndex((m) => !m.done);
  if (open >= 0) return open + 1;
  return missions.length;
}

const ROMANOS = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
] as const;

function toRoman(n: number): string {
  let resto = n;
  let resultado = "";
  for (const [valor, simbolo] of ROMANOS) {
    while (resto >= valor) {
      resultado += simbolo;
      resto -= valor;
    }
  }
  return resultado;
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
  const allDone = missions.length > 0 && doneCount === missions.length;
  const current = missions.find((m) => !m.done) ?? null;
  const index = turnIndex(missions);
  const [celeb, setCeleb] = useState(allDone);

  useEffect(() => {
    if (!celeb) return;
    const t = setTimeout(() => setCeleb(false), 2800);
    return () => clearTimeout(t);
  }, [celeb]);

  const summary =
    missions.length === 0
      ? "Modo livre"
      : doneCount === missions.length
        ? `${missions.length} de ${missions.length}`
        : `${index} de ${missions.length}`;

  return (
    <>
      {celeb && <CelebrationOverlay onDismiss={() => setCeleb(false)} />}
      <GuestShell>
        <GuestMain>
          <GuestHeader
            title="Missões"
            homeHref={`/e/${encodeURIComponent(slug)}/cover`}
            action={<Badge>{summary}</Badge>}
          />

          {missions.length > 0 && (
            <MissionsProgress done={doneCount} total={missions.length} />
          )}

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
                  {current.emoji ? `${current.emoji} ` : ""}{current.title}
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

function MissionsProgress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const concluidas = done === total;
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex justify-between text-xs text-ink-3">
        <span>{done === total ? "Todas completas" : `${done} de ${total} missões`}</span>
        <span className={concluidas ? "text-acento-texto" : ""}>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-superficie-alta">
        <div
          className="h-full rounded-full transition-all duration-700 ease-[var(--curva)]"
          style={{
            width: `${pct}%`,
            background: concluidas ? "var(--acento)" : "var(--ink-2)",
          }}
        />
      </div>
    </div>
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
        {missions.map((mission, i) => (
          <li key={mission.id}>
            <MissionItem slug={slug} mission={mission} index={i + 1} highlighted={false} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MissionItem({
  slug,
  mission,
  index,
  highlighted,
}: {
  slug: string;
  mission: VisibleMission;
  index: number;
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
        <span className="block font-titulo text-base leading-[1.25]">
          {mission.emoji ? `${mission.emoji} ` : ""}{mission.title}
        </span>
        <span className="text-[0.75rem] text-ink-3">
          {mission.done ? "Feita" : `Missão ${toRoman(index)}`}
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
    <Link href={photoPathForMission(slug, mission.id)} className={`${shellClass} text-inherit no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta`}>
      {body}
    </Link>
  );
}

const CELEB_PARTICLES = ["⭐", "✨", "🌟", "💫"] as const;

function CelebrationOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <>
      <style>{`
        @keyframes celebFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes celebFadeOut { from { opacity:1 } to { opacity:0 } }
        @keyframes celebBounce { 0%,100% { transform:scale(1) } 50% { transform:scale(1.18) } }
        @keyframes celebFloat {
          from { transform:translateY(0) rotate(var(--celeb-r)); opacity:1 }
          to { transform:translateY(-75vh) rotate(calc(var(--celeb-r) + 200deg)); opacity:0 }
        }
        .celeb-overlay { animation:celebFadeIn .25s var(--curva) forwards, celebFadeOut .4s var(--curva) 2.35s forwards }
        .celeb-icon { animation:celebBounce .55s var(--curva) .2s both }
        .celeb-particle { animation:celebFloat var(--celeb-dur,1.8s) var(--curva) var(--celeb-delay,0s) both }
      `}</style>
      <button
        type="button"
        aria-label="Fechar celebração"
        onClick={onDismiss}
        className="celeb-overlay fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-bg/90 text-center"
      >
        <span className="celeb-icon text-[3.75rem]">🎉</span>
        <p className="mt-4 font-titulo text-[1.5rem] leading-[1.2] tracking-titulo text-ink">
          Todas as missões<br />completas!
        </p>
        <p className="mt-2 text-[0.875rem] text-ink-3">Toque para continuar</p>
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className="celeb-particle pointer-events-none fixed text-[1.25rem]"
            style={{
              left: `${8 + (i * 7.5) % 84}%`,
              bottom: `${4 + (i * 9) % 22}%`,
              "--celeb-r": `${(i * 31) % 360}deg`,
              "--celeb-dur": `${(1.5 + (i * 0.18) % 1.1).toFixed(2)}s`,
              "--celeb-delay": `${((i * 0.11) % 0.7).toFixed(2)}s`,
            } as React.CSSProperties}
          >
            {CELEB_PARTICLES[i % 4]}
          </span>
        ))}
      </button>
    </>
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
