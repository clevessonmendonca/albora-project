import { PERFIS, type ModeloDeTelao } from "@albora/core";
import { Frame, cn } from "@albora/ui-web";

const COMO_RESOLVE: Readonly<Record<ModeloDeTelao, string>> = {
  polaroide: "Uma cópia por vez, com o crédito assinado na margem de baixo.",
  mural: "Três verticais lado a lado preenchem o 16:9 sem cortar nenhuma.",
  colagem: "Arranjos que se alternam, para a parede não virar papel de parede.",
  ambiente: "A vertical inteira sobre a própria foto desfocada — a borda some sem recorte.",
  cheio: "Sangra até a borda. É o único que recusa foto em pé, e a fila filtra antes de sortear.",
  carrossel: "Uma de cada vez, com as vizinhas espiando: é o que conta que existe mais.",
  dump: "Nove de uma vez. A mesa inteira aparece na mesma passada.",
  tbt: "Puxa da faixa antiga, não da recente. Retrospectiva da foto de cinco minutos atrás não é retrospectiva de nada.",
};

const NOMES_DOS_MODELOS: Readonly<Record<ModeloDeTelao, string>> = {
  polaroide: "Polaroide",
  mural: "Mural",
  colagem: "Colagem",
  ambiente: "Ambiente",
  cheio: "Cheio",
  carrossel: "Carrossel",
  dump: "Dump",
  tbt: "TBT",
};

export function modelName(modelo: ModeloDeTelao): string {
  return NOMES_DOS_MODELOS[modelo];
}

export function wallProfileText(modelo: ModeloDeTelao): string {
  const perfil = PERFIS[modelo];
  const quantas = perfil.fotos === 1 ? "uma foto por vez" : `${perfil.fotos} fotos de uma vez`;
  const emPe = perfil.aceitaEmPe ? "aceita foto em pé" : "só foto deitada";
  return `${quantas} · ${emPe}`;
}

export function modelNote(modelo: ModeloDeTelao): string {
  return `${wallProfileText(modelo)}. ${COMO_RESOLVE[modelo]}`;
}

function Quadro({
  variante,
  proporcao,
  semRaio,
  className,
}: {
  variante: number;
  proporcao?: "9/16" | "3/4";
  semRaio?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative block overflow-hidden",
        !semRaio && "rounded-token",
        proporcao === "9/16" && "aspect-[9/16]",
        proporcao === "3/4" && "aspect-[3/4]",
        className,
      )}
    >
      <span className={cn("absolute inset-0 overflow-hidden", !semRaio && "rounded-token")}>
        <Frame atmosphere variant={variante} />
      </span>
    </span>
  );
}

export function Framing({ modelo, mini }: { modelo: ModeloDeTelao; mini?: boolean }) {
  if (modelo === "cheio") {
    return <Quadro variante={11} semRaio className="size-full" />;
  }

  if (modelo === "polaroide") {
    return (
      <span className="grid size-full place-items-center">
        <span
          className={cn(
            "flex aspect-[0.72] h-[88%] flex-col rounded-token bg-superficie-alta",
            mini ? "p-[6%_6%_0]" : "p-4 pb-0",
          )}
        >
          <Quadro variante={2} semRaio className="w-full flex-1" />
          {mini ? (
            <span className="h-[14%] min-h-1.5" />
          ) : (
            <span className="px-1 py-3.5 font-titulo text-lg tracking-rotulo text-ink-2">
              Bia · 23h41
            </span>
          )}
        </span>
      </span>
    );
  }

  if (modelo === "mural") {
    return (
      <span className="grid size-full grid-cols-3 place-items-center gap-[var(--espaco)]">
        {Array.from({ length: PERFIS.mural.fotos }, (_, i) => (
          <Quadro key={i} variante={i * 7 + 3} proporcao="9/16" className="h-full" />
        ))}
      </span>
    );
  }

  if (modelo === "colagem") {
    return (
      <span className="grid size-full grid-cols-[1.15fr_1fr_1fr] grid-rows-2 gap-[var(--espaco)]">
        <Quadro variante={4} className="row-span-2" />
        {Array.from({ length: PERFIS.colagem.fotos - 1 }, (_, i) => (
          <Quadro key={i} variante={i * 5 + 9} />
        ))}
      </span>
    );
  }

  if (modelo === "ambiente") {
    return (
      <span className="relative grid size-full place-items-center overflow-hidden rounded-token">
        <span
          className={cn(
            "absolute inset-0 scale-[1.2]",
            mini ? "blur-[0.375rem]" : "blur-[2rem]",
          )}
        >
          <span className="absolute inset-0 overflow-hidden">
            <Frame atmosphere variant={6} />
          </span>
        </span>
        <span className="absolute inset-0 bg-bg-overlay-medio" />
        <Quadro variante={6} proporcao="9/16" className="relative h-full" />
      </span>
    );
  }

  if (modelo === "carrossel") {
    return (
      <span className="relative flex size-full items-center justify-center gap-2 overflow-hidden">
        {[
          { v: 12, altura: "h-[68%]", opacidade: "opacity-[0.38]" },
          { v: 3, altura: "h-full", opacidade: "opacity-100" },
          { v: 17, altura: "h-[68%]", opacidade: "opacity-[0.38]" },
        ].map((q, i) => (
          <Quadro
            key={i}
            variante={q.v}
            proporcao="9/16"
            className={cn(q.altura, q.opacidade)}
          />
        ))}

        <span className="absolute bottom-[3%] flex gap-[0.3125rem]">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cn(
                "size-[0.3125rem] rounded-full",
                i === 1 ? "bg-acento" : "bg-linha",
              )}
            />
          ))}
        </span>
      </span>
    );
  }

  if (modelo === "dump") {
    const naPrimeira = Math.ceil(PERFIS.dump.fotos / 2);
    const linhas = [naPrimeira, PERFIS.dump.fotos - naPrimeira];

    return (
      <span className="flex size-full flex-col items-center justify-center gap-[var(--espaco)]">
        {linhas.map((quantas, linha) => (
          <span key={linha} className="flex h-[44%] gap-[var(--espaco)]">
            {Array.from({ length: quantas }, (_, i) => (
              <Quadro
                key={i}
                variante={linha * 13 + i * 3}
                proporcao="3/4"
                className="h-full"
              />
            ))}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className="grid size-full place-items-center">
      <span className="relative aspect-[9/16] h-full">
        <span className="absolute inset-0 overflow-hidden rounded-token">
          <Frame atmosphere variant={19} />
        </span>
        <span
          className={cn(
            "absolute top-[4%] left-[5%] rounded-pilula bg-acento text-sm uppercase tracking-rotulo text-sobre-acento",
            mini ? "h-[5%] w-[45%]" : "px-4 py-1.5",
          )}
        >
          {mini ? "" : "19h20 · a chegada"}
        </span>
      </span>
    </span>
  );
}
