import type { Pack } from "@albora/packs";
import { BackIcon, Badge, Button, cn, StatusBar } from "@albora/ui-web";
import { ChaoClaro } from "@/features/catalog/lib/chao-claro";
import { CampoAdmin } from "@/features/catalog/components/campo-admin";

export function TelaAdminCriarEvento({ pack }: { pack: Pack }) {
  const passos = ["Básico", "Identidade", "Missões", "Parede", "Peça"];
  const atual = 0;

  return (
    <ChaoClaro pack={pack}>
      <StatusBar />

      <div className="flex items-center gap-3 px-[1.125rem] pt-1.5 pb-3">
        <span className="text-ink-2">
          <BackIcon />
        </span>
        <p className="flex-1 font-titulo text-[1.125rem] tracking-titulo">Novo evento</p>
        <Badge>
          {atual + 1} de {passos.length}
        </Badge>
      </div>

      <div className="flex gap-1.5 px-[1.125rem] pb-5">
        {passos.map((p, i) => (
          <span
            key={p}
            className={cn("h-1 flex-1 rounded-pilula", i <= atual ? "bg-acento" : "bg-linha")}
          />
        ))}
      </div>

      <div className="flex-1 overflow-hidden px-[1.125rem]">
        <p className="font-titulo text-[1.5rem] font-light leading-tight tracking-titulo">O básico</p>
        <p className="mt-1 mb-5 text-[0.8125rem] text-ink-2">
          Uma coisa por vez. Isto é tudo que a Albora precisa pra existir.
        </p>

        <div className="flex flex-col gap-4">
          <CampoAdmin rotulo="O nome do casal" valor="Ana & João" />
          <CampoAdmin rotulo="A data" valor="8 de novembro de 2026" />
          <CampoAdmin
            rotulo="Convidados esperados"
            valor="150"
            nota="Só pra medir participação — ninguém é cadastrado, e ninguém recebe convite por aqui."
          />
        </div>
      </div>

      <div className="px-[1.125rem] pt-3 pb-8">
        <Button width="full">Continuar</Button>
      </div>
    </ChaoClaro>
  );
}
