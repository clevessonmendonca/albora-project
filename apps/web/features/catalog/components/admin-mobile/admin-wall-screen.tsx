import { MODELOS_DE_TELAO, PERFIS, problemasDaEscolha, type ModeloDeTelao } from "@albora/core";
import type { Pack } from "@albora/packs";
import { Badge, Button, cn, StatusBar } from "@albora/ui-web";
import { ChaoClaro } from "@/features/catalog/lib/chao-claro";
import { NavAdmin } from "@/features/catalog/components/nav-admin";
import { Marcador } from "@/features/catalog/components/marcador";
import { NOMES_DOS_MODELOS, profileText } from "@/features/catalog/lib/parede-utils";

export function AdminWallScreen({
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
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">A parede</p>
        <Badge tone={recusada ? "outline" : "accent"}>
          {escolhidos.length} de {MODELOS_DE_TELAO.length}
        </Badge>
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <p className="mb-3 text-[0.8125rem] text-ink-2">
          A parede alterna entre os modelos marcados a noite inteira. Marque quantos quiser.
        </p>

        {recusada && (
          <div className="mb-3 rounded-token border-l-[3px] border-critico bg-critico-superficie p-3">
            <p className="font-titulo text-[0.9375rem] text-critico">Esta escolha não pode ser salva</p>
            {problemas.map((p) => (
              <p key={p} className="mt-1 text-[0.75rem] text-ink-2">
                {p}
              </p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {MODELOS_DE_TELAO.map((modelo) => {
            const marcado = escolhidos.includes(modelo);
            const culpado = recusada && !PERFIS[modelo].aceitaEmPe && marcado;

            return (
              <div
                key={modelo}
                className={cn(
                  "rounded-token border p-3",
                  marcado ? "border-acento bg-acento-superficie-suave" : "border-linha bg-superficie",
                  culpado && "border-critico",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-titulo text-[0.9375rem]">{NOMES_DOS_MODELOS[modelo]}</span>
                  <Marcador marcado={marcado} />
                </div>
                <p
                  className={cn(
                    "mt-1 text-[0.6875rem]",
                    PERFIS[modelo].aceitaEmPe ? "text-ink-3" : "text-critico",
                  )}
                >
                  {profileText(modelo)}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-3.5">
          <Button width="full" variant={recusada ? "secondary" : "primary"}>
            Salvar
          </Button>
          <p className="mt-2 text-center text-[0.75rem] text-ink-2">
            {recusada
              ? "Marque ao menos um modelo que aceite foto em pé."
              : "Vale já na próxima foto que subir."}
          </p>
        </div>
      </div>

      <NavAdmin active="parede" />
    </ChaoClaro>
  );
}
