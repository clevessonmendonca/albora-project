import React from "react";
import { EventHero, GuestMain, GuestShell } from "@albora/ui-web";
import type { EstadoPaginaPublica, FotoDaVitrine } from "../../data/get-public-event-page";

export type PublicEventViewProps = {
  estado: EstadoPaginaPublica;
  nomeDoEvento: string;
  dataDoEvento: string;
  mensagemVazia: string;
  totalFotos: number;
  totalPessoas: number;
  vitrine: FotoDaVitrine[];
  ctaHref: string;
};

const FORMATADOR = new Intl.NumberFormat("pt-BR");

/**
 * A landing pública de um evento — prova social, gostinho do álbum já
 * moderado, e o CTA "monte o seu". Sem sessão, sem PII de convidado: os
 * números vêm de agregado (`totalFotos`/`totalPessoas`), e a vitrine só
 * carrega o que `paraVitrinePublica` deixou passar.
 */
export function PublicEventView({
  estado,
  nomeDoEvento,
  dataDoEvento,
  mensagemVazia,
  totalFotos,
  totalPessoas,
  vitrine,
  ctaHref,
}: PublicEventViewProps) {
  const temFotos = vitrine.length > 0;
  const fotoDeCapa = vitrine[0]?.url;

  return (
    <GuestShell hideStatusBar>
      <EventHero
        {...(fotoDeCapa !== undefined ? { fotoUrl: fotoDeCapa } : {})}
        titulo={nomeDoEvento}
        data={dataDoEvento}
      />

      <GuestMain reserveTabBarSpace={false}>
        {estado !== "nao_comecou" && (
          <ProvaSocial totalFotos={totalFotos} totalPessoas={totalPessoas} />
        )}

        {estado === "encerrado" && (
          <p className="m-0 text-center text-[0.75rem] uppercase tracking-rotulo text-ink-3">
            Álbum encerrado
          </p>
        )}

        <section aria-label="Um gostinho do álbum" className="mt-6">
          {temFotos ? (
            <Vitrine fotos={vitrine} />
          ) : (
            <p className="m-0 py-8 text-center leading-relaxed text-ink-2">{mensagemVazia}</p>
          )}
        </section>

        <div className="mt-8">
          <a
            href={ctaHref}
            className="grid w-full place-items-center rounded-pilula bg-acento px-[1.125rem] py-[1.125rem] font-semibold text-sobre-acento no-underline"
          >
            Monte o álbum da sua festa
          </a>
        </div>
      </GuestMain>
    </GuestShell>
  );
}

function ProvaSocial({
  totalFotos,
  totalPessoas,
}: {
  totalFotos: number;
  totalPessoas: number;
}) {
  return (
    <ul className="mb-2 mt-4 flex list-none justify-center gap-0 p-0" aria-label="A festa em números">
      <Stat valor={totalFotos} rotulo={totalFotos === 1 ? "foto" : "fotos"} />
      <Stat valor={totalPessoas} rotulo={totalPessoas === 1 ? "pessoa" : "pessoas"} />
    </ul>
  );
}

function Stat({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <li className="flex-1 border-l border-linha px-4 text-center first:border-l-0">
      <span className="block font-titulo text-[1.75rem] font-light tabular-nums leading-none">
        {FORMATADOR.format(valor)}
      </span>
      <span className="mt-1 block text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
        {rotulo}
      </span>
    </li>
  );
}

function Vitrine({ fotos }: { fotos: FotoDaVitrine[] }) {
  return (
    <ul className="m-0 grid grid-cols-3 gap-2 p-0" aria-label="Fotos moderadas do álbum">
      {fotos.map((foto) => (
        <li key={foto.id} className="relative aspect-square overflow-hidden rounded-media bg-superficie-alta">
          <img
            src={foto.url}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full scale-[1.2] object-cover blur-md saturate-[0.7] brightness-[0.6]"
          />
          <img
            src={foto.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-contain"
          />
        </li>
      ))}
    </ul>
  );
}
