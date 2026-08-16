import { resolvePackText, type Pack } from "@albora/packs";
import { Avatar, Button, StatusBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

function VoiceNote({ seconds = 18 }: { seconds?: number }) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-acento text-[0.65rem] text-sobre-acento">
        ▶
      </span>
      <span className="text-[0.75rem] text-ink-3">
        {m}:{s}
      </span>
    </div>
  );
}

export function HostMessagePreview({ pack, texto }: { pack: Pack; texto: string }) {
  return (
    <div className="mx-[1.125rem] mt-4 mb-1 flex items-start gap-3 rounded-token bg-superficie px-4 py-3.5">
      <Avatar name={resolvePackText(pack, "landing.exemplo.nome")} />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[0.625rem] uppercase tracking-rotulo text-acento-texto">
          {resolvePackText(pack, "recado.rotulo")}
        </p>
        <VoiceNote />
        <p className="mb-0 mt-1.5 text-[0.84375rem] leading-snug text-ink">{texto}</p>
      </div>
      <span className="text-[0.75rem] text-ink-3">Seguir</span>
    </div>
  );
}

export function HostMessageScreen({ pack }: { pack: Pack }) {
  const texto = resolvePackText(pack, "recado.exemplo");

  return (
    <GuestBackground background="dark" pack={pack}>
      <StatusBar />

      <div className="flex min-h-0 flex-1 flex-col px-[1.125rem] pt-8">
        <p className="m-0 text-[0.625rem] uppercase tracking-rotulo text-acento-texto">
          {resolvePackText(pack, "recado.rotulo")}
        </p>
        <VoiceNote seconds={18} />
        <p className="mt-4 font-titulo text-[1.75rem] font-light leading-tight tracking-titulo">
          {texto}
        </p>
        <p className="mt-3 text-[0.8125rem] leading-snug text-ink-2">
          No salão a música é alta — o texto é o corpo. O áudio emociona quem tem fone, ou quem
          abre no dia seguinte.
        </p>
        <div className="mt-auto mb-8">
          <Button width="full">Seguir</Button>
        </div>
      </div>
    </GuestBackground>
  );
}
