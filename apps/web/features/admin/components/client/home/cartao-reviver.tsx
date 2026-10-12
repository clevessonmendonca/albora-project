"use client";

import { useState } from "react";
import type { CapituloDoReviver } from "@/features/admin/lib/reviver";
import { Reviver } from "../reviver";
import { acaoPrimaria, estiloAcento } from "./estilos";

/**
 * A porta do Reviver. Mostra a capa do primeiro capítulo porque o convite é a
 * imagem — "4 capítulos" sozinho não diz que vale o clique.
 */
export function CartaoReviver({
  capitulos,
  fuso,
  nome,
  fotos,
  pessoas,
  hrefAlbum,
}: {
  capitulos: CapituloDoReviver[];
  fuso: string;
  nome: string;
  fotos: number;
  pessoas: number;
  hrefAlbum: string;
}) {
  const [aberto, setAberto] = useState(false);
  const primeira = capitulos[0];
  if (!primeira) return null;

  return (
    <>
      <section className={`overflow-hidden rounded-superficie border border-linha bg-superficie ${primeira.capa.thumb ? "grid md:grid-cols-2" : ""}`}>
        {primeira.capa.thumb && (
          <img
            src={primeira.capa.thumb}
            alt=""
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full object-cover object-top md:aspect-auto md:h-full md:min-h-64"
          />
        )}
        <div className="flex min-w-0 flex-col items-start justify-center p-[clamp(1.25rem,3vw,2rem)]">
          <h2 className="m-0 text-balance font-titulo text-[clamp(1.5rem,3vw,2.25rem)] font-light leading-tight text-ink">A festa pelos olhos de todos</h2>
          <p className="tipo-caption m-0 mt-1.5 text-ink-2">
            {capitulos.length} {capitulos.length === 1 ? "capítulo" : "capítulos"}, na ordem em que
            aconteceu.
          </p>
          <button
            type="button"
            onClick={() => setAberto(true)}
            className={`${acaoPrimaria} mt-5 min-h-12`}
            style={estiloAcento}
          >
            Reviver
          </button>
        </div>
      </section>

      <Reviver
        capitulos={capitulos}
        fuso={fuso}
        nome={nome}
        fotos={fotos}
        pessoas={pessoas}
        hrefAlbum={hrefAlbum}
        aberto={aberto}
        onFechar={() => setAberto(false)}
      />
    </>
  );
}
