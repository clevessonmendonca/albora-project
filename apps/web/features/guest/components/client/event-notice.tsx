import { AlboraLogo } from "./albora-logo";
import { RescueScanner } from "./rescue-scanner";

/**
 * Saída com dignidade.
 *
 * Todo estado que não abre a festa passa por aqui, e nenhum deles é um erro
 * do convidado. Ele escaneou um QR numa mesa: a tela diz o que aconteceu e
 * qual é o próximo passo, sem código de erro e sem culpa.
 *
 * `resgate` liga o campo de código e o escaneamento. Só entra onde a pessoa
 * está no endereço **errado** — código desconhecido e slug rotacionado. Em
 * "já foi" e "ainda não começou" o código está certo, e oferecer um scanner
 * ali seria mentir sobre o que resolve o problema.
 */
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

          {at && (
            <p className="mt-6 font-titulo text-[0.78rem] font-normal uppercase tracking-[0.2em] text-acento-texto">
              {at.toLocaleString("pt-BR", {
                day: "2-digit",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        <span className="min-h-6 flex-1" />

        <div className="shrink-0">{showRescue && <RescueScanner />}</div>
      </div>
    </main>
  );
}
