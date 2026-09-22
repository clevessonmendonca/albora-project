"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Dialog } from "@albora/ui-web";
import type { CapituloDoReviver } from "@/features/admin/lib/reviver";
import { adminClasses } from "@/features/admin/components/server/admin-shell";

const DURACAO_MS = 4000;

function hora(iso: string, fuso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: fuso,
    })
      .format(new Date(iso))
      .replace(":", "h");
  } catch {
    return "";
  }
}

/**
 * O Reviver: a festa em capítulos, em tela cheia.
 *
 * Avança sozinho, mas nunca tira o controle — tocar no lado volta ou pula, e
 * qualquer interação pausa. Quem está revendo a própria festa para quando
 * quiser olhar mais um pouco, e um player que ignora isso vira propaganda.
 */
export function Reviver({
  capitulos,
  fuso,
  nome,
  fotos,
  pessoas,
  hrefAlbum,
  aberto,
  onFechar,
}: {
  capitulos: CapituloDoReviver[];
  fuso: string;
  nome: string;
  fotos: number;
  pessoas: number;
  hrefAlbum: string;
  aberto: boolean;
  onFechar: () => void;
}) {
  const [i, setI] = useState(0);
  const [fim, setFim] = useState(false);
  const [pausado, setPausado] = useState(false);

  // Updater de `useState` precisa ser puro: o StrictMode invoca duas vezes, e
  // um `setFim` lá dentro fazia o player pular direto para a tela final.
  const avancar = useCallback(() => {
    if (i < capitulos.length - 1) setI(i + 1);
    else setFim(true);
  }, [i, capitulos.length]);

  useEffect(() => {
    if (!aberto) {
      setI(0);
      setFim(false);
      setPausado(false);
    }
  }, [aberto]);

  useEffect(() => {
    if (!aberto || fim || pausado) return;
    const t = setTimeout(avancar, DURACAO_MS);
    return () => clearTimeout(t);
  }, [aberto, fim, pausado, i, avancar]);

  // Teclado é o caminho do telão e o que o leitor de tela usa.
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      // Navegar despausa, igual ao toque nas laterais. Sem isto dava para
      // chegar ao fim pelo teclado com `pausado` preso e reiniciar congelado.
      if (e.key === "ArrowRight") {
        setPausado(false);
        avancar();
      }
      if (e.key === "ArrowLeft") {
        setPausado(false);
        setFim(false);
        setI((a) => Math.max(0, a - 1));
      }
      if (e.key === " ") {
        e.preventDefault();
        setPausado((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, avancar]);

  const atual = capitulos[i];
  if (!aberto || !atual) return null;

  return (
    <Dialog open={aberto} onClose={onFechar} aria-label={`Reviver ${nome}`}>
      <div className="fixed inset-0 flex flex-col bg-ink">
        <div className="flex gap-1 px-3 pt-3">
          {capitulos.map((c, idx) => (
            <span key={c.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-bg/25">
              <span
                className={`block h-full bg-bg ${idx < i || fim ? "w-full" : idx === i ? "w-full origin-left" : "w-0"}`}
                style={
                  idx === i && !fim && !pausado
                    ? { animation: `reviver-barra ${DURACAO_MS}ms linear forwards` }
                    : undefined
                }
              />
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="tipo-caption m-0 truncate text-bg">{nome}</p>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar o Reviver"
            className="min-h-11 cursor-pointer border-0 bg-transparent px-3 text-bg"
          >
            Fechar
          </button>
        </div>

        {fim ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
            <h2 className="tipo-title m-0 text-bg">Que noite.</h2>
            <div className="flex gap-10">
              <span className="flex flex-col">
                <span className="tipo-title text-bg">{fotos}</span>
                <span className="tipo-caption text-bg/70">fotos</span>
              </span>
              <span className="flex flex-col">
                <span className="tipo-title text-bg">{pessoas}</span>
                <span className="tipo-caption text-bg/70">pessoas</span>
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5">
              <Link href={hrefAlbum} className={adminClasses.primaryButton}>
                Ver todas as fotos
              </Link>
              <button
                type="button"
                onClick={() => {
                  setFim(false);
                  setPausado(false);
                  setI(0);
                }}
                className={adminClasses.secondaryButton}
              >
                Ver de novo
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex-1 overflow-hidden">
            <img src={atual.capa.thumb} alt="" className="size-full object-cover" />

            <div className="absolute inset-0 flex">
              <button
                type="button"
                aria-label="Capítulo anterior"
                onClick={() => {
                  setPausado(false);
                  setI((a) => Math.max(0, a - 1));
                }}
                className="w-1/3 cursor-pointer border-0 bg-transparent"
              />
              <button
                type="button"
                aria-label={pausado ? "Continuar" : "Pausar"}
                onClick={() => setPausado((p) => !p)}
                className="w-1/3 cursor-pointer border-0 bg-transparent"
              />
              <button
                type="button"
                aria-label="Próximo capítulo"
                onClick={() => {
                  setPausado(false);
                  avancar();
                }}
                className="w-1/3 cursor-pointer border-0 bg-transparent"
              />
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink to-transparent p-[clamp(1.25rem,4vw,2rem)]">
              <p className="tipo-caption m-0 text-bg/70">
                {hora(atual.em, fuso)} · {atual.fotos} {atual.fotos === 1 ? "foto" : "fotos"}
              </p>
              <h2 className="tipo-subtitle m-0 mt-1 text-bg">{atual.titulo}</h2>
              <p className="tipo-body m-0 mt-1 max-w-[40ch] text-bg/80">
                {atual.descricao}
              </p>
            </div>

            {pausado && (
              <span className="tipo-caption absolute right-4 top-4 rounded-pilula bg-ink/60 px-3 py-1 text-bg">
                pausado
              </span>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
