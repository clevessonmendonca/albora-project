import { FUSOS_DO_EVENTO } from "@albora/core";
import type { Pack } from "@albora/packs";
import { BackIcon, Badge, Button, cn, StatusBar } from "@albora/ui-web";
import { GuestBackground } from "@/features/catalog/lib/guest-background";
import { AdminField } from "@/features/catalog/components/admin-field";

export function AdminCreateEventScreen({ pack }: { pack: Pack }) {
  const steps = ["Básico", "Identidade", "Missões", "Parede", "Peça"];
  const current = 0;

  return (
    <GuestBackground background="light" pack={pack}>
      <StatusBar />

      <div className="flex items-center gap-3 px-[1.125rem] pt-1.5 pb-3">
        <span className="text-ink-2">
          <BackIcon />
        </span>
        <p className="flex-1 font-titulo text-[1.125rem] tracking-titulo">Novo evento</p>
        <Badge>
          {current + 1} de {steps.length}
        </Badge>
      </div>

      <div className="flex gap-1.5 px-[1.125rem] pb-5">
        {steps.map((p, i) => (
          <span
            key={p}
            className={cn("h-1 flex-1 rounded-pilula", i <= current ? "bg-acento" : "bg-linha")}
          />
        ))}
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <p className="font-titulo text-[1.5rem] font-light leading-tight tracking-titulo">O básico</p>
        <p className="mt-1 mb-5 text-[0.8125rem] text-ink-2">
          Uma coisa por vez. Isto é tudo que a Albora precisa pra existir.
        </p>

        <div className="flex flex-col gap-4">
          <AdminField label="O nome do casal" value="Ana & João" />
          <AdminField label="A data" value="8 de novembro de 2026" />
          <AdminField
            label="Convidados esperados"
            value="150"
            note="Só pra medir participação — ninguém é cadastrado, e ninguém recebe convite por aqui."
          />
          <AdminField label="Fuso horário" value={FUSOS_DO_EVENTO[0].rotulo} />
        </div>
      </div>

      <div className="px-[1.125rem] pt-3 pb-8">
        <Button width="full">Continuar</Button>
      </div>
    </GuestBackground>
  );
}
