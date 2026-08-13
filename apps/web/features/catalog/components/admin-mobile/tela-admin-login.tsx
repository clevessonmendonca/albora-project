import type { Pack } from "@albora/packs";
import { Button, StatusBar } from "@albora/ui-web";
import { ChaoClaro } from "@/features/catalog/lib/chao-claro";

export function TelaAdminLogin({ pack }: { pack: Pack }) {
  return (
    <ChaoClaro pack={pack}>
      <StatusBar />

      <div className="flex flex-1 flex-col justify-center gap-6 px-7 pb-16">
        <div>
          <p className="text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
            Albora · anfitrião
          </p>
          <p className="mt-3 font-titulo text-[1.875rem] font-light leading-tight tracking-titulo">
            Entre pra ver sua festa
          </p>
          <p className="mt-2 text-[0.9375rem] text-ink-2">
            Sem senha. A gente manda um link no seu e-mail.
          </p>
        </div>

        <div className="rounded-token border-b-2 border-acento bg-superficie px-4 py-3.5 text-[0.9375rem] text-ink-3">
          voce@email.com
        </div>

        <Button width="full">Enviar o link</Button>

        <p className="text-center text-[0.75rem] text-ink-3">
          Chega em segundos. Se cair no spam, o link é o mesmo.
        </p>
      </div>
    </ChaoClaro>
  );
}
