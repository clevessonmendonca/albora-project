import { WALL_DISPLAY_MODELS, WALL_DISPLAY_MODEL_PROFILES, wallDisplayChoiceProblems, type WallDisplayModel } from "@albora/core";
import type { Pack } from "@albora/packs";
import { Badge, Button, cn, StatusBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { AdminNav } from "@/features/catalog/components/admin-nav";
import { CheckMark } from "@/features/catalog/components/check-mark";
import { MODEL_NAMES, profileText } from "@/features/catalog/lib/wall-utils";

export function AdminWallScreen({
  pack,
  selected,
}: {
  pack: Pack;
  selected: readonly WallDisplayModel[];
}) {
  const problemas = wallDisplayChoiceProblems(selected);
  const recusada = problemas.length > 0;

  return (
    <GuestBackground fundo="claro" pack={pack}>
      <StatusBar />

      <div className="flex items-center justify-between gap-3 px-[1.125rem] pt-1.5 pb-3">
        <p className="font-titulo text-[1.375rem] tracking-titulo">A parede</p>
        <Badge tone={recusada ? "outline" : "accent"}>
          {selected.length} de {WALL_DISPLAY_MODELS.length}
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
          {WALL_DISPLAY_MODELS.map((modelo) => {
            const checked = selected.includes(modelo);
            const culpado = recusada && !WALL_DISPLAY_MODEL_PROFILES[modelo].aceitaEmPe && checked;

            return (
              <div
                key={modelo}
                className={cn(
                  "rounded-token border p-3",
                  checked ? "border-acento bg-acento-superficie-suave" : "border-linha bg-superficie",
                  culpado && "border-critico",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-titulo text-[0.9375rem]">{MODEL_NAMES[modelo]}</span>
                  <CheckMark checked={checked} />
                </div>
                <p
                  className={cn(
                    "mt-1 text-[0.6875rem]",
                    WALL_DISPLAY_MODEL_PROFILES[modelo].aceitaEmPe ? "text-ink-3" : "text-critico",
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

      <AdminNav active="wall" />
    </GuestBackground>
  );
}
