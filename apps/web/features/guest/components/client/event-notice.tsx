import { AlboraLogo } from "./albora-logo";
import { RescueScanner } from "./rescue-scanner";
import { EventCountdown } from "./event-countdown";

/**
 * Entrada suave — uma vez, na curva-base (nunca a mola de press/overlay).
 * Mesmo padrão do resto do produto (`entry-flow.tsx`, `home-page.tsx`).
 */
const AVISO_MOTION_CSS = `
  @keyframes aviso-revela { from { opacity: 0; transform: translateY(0.75rem); } to { opacity: 1; transform: translateY(0); } }
  .aviso-anima { animation: aviso-revela var(--tempo-lento) var(--curva) both; }
  @media (prefers-reduced-motion: reduce) { .aviso-anima { animation: none !important; } }
`;

/** `showRescue` só entra em código desconhecido — em "já foi" e "ainda não começou" o endereço está certo e um scanner seria desorientador. */
export function EventNotice({
  title,
  body,
  at,
  showRescue,
}: {
  title: string;
  body: string;
  at?: Date | undefined;
  showRescue?: boolean | undefined;
}) {
  return (
    <main className="flex min-h-dvh justify-center bg-bg px-8 pb-9 pt-10 font-corpo text-ink">
      <style>{AVISO_MOTION_CSS}</style>
      <div className="flex w-full max-w-[26rem] flex-1 flex-col">
        <div className="shrink-0">
          <AlboraLogo />
        </div>

        <span className="min-h-6 flex-1" />

        <div className="aviso-anima">
          <h1 className="tipo-title tipo-balance m-0 mb-3.5 text-ink">{title}</h1>
          <p className="m-0 max-w-[34ch] tipo-body text-ink-2">{body}</p>

          {at && <EventCountdown at={at.toISOString()} />}
        </div>

        <span className="min-h-6 flex-1" />

        <div className="shrink-0">{showRescue && <RescueScanner />}</div>
      </div>
    </main>
  );
}
