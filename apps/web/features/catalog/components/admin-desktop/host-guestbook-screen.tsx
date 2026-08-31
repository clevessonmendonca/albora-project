import { MAX_AUDIO_SECONDS, MAX_TEXT_CHARACTERS } from "@albora/core";
import { resolvePackText, type Pack } from "@albora/packs";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { HostSidebar } from "@/features/catalog/components/host-sidebar";

export function HostGuestbookScreen({ pack }: { pack: Pack }) {
  const texto = resolvePackText(pack, "recado.exemplo");
  const rotulo = resolvePackText(pack, "recado.rotulo");

  return (
    <GuestBackground background="light" pack={pack}>
      <div className="flex h-full">
        <HostSidebar pack={pack} active="Recado" />

        <main className="flex-1 overflow-hidden px-8 py-7">
          <p className="m-0 font-titulo text-[1.875rem] font-light tracking-titulo">{rotulo}</p>
          <p className="mb-5 mt-3 max-w-[52ch] text-[0.875rem] leading-normal text-ink-2">
            O texto é o corpo: no salão a música é alta, e um recado só em áudio some. Cada
            convidado vê uma vez, no horário que vocês escolherem.
          </p>

          <div className="flex max-w-[36rem] flex-col gap-5">
            <label className="flex flex-col gap-1.5 text-[0.8125rem] text-ink-2">
              Texto
              <span className="min-h-28 rounded-token border border-linha bg-bg px-3.5 py-3 text-[0.9375rem] leading-relaxed text-ink">
                {texto}
              </span>
              <span className="text-[0.75rem] text-ink-3">
                {texto.length} / {MAX_TEXT_CHARACTERS}
              </span>
            </label>

            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-1.5 text-[0.8125rem] text-ink-2">Áudio (opcional)</legend>
              <p className="m-0 mb-3 text-[0.75rem] text-ink-3">
                Até {MAX_AUDIO_SECONDS} s. O áudio emociona quem tem fone, ou quem abre no dia
                seguinte.
              </p>
              <span className="mb-3 flex items-start gap-2 text-[0.84375rem] text-ink-2">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[0.375rem] border border-acento bg-acento text-[0.6875rem] text-sobre-acento">
                  ✓
                </span>
                Esta gravação é da nossa voz, sem música de terceiro.
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-pilula border border-linha px-5 py-2.5 text-[0.875rem] text-ink">
                  Gravar
                </span>
                <span className="inline-flex rounded-pilula border border-linha px-5 py-2.5 text-[0.875rem] text-ink">
                  Anexar arquivo
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-token bg-superficie-alta px-3 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-acento text-[0.65rem] text-sobre-acento">
                  ▶
                </span>
                <span className="h-1 flex-1 rounded-pilula bg-linha">
                  <span className="block h-1 w-2/5 rounded-pilula bg-acento" />
                </span>
                <span className="text-[0.75rem] tabular-nums text-ink-3">0:18</span>
              </div>
            </fieldset>

            <label className="flex flex-col gap-1.5 text-[0.8125rem] text-ink-2">
              Aparece a partir de
              <span className="rounded-token border border-linha bg-bg px-3.5 py-3 text-[0.9375rem] text-ink">
                8 de novembro, 20:00
              </span>
              <span className="text-[0.75rem] text-ink-3">
                Sem horário, nenhum convidado vê. O recado espera vocês marcarem.
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-pilula bg-acento px-7 py-3 font-semibold text-sobre-acento">
                Salvar recado
              </span>
              <span className="inline-flex rounded-pilula border border-linha px-6 py-3 text-ink-2">
                Salvar e publicar agora
              </span>
            </div>
          </div>
        </main>
      </div>
    </GuestBackground>
  );
}
