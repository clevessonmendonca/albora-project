import type { ModeloDeTelao } from "@albora/core";
import { texto, type Pack } from "@albora/packs";
import { cn } from "@albora/ui-web";
import {
  Enquadramento,
  nomeDoModelo,
  notaDoModelo,
  perfilEmPalavrasTelao as perfilEmPalavras,
} from "@/features/catalog/components/wall/enquadramento";
import { ChaoConvidado } from "@/features/catalog/lib/chao-convidado";

export { Enquadramento, nomeDoModelo, notaDoModelo, perfilEmPalavras };

export function TelaTelao({ pack, modelo }: { pack: Pack; modelo: ModeloDeTelao }) {
  const sangra = modelo === "cheio";

  return (
    <ChaoConvidado fundo="escuro" pack={pack}>
      <div
        className={cn("relative flex-1 overflow-hidden", !sangra && "p-[var(--espaco)]")}
      >
        <Enquadramento modelo={modelo} />

        <span className="absolute bottom-6 left-6 flex items-center gap-3 rounded-pilula bg-bg-vidro px-[1.375rem] py-2.5">
          <span className="pulso size-2 rounded-full bg-acento" />
          <span className="font-titulo text-xl tracking-rotulo">ao vivo · 847 fotos</span>
        </span>

        <span className="absolute right-6 top-6 font-titulo text-2xl tracking-rotulo text-ink-2">
          {texto(pack, "landing.exemplo.nome")}
        </span>
      </div>
    </ChaoConvidado>
  );
}

export function TelaPanico({ pack }: { pack: Pack }) {
  return (
    <ChaoConvidado fundo="escuro" pack={pack}>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="m-0 font-titulo text-[clamp(1.75rem,4vw,2.75rem)] font-light tracking-titulo text-ink">
          {texto(pack, "landing.exemplo.nome")}
        </p>
        <p className="m-0 text-[clamp(1rem,2vw,1.35rem)] text-ink-3">Voltamos já</p>
      </div>
    </ChaoConvidado>
  );
}
