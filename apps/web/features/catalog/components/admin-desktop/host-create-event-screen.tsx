import { resolvePackText, type Pack } from "@albora/packs";
import { cn } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { WizardField } from "@/features/catalog/components/wizard-field";

const WIZARD_STEPS = ["Nome e data", "Identidade", "Missões", "Parede", "Peças"] as const;

export function HostCreateEventScreen({
  pack,
  step = 1,
}: {
  pack: Pack;
  step?: 1 | 2 | 3 | 4 | 5;
}) {
  const index = step - 1;

  return (
    <GuestBackground background="light" pack={pack}>
      <div className="flex flex-1 flex-col px-10 py-8">
        <div className="mb-8 flex gap-1.5">
          {WIZARD_STEPS.map((label, i) => (
            <span
              key={label}
              className={cn(
                "h-1 flex-1 rounded-pilula",
                i <= index ? "bg-acento" : "bg-linha",
              )}
              title={label}
            />
          ))}
        </div>

        <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
          Passo {step} de {WIZARD_STEPS.length} · {WIZARD_STEPS[index]}
        </p>
        <h1 className="mt-2 mb-0 font-titulo text-[1.875rem] font-light tracking-titulo">
          {step === 1 && "Quando é a festa?"}
          {step === 2 && "Como ela vai aparecer?"}
          {step === 3 && "Quais missões entram?"}
          {step === 4 && "Quais modelos na parede?"}
          {step === 5 && "A peça com o QR"}
        </h1>

        <div className="mt-6 flex-1">
          {step === 1 && (
            <div className="flex max-w-[22rem] flex-col gap-4">
              <WizardField label="Nome do evento" value={resolvePackText(pack, "landing.exemplo.nome")} />
              <WizardField label="Convidados esperados" value="150" />
              <WizardField label="Começo" value="Sáb, 20:00" />
              <WizardField label="Fim" value="Dom, 04:00" />
              <WizardField label="Fuso horário" value="Brasília" />
            </div>
          )}
          {step === 5 && (
            <p className="m-0 max-w-[40ch] text-[0.9375rem] leading-normal text-ink-2">
              A placa impressa na mesa é a porta física do convidado. Baixe o PDF quando estiver pronta.
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <span className="rounded-pilula border border-linha px-6 py-3 text-ink-2">
              Voltar
            </span>
          )}
          <span className="rounded-pilula bg-acento px-7 py-3 font-semibold text-sobre-acento">
            {step === 5 ? "Ir pro painel" : "Continuar"}
          </span>
        </div>
      </div>
    </GuestBackground>
  );
}
