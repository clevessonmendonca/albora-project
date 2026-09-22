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
      <section className="overflow-hidden rounded-superficie border border-linha bg-superficie">
        {primeira.capa.thumb && (
          <img
            src={primeira.capa.thumb}
            alt=""
            className="h-[clamp(9rem,28vw,14rem)] w-full object-cover object-top"
          />
        )}
        <div className="p-[clamp(1.25rem,3vw,1.75rem)]">
          <h2 className="tipo-subtitle m-0 text-ink">A festa pelos olhos de todos</h2>
          <p className="tipo-caption m-0 mt-1.5 text-ink-2">
            {capitulos.length} {capitulos.length === 1 ? "capítulo" : "capítulos"}, na ordem em que
            aconteceu.
          </p>
          <button
            type="button"
            onClick={() => setAberto(true)}
            className={`${acaoPrimaria} mt-4`}
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
