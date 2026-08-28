"use client";

const CELEB_PARTICLES = ["⭐", "✨", "🌟", "💫"] as const;

export function CelebrationOverlay({ onDismiss }: { onDismiss: () => void }) {
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
          Todas as missões
          <br />
          completas!
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
