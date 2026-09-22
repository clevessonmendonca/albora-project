import Link from "next/link";
import type { Payoff } from "@/features/admin/data/load-home-state";
import { acaoPrimaria, acaoSecundaria, estiloAcento } from "./estilos";

function Numero({ n, rotulo }: { n: number; rotulo: string }) {
  return (
    <span className="flex flex-col">
      <span className="tipo-title text-ink">{n}</span>
      <span className="tipo-caption text-ink-3">{rotulo}</span>
    </span>
  );
}

/**
 * O payoff da fase Depois. O número que importa não é o total — é quantas
 * chegaram depois que o casal foi embora: convidado com fila offline sobe no
 * dia seguinte, e quem ficou até o fim sobe de madrugada. "1.284 fotos" não
 * muda de cara e não convida a voltar; "38 que você ainda não viu", sim.
 */
export function Payoffdepois({ base, payoff }: { base: string; payoff: Payoff }) {
  const { fotos, pessoas, destacadas, novas } = payoff;

  return (
    <>
      <section className="rounded-superficie border border-linha bg-superficie p-[clamp(1.25rem,3vw,1.75rem)]">
        <div className="flex flex-wrap gap-[clamp(1.5rem,5vw,3rem)]">
          <Numero n={fotos} rotulo={fotos === 1 ? "foto" : "fotos"} />
          <Numero n={pessoas} rotulo={pessoas === 1 ? "pessoa" : "pessoas"} />
          {destacadas > 0 && <Numero n={destacadas} rotulo="favoritas" />}
        </div>

        {novas > 0 && (
          <div className="mt-6 border-t border-linha pt-5">
            <p className="tipo-subtitle m-0 text-ink">
              {novas === 1
                ? "1 foto que você ainda não viu"
                : `${novas} fotos que você ainda não viu`}
            </p>
            <p className="tipo-caption m-0 mt-1.5 max-w-[46ch] text-ink-2">
              Boa parte chega depois da festa: quem estava sem sinal sobe no dia seguinte, e quem
              ficou até o fim sobe de madrugada.
            </p>
            <Link href={`${base}/album`} className={`${acaoPrimaria} mt-4`} style={estiloAcento}>
              Ver o que chegou
            </Link>
          </div>
        )}
      </section>

      <section>
        <h2 className="tipo-label m-0 mb-3 text-ink-3">Guardar suas fotos</h2>
        <div className="flex flex-wrap gap-2.5">
          <Link href={`${base}/album`} className={acaoSecundaria}>
            Baixar tudo
          </Link>
          {destacadas > 0 && (
            <Link href={`${base}/album?aba=destaques`} className={acaoSecundaria}>
              Só as favoritas
            </Link>
          )}
          <Link href={`${base}/insights`} className={acaoSecundaria}>
            Momentos da noite
          </Link>
          <Link href={`${base}/guests`} className={acaoSecundaria}>
            Quem esteve lá
          </Link>
        </div>
      </section>
    </>
  );
}
