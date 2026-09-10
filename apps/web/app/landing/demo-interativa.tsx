"use client";

import Image from "next/image";
import React, { useId, useState } from "react";
import { LandingCtaLink } from "./landing-cta-link";
import { Accent, pillClasses } from "./pieces";

/**
 * Prévia do álbum com o nome ao vivo. A pessoa digita o nome da festa, o álbum
 * de exemplo atualiza na hora, e o CTA leva esse nome para a criação do evento
 * (`?nome=`) — a demo deixa de ser um brinquedo e vira o primeiro passo real.
 * Nada sai do navegador até o clique em criar.
 */

export type FotoDemo = { src: string; alt: string };

const PASSOS = [
  "Compartilhe o QR nas mesas ou por link.",
  "Seus convidados abrem e enviam as fotos.",
  "Os registros se juntam no álbum da festa.",
] as const;

export function DemoInterativa({
  nomeExemplo,
  albumSub,
  placeholder,
  fotos,
  hrefBase,
  packId,
}: {
  nomeExemplo: string;
  albumSub: string;
  placeholder: string;
  fotos: readonly FotoDemo[];
  /** Base do funil de criação; o nome digitado é anexado como `?nome=`. */
  hrefBase: string;
  packId: string;
}) {
  const [nome, setNome] = useState("");
  const inputId = useId();

  const titulo = nome.trim() || nomeExemplo;
  const href = nome.trim()
    ? `${hrefBase}${hrefBase.includes("?") ? "&" : "?"}nome=${encodeURIComponent(nome.trim())}`
    : hrefBase;

  return (
    <div className="grid items-center gap-[clamp(2rem,6vw,5rem)] md:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="tipo-label uppercase text-acento-texto">Veja antes da festa</p>
        <h2
          className="tipo-display m-0 mt-4 font-light text-balance"
          style={{ fontSize: "clamp(2rem,4vw,3rem)" }}
        >
          Do celular deles. <Accent>Para o seu álbum.</Accent>
        </h2>
        <p className="mt-6 max-w-[44ch] text-[1.05rem] leading-relaxed text-ink-2">
          Dê um nome à sua festa e veja o álbum ganhar a sua cara. Na hora de
          criar, ele já começa com esse nome.
        </p>

        <ol className="m-0 mt-7 grid list-decimal gap-3.5 pl-[1.375rem] text-[0.9375rem] text-ink-2 marker:text-acento-texto">
          {PASSOS.map((passo) => (
            <li key={passo}>{passo}</li>
          ))}
        </ol>

        <div className="mt-8 max-w-[26rem]">
          <label htmlFor={inputId} className="mb-3 block font-semibold text-ink">
            Qual é o nome da sua festa?
          </label>
          <input
            id={inputId}
            name="nome-da-festa"
            value={nome}
            maxLength={60}
            autoComplete="off"
            placeholder={placeholder}
            onChange={(event) => setNome(event.target.value)}
            className="w-full rounded-superficie border border-linha bg-superficie-alta p-4 text-ink caret-acento outline-none placeholder:text-ink-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-acento"
          />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <LandingCtaLink href={href} packHint={packId} className={`${pillClasses} gap-2`}>
              Criar meu evento <span aria-hidden="true">→</span>
            </LandingCtaLink>
            <span className="text-sm text-ink-3">Grátis para começar, sem cartão.</span>
          </div>
        </div>
      </div>

      <div className="demo-album min-w-0" role="group" aria-label="Prévia de um álbum coletivo">
        <div className="demo-album-top">
          <span>Álbum de exemplo</span>
          <span>{fotos.length} fotos</span>
        </div>
        <h3 className="tipo-display m-0 mt-6 break-words [overflow-wrap:anywhere] text-[clamp(1.5rem,3vw,2rem)] font-normal">
          {titulo}
        </h3>
        <p className="m-0 mt-1 text-sm text-ink-3">{albumSub}</p>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          {fotos.map((foto) => (
            <div className="demo-foto" key={foto.src}>
              <Image
                src={foto.src}
                alt={foto.alt}
                fill
                sizes="(max-width: 760px) 40vw, 240px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
