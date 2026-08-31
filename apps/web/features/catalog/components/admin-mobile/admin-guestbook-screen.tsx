import { MAX_AUDIO_SECONDS } from "@albora/core";
import { resolvePackText, type Pack } from "@albora/packs";
import { StatusBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { AdminNav } from "@/features/catalog/components/admin-nav";

export function AdminGuestbookScreen({ pack }: { pack: Pack }) {
  const texto = resolvePackText(pack, "recado.exemplo");
  const rotulo = resolvePackText(pack, "recado.rotulo");

  return (
    <GuestBackground background="light" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">{rotulo}</p>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <p className="mb-4 mt-0 text-[0.8125rem] leading-relaxed text-ink-2">
          O texto é o corpo. Cada convidado vê uma vez, no horário que vocês escolherem.
        </p>

        <p className="mb-1.5 mt-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">Texto</p>
        <div className="mb-4 min-h-24 rounded-token border border-linha bg-bg px-3.5 py-3 text-[0.9rem] leading-relaxed text-ink">
          {texto}
        </div>

        <p className="mb-1.5 mt-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
          Áudio (opcional)
        </p>
        <p className="mb-3 mt-0 text-[0.75rem] text-ink-3">Até {MAX_AUDIO_SECONDS} s.</p>
        <span className="mb-3 flex items-start gap-2 text-[0.8125rem] text-ink-2">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[0.375rem] border border-acento bg-acento text-[0.6875rem] text-sobre-acento">
            ✓
          </span>
          Esta gravação é da nossa voz, sem música de terceiro.
        </span>
        <div className="mb-3 flex gap-2">
          <span className="inline-flex rounded-pilula border border-linha px-4 py-2 text-[0.8125rem] text-ink">
            Gravar
          </span>
          <span className="inline-flex rounded-pilula border border-linha px-4 py-2 text-[0.8125rem] text-ink">
            Anexar
          </span>
        </div>
        <div className="mb-4 flex items-center gap-2 rounded-token bg-superficie px-3 py-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-acento text-[0.65rem] text-sobre-acento">
            ▶
          </span>
          <span className="text-[0.75rem] tabular-nums text-ink-3">0:18</span>
        </div>

        <p className="mb-1.5 mt-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
          Aparece a partir de
        </p>
        <div className="rounded-token border border-linha bg-bg px-3.5 py-3 text-[0.9rem] text-ink">
          8 de novembro, 20:00
        </div>
      </div>

      <div className="px-[1.125rem] pb-3">
        <span className="flex min-h-12 items-center justify-center rounded-pilula bg-acento font-semibold text-sobre-acento">
          Salvar recado
        </span>
      </div>

      <AdminNav active="more" />
    </GuestBackground>
  );
}
