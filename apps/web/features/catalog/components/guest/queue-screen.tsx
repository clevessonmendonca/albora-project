import { resolvePackText, type Pack } from "@albora/packs";
import {
  Badge,
  Frame,
  PrimaryButton,
  SecondaryButton,
  StatusBar,
} from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function QueueScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground background="dark" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">
          {resolvePackText(pack, "landing.exemplo.nome")}
        </span>
        <Badge>3 na fila</Badge>
      </div>

      <div className="relative mx-3 flex-1 overflow-hidden rounded-superficie">
        <Frame atmosphere variant={3} />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[2] grid place-items-end bg-noite-vidro p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="grid w-full max-w-[26rem] gap-3.5 rounded-superficie border border-linha bg-superficie p-5">
          <p className="m-0 font-titulo text-[1.0625rem]">Fila de envio</p>
          <p className="m-0 text-[0.875rem] leading-normal text-ink-2">
            Sem sinal — a gente reenvia sozinho quando voltar.
          </p>
          {[
            { tipo: "Foto", estado: "Enviando…" },
            { tipo: "Foto", estado: "Na fila · sem sinal" },
            { tipo: "Vídeo", estado: "Falhou · tentar de novo", falhou: true },
          ].map((linha) => (
            <div key={linha.estado} className="flex items-center gap-3 rounded-token bg-bg p-2">
              <span className="relative size-12 shrink-0 overflow-hidden rounded-[calc(var(--raio)*0.75)]">
                <Frame atmosphere variant={2} />
              </span>
              <span>
                <span className="block text-[0.875rem]">{linha.tipo}</span>
                <span className={`text-[0.75rem] ${linha.falhou ? "text-critico" : "text-ink-3"}`}>
                  {linha.estado}
                </span>
              </span>
            </div>
          ))}
          <div className="flex gap-2">
            <SecondaryButton>Fechar</SecondaryButton>
            <PrimaryButton>Tentar de novo</PrimaryButton>
          </div>
        </div>
      </div>
    </GuestBackground>
  );
}
