import { texto, type Pack } from "@albora/packs";
import { cn } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { WizardField } from "@/features/catalog/components/wizard-field";

const PASSOS_DO_WIZARD = ["Nome e data", "Identidade", "Missões", "Parede", "Peças"] as const;

export function HostCreateEventScreen({
  pack,
  passo = 1,
}: {
  pack: Pack;
  passo?: 1 | 2 | 3 | 4 | 5;
}) {
  const indice = passo - 1;

  return (
    <GuestBackground fundo="claro" pack={pack}>
      <div className="flex flex-1 flex-col px-10 py-8">
        <div className="mb-8 flex gap-1.5">
          {PASSOS_DO_WIZARD.map((rotulo, i) => (
            <span
              key={rotulo}
              className={cn(
                "h-1 flex-1 rounded-pilula",
                i <= indice ? "bg-acento" : "bg-linha",
              )}
              title={rotulo}
            />
          ))}
        </div>

        <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
          Passo {passo} de {PASSOS_DO_WIZARD.length} · {PASSOS_DO_WIZARD[indice]}
        </p>
        <h1 className="mt-2 mb-0 font-titulo text-[1.875rem] font-light tracking-titulo">
          {passo === 1 && "Quando é a festa?"}
          {passo === 2 && "Como ela vai aparecer?"}
          {passo === 3 && "Quais missões entram?"}
          {passo === 4 && "Quais modelos na parede?"}
          {passo === 5 && "A peça com o QR"}
        </h1>

        <div className="mt-6 flex-1">
          {passo === 1 && (
            <div className="flex max-w-[22rem] flex-col gap-4">
              <WizardField label="Nome do evento" value={texto(pack, "landing.exemplo.nome")} />
              <WizardField label="Convidados esperados" value="150" />
              <WizardField label="Começo" value="Sáb, 20:00" />
              <WizardField label="Fim" value="Dom, 04:00" />
            </div>
          )}
          {passo === 5 && (
            <p className="m-0 max-w-[40ch] text-[0.9375rem] leading-normal text-ink-2">
              A placa impressa na mesa é a porta física do convidado. Baixe o PDF quando estiver pronta.
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          {passo > 1 && (
            <span className="rounded-pilula border border-linha px-6 py-3 text-ink-2">
              Voltar
            </span>
          )}
          <span className="rounded-pilula bg-acento px-7 py-3 font-semibold text-sobre-acento">
            {passo === 5 ? "Ir pro painel" : "Continuar"}
          </span>
        </div>
      </div>
    </GuestBackground>
  );
}
