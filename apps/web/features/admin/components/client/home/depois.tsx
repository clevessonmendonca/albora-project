import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronIcon } from "@albora/ui-web";
import type { Payoff } from "@/features/admin/data/load-home-state";
import { hora, type CapituloDoReviver } from "@/features/admin/lib/reviver";
import { acaoPrimaria, acaoSecundaria, estiloAcento } from "./estilos";

function Numero({ n, rotulo }: { n: number; rotulo: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="tipo-caption order-2 text-ink-2">{rotulo}</dt>
      <dd className="tipo-title m-0 tabular-nums text-ink">{n.toLocaleString("pt-BR")}</dd>
    </div>
  );
}

/** Mesmo traço do `EstrelaIcon` de host-album.tsx — "destacar" no produto é estrela, não coração. */
function EstrelaIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="currentColor" stroke="none">
      <path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85z" />
    </svg>
  );
}

/**
 * Prévia dos capítulos do Reviver, não o funil de participação — "Momentos da
 * noite" apontava para `/insights`, que é outra coisa (conversão, sem fotos).
 */
function MomentosDaNoite({ capitulos, fuso }: { capitulos: CapituloDoReviver[]; fuso: string }) {
  if (capitulos.length === 0) return null;

  return (
    <section>
      <h2 className="tipo-subtitle m-0 mb-4 text-ink">Momentos da noite</h2>
      <ul className="m-0 flex list-none gap-3 overflow-x-auto p-0 pb-1">
        {capitulos.map((c) => (
          <li
            key={c.id}
            className="w-[9.5rem] shrink-0 overflow-hidden rounded-token border border-linha bg-superficie"
          >
            {c.capa.thumb && (
              <img
                src={c.capa.thumb}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover"
              />
            )}
            <div className="p-2.5">
              <p className="tipo-label m-0 truncate text-ink">{c.titulo}</p>
              <p className="tipo-caption m-0 text-ink-3">
                {hora(c.em, fuso)} · {c.fotos} {c.fotos === 1 ? "foto" : "fotos"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Favoritas({ base, destacadas }: { base: string; destacadas: number }) {
  if (destacadas === 0) return null;

  return (
    <Link
      href={`${base}/album?aba=destaques`}
      className="flex items-center gap-3 rounded-superficie border border-linha bg-superficie px-4 py-3.5 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-token bg-superficie-alta text-ink-2">
        <EstrelaIcon />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="tipo-label text-ink">
          {destacadas} {destacadas === 1 ? "foto que vocês destacaram" : "fotos que vocês destacaram"}
        </span>
        <span className="tipo-caption text-ink-3">Viram a base do álbum e do Reviver.</span>
      </span>
      <span className="shrink-0 text-ink-3">
        <ChevronIcon />
      </span>
    </Link>
  );
}

/**
 * O payoff da fase Depois. O número que importa não é o total — é quantas
 * chegaram depois que o casal foi embora: convidado com fila offline sobe no
 * dia seguinte, e quem ficou até o fim sobe de madrugada. "1.284 fotos" não
 * muda de cara e não convida a voltar; "38 que você ainda não viu", sim.
 */
export function Payoffdepois({
  base,
  payoff,
  capitulos,
  fuso,
  reviver,
}: {
  base: string;
  payoff: Payoff;
  capitulos: CapituloDoReviver[];
  fuso: string;
  reviver?: ReactNode;
}) {
  const { fotos, pessoas, destacadas, novas } = payoff;

  return (
    <>
      <section className="rounded-superficie border border-linha bg-superficie p-[clamp(1.25rem,3vw,1.75rem)]">
        <dl aria-label="Resumo do álbum" className="m-0 grid grid-cols-2 gap-5 sm:grid-cols-3">
          <Numero n={fotos} rotulo={fotos === 1 ? "foto" : "fotos"} />
          <Numero n={pessoas} rotulo={pessoas === 1 ? "pessoa" : "pessoas"} />
          {destacadas > 0 && <Numero n={destacadas} rotulo="favoritas" />}
        </dl>

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

      {reviver}

      <MomentosDaNoite capitulos={capitulos} fuso={fuso} />

      <Favoritas base={base} destacadas={destacadas} />

      <section>
        <h2 className="tipo-subtitle m-0 mb-4 text-ink">Guardar suas fotos</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href={`${base}/album?baixar=1`} className={`${acaoSecundaria} min-h-12 whitespace-normal text-center`}>
            Baixar tudo
          </Link>
          <Link href={`${base}/guests`} className={`${acaoSecundaria} min-h-12 whitespace-normal text-center`}>
            Quem esteve lá
          </Link>
        </div>
      </section>
    </>
  );
}
