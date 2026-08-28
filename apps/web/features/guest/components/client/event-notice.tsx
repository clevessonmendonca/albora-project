import { AlboraLogo } from "./albora-logo";
import { RescueScanner } from "./rescue-scanner";
import { EventCountdown } from "./event-countdown";

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
      <div className="flex w-full max-w-[26rem] flex-1 flex-col">
        <div className="shrink-0">
          <AlboraLogo />
        </div>

        <span className="min-h-6 flex-1" />

        <div>
          <h1 className="mb-3.5 font-titulo text-[clamp(1.6rem,7.6vw,1.9375rem)] font-medium leading-[1.14] tracking-titulo [text-wrap:balance]">
            {title}
          </h1>
          <p className="m-0 max-w-[34ch] text-[0.94rem] leading-[1.68] text-ink-2">{body}</p>

          {at && <EventCountdown at={at.toISOString()} />}
        </div>

        <span className="min-h-6 flex-1" />

        <div className="shrink-0">{showRescue && <RescueScanner />}</div>
      </div>
    </main>
  );
}
