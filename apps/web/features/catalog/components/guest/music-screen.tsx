import { TETO_DE_SUGESTOES_POR_SESSAO } from "@albora/core";
import { resolvePackText, type Pack } from "@albora/packs";
import { cn, Frame, PrimaryButton, StatusBar, TabBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export function MusicScreen({ pack }: { pack: Pack }) {
  return (
    <GuestBackground background="dark" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3.5">
        <span className="font-titulo text-[1.125rem] tracking-titulo">Música da festa</span>
      </div>

      <div className="grid flex-1 content-start gap-4 overflow-y-auto px-[1.125rem] pb-4">
        <div className="relative mx-auto aspect-square w-full max-w-48 overflow-hidden rounded-superficie">
          <Frame atmosphere variant={5} />
        </div>
        <p className="m-0 text-center font-titulo text-[1.125rem]">Perfect — Ed Sheeran</p>
        <p className="m-0 text-center text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
          {resolvePackText(pack, "musica.escolha")}
        </p>
        <div className="flex h-8 items-end justify-center gap-[3px]">
          {Array.from({ length: 16 }, (_, i) => (
            <span
              key={i}
              className={cn(
                "w-[3px] rounded-pilula bg-acento",
                ["h-[40%]", "h-[52%]", "h-[64%]", "h-[76%]", "h-[88%]"][i % 5],
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-center gap-4">
          <span className="grid size-12 place-items-center rounded-full bg-acento text-sobre-acento">
            ▶
          </span>
          <span className="text-[0.85rem] text-ink-3">—:——</span>
        </div>

        <section className="grid gap-3 border-t border-linha pt-4">
          <p className="m-0 font-titulo text-base">Pedidos da festa</p>
          <p className="m-0 text-[0.8125rem] leading-relaxed text-ink-2">
            Cole o link da faixa. Até {TETO_DE_SUGESTOES_POR_SESSAO} faixas novas por pessoa.
          </p>
          <span className="min-h-11 rounded-token border border-linha bg-superficie px-3.5 text-[0.85rem] leading-[2.75rem] text-ink-3">
            https://open.spotify.com/track/…
          </span>
          <PrimaryButton disabled>Sugerir</PrimaryButton>
          <div className="flex items-center justify-between gap-3 rounded-token border border-linha bg-superficie px-3.5 py-3">
            <span className="min-w-0">
              <span className="block truncate text-[0.85rem]">Spotify · faixa</span>
              <span className="text-[0.75rem] text-ink-3">3 votos</span>
            </span>
            <span className="shrink-0 text-[0.75rem] uppercase tracking-rotulo text-acento">
              Também quero
            </span>
          </div>
        </section>
      </div>

      <TabBar active="feed" />
    </GuestBackground>
  );
}
