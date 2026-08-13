import {
  MODELOS_DE_TELAO,
  PERFIS,
  problemasDaEscolha,
  type ModeloDeTelao,
} from "@albora/core";
import type { Pack } from "@albora/packs";
import { Badge, cn } from "@albora/ui-web";
import { ChaoClaro } from "@/features/catalog/lib/chao-claro";
import { LateralAnfitriao } from "@/features/catalog/components/lateral-anfitriao";
import { MarcadorDesktop } from "@/features/catalog/components/marcador";
import { OQueFicariaDeFora } from "@/features/catalog/components/o-que-ficaria-de-fora";
import { perfilEmPalavras } from "@/features/catalog/lib/parede-utils";
import { Enquadramento, nomeDoModelo } from "@/features/catalog/components/wall/enquadramento";

export function TelaModelosDaParede({
  pack,
  escolhidos,
}: {
  pack: Pack;
  escolhidos: readonly ModeloDeTelao[];
}) {
  const problemas = problemasDaEscolha(escolhidos);
  const recusada = problemas.length > 0;

  return (
    <ChaoClaro pack={pack}>
      <div className="flex h-full">
        <LateralAnfitriao pack={pack} active="A parede" />

        <main className="flex-1 overflow-hidden px-8 py-7">
          <div className="flex items-center justify-between gap-4">
            <span>
              <p className="m-0 font-titulo text-[1.875rem] font-light tracking-titulo">
                Os modelos da parede
              </p>
              <p className="mt-1.5 mb-0 text-[0.8125rem] text-ink-2">
                A parede alterna entre os modelos checkeds a noite inteira. Marque quantos quiser.
              </p>
            </span>
            <Badge tone={!recusada ? "accent" : "neutral"}>
              {escolhidos.length} de {MODELOS_DE_TELAO.length}
            </Badge>
          </div>

          {recusada ? (
            <div className="mt-5 flex flex-col gap-3.5 rounded-token border-l-[3px] border-critico bg-critico-superficie p-5">
              <span>
                <span className="block font-titulo text-[1.0625rem] text-critico">
                  Esta escolha não pode ser salva
                </span>
                {problemas.map((problema) => (
                  <span key={problema} className="mt-1 block text-[0.8125rem] text-ink-2">
                    {problema}
                  </span>
                ))}
              </span>

              <OQueFicariaDeFora />
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-4 gap-3">
            {MODELOS_DE_TELAO.map((modelo) => {
              const checked = escolhidos.includes(modelo);
              const culpado = recusada && !PERFIS[modelo].aceitaEmPe && checked;

              return (
                <div
                  key={modelo}
                  className={cn(
                    "rounded-token border p-2.5",
                    checked ? "border-acento bg-acento-superficie" : "border-linha bg-superficie",
                    culpado && "border-critico",
                  )}
                >
                  <span
                    className={cn(
                      "relative block aspect-video overflow-hidden rounded-token bg-ink",
                      !checked && "opacity-45",
                    )}
                  >
                    <Enquadramento modelo={modelo} mini />
                  </span>

                  <span className="mt-2 flex items-center gap-[0.4375rem]">
                    <MarcadorDesktop checked={checked} />
                    <span className="font-titulo text-[0.9375rem]">{nomeDoModelo(modelo)}</span>
                  </span>

                  <span
                    className={cn(
                      "mt-1 block text-[0.6875rem] leading-snug",
                      PERFIS[modelo].aceitaEmPe ? "text-ink-2" : "text-critico",
                    )}
                  >
                    {perfilEmPalavras(modelo)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center gap-3.5">
            <span
              className={cn(
                "inline-flex items-center rounded-pilula px-7 py-3 font-semibold",
                recusada ? "bg-superficie-alta text-ink-3" : "bg-acento text-sobre-acento",
              )}
            >
              Salvar
            </span>
            <span className="text-[0.78125rem] text-ink-2">
              {recusada
                ? "Marque ao menos um modelo que aceite foto em pé."
                : "Vale já na próxima foto que subir."}
            </span>
          </div>
        </main>
      </div>
    </ChaoClaro>
  );
}
