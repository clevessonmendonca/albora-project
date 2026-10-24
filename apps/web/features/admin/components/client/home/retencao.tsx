import Link from "next/link";
import { linhaDeRetencao, type MarcoCru, type NoDaLinha } from "@/features/admin/lib/linha-de-retencao";
import { acaoPrimaria, estiloAcento } from "./estilos";

function fmt(d: Date, fuso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: fuso,
    }).format(d);
  } catch {
    return "";
  }
}

function Marcador({ no }: { no: NoDaLinha }) {
  const cor =
    no.estado === "agora"
      ? "bg-acento"
      : no.critico
        ? "bg-critico"
        : no.estado === "feito"
          ? "bg-ink-2"
          : "bg-linha";
  return <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${cor}`} />;
}

/**
 * O prazo de retenção é promessa de contrato, e promessa que o casal só
 * descobre no e-mail do dia 358 é promessa quebrada. Os marcos saem dos jobs
 * reais quando existem — "já mandamos para a sua nuvem" é diferente de "vamos
 * mandar" — e caem para a data calculada sobre o fim do evento quando não.
 */
export function AvisoDeRetencao({
  base,
  terminaEm,
  fuso,
  marcos,
}: {
  base: string;
  terminaEm: Date;
  fuso: string;
  marcos: MarcoCru[];
}) {
  const linha = linhaDeRetencao(terminaEm, marcos);

  return (
    <section className="rounded-superficie border border-linha bg-superficie p-[clamp(1.25rem,3vw,1.75rem)]">
      <h2 className="tipo-subtitle m-0 text-ink">As fotos são de vocês</h2>
      <p className="tipo-body m-0 mt-2 max-w-[48ch] text-ink-2">
        {linha.diasAteApagar === 0
          ? "O álbum sai dos nossos servidores hoje."
          : linha.urgente
            ? `Faltam ${linha.diasAteApagar} ${linha.diasAteApagar === 1 ? "dia" : "dias"} para o álbum sair dos nossos servidores.`
            : `Guardamos tudo até ${fmt(linha.d365, fuso)}. Depois disso, some.`}
      </p>

      <ol className="m-0 mt-6 flex list-none flex-col divide-y divide-linha p-0">
        {linha.nos.map((no) => (
          <li key={no.chave} aria-current={no.estado === "agora" ? "step" : undefined} className="flex gap-3 py-4 first:pt-0">
            <Marcador no={no} />
            <div className="min-w-0">
              <p
                className={`tipo-body m-0 ${no.critico ? "text-critico" : no.estado === "futuro" ? "text-ink-2" : "text-ink"}`}
              >
                {no.titulo}
                {no.em && <span className="mt-1 block text-sm text-ink-2">{fmt(no.em, fuso)}</span>}
              </p>
              <p className="tipo-caption m-0 mt-0.5 max-w-[46ch] text-ink-3">{no.detalhe}</p>
            </div>
          </li>
        ))}
      </ol>

      <Link
        href={`${base}/album?baixar=1`}
        className={`${acaoPrimaria} mt-5 min-h-12 w-full whitespace-normal text-center sm:w-auto`}
        style={linha.urgente ? estiloAcento : undefined}
      >
        Baixar tudo agora
      </Link>
    </section>
  );
}
