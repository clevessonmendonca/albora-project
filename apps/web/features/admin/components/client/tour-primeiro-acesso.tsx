"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "@albora/ui-web";
import { adminClasses } from "@/features/admin/components/server/admin-shell";
import { marcarPassoDoTour } from "@/features/admin/lib/marcar-preparo";

/** Os seis passos do protótipo. Ordem e texto são a spec; não inventar. */
const PASSOS = [
  {
    id: "criado",
    titulo: "Seu evento está criado",
    texto: "Agora seus convidados vão registrar a festa junto com vocês.",
  },
  {
    id: "qr",
    titulo: "Este é o seu QR",
    texto: "Você imprime e coloca nas mesas. É a porta de entrada.",
  },
  {
    id: "entra",
    titulo: "O convidado entra sem app",
    texto: "Aponta a câmera, abre o evento. Sem baixar nada, sem cadastro.",
  },
  {
    id: "envia",
    titulo: "Envia uma foto",
    texto: "E ela aparece no álbum na mesma hora.",
  },
  {
    id: "telao",
    titulo: "E no telão",
    texto: "As fotos aparecem no salão enquanto a festa acontece.",
  },
  {
    id: "viver",
    titulo: "Depois, é só viver",
    texto:
      "Você acompanha tudo por aqui — ou simplesmente aproveita. O Álbora cuida do resto.",
  },
] as const;

export const TOTAL_DE_PASSOS = PASSOS.length;

/**
 * Tour de primeiro acesso.
 *
 * Descartável a qualquer momento e retomável de onde parou, porque o
 * progresso vive no evento e não no navegador — tour que recomeça do zero ao
 * trocar de aparelho é o mesmo erro do checklist antigo.
 *
 * Gravar é enriquecimento: se a rede cair, o tour continua funcionando e só
 * perde a memória do passo. Nada aqui pode travar quem quer usar o painel.
 */
export function TourDePrimeiroAcesso({
  eventoId,
  passoInicial,
  imagem,
}: {
  eventoId: string;
  passoInicial: number;
  imagem: string;
}) {
  const [passo, setPasso] = useState(Math.min(passoInicial, PASSOS.length - 1));
  const [aberto, setAberto] = useState(true);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  const gravar = useCallback(
    (valor: number | true) => marcarPassoDoTour(eventoId, valor),
    [eventoId],
  );

  const encerrar = useCallback(() => {
    setAberto(false);
    gravar(true);
  }, [gravar]);

  const avancar = useCallback(() => {
    if (passo >= PASSOS.length - 1) {
      encerrar();
      return;
    }
    const proximo = passo + 1;
    setPasso(proximo);
    gravar(proximo);
  }, [passo, encerrar, gravar]);

  // O leitor de tela precisa ouvir o passo novo; sem isto a troca é silenciosa.
  useEffect(() => {
    tituloRef.current?.focus();
  }, [passo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") avancar();
      if (e.key === "ArrowLeft") setPasso((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [avancar]);

  const atual = PASSOS[passo];
  if (!aberto || !atual) return null;
  const ultimo = passo === PASSOS.length - 1;

  return (
    <Dialog open={aberto} onClose={encerrar} aria-labelledby="tour-titulo">
      <div className="elev-2 mx-auto flex w-full max-w-[26rem] flex-col overflow-hidden rounded-superficie border border-linha bg-superficie">
        {imagem && (
          <img
            src={imagem}
            alt=""
            className="h-[clamp(8rem,26vw,11rem)] w-full object-cover object-top"
          />
        )}

        <div className="flex flex-col gap-4 p-6">
          <div className="flex gap-1.5" aria-hidden>
            {PASSOS.map((p, i) => (
              <span
                key={p.id}
                className={`h-1 flex-1 rounded-full ${i <= passo ? "bg-acento" : "bg-superficie-alta"}`}
              />
            ))}
          </div>

          <div>
            <h2
              id="tour-titulo"
              ref={tituloRef}
              tabIndex={-1}
              className="tipo-subtitle m-0 text-ink outline-none"
            >
              {atual.titulo}
            </h2>
            <p className="tipo-body m-0 mt-2 text-ink-2">{atual.texto}</p>
          </div>

          <p className="tipo-caption m-0 text-ink-3" aria-live="polite">
            Passo {passo + 1} de {PASSOS.length}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={avancar} className={adminClasses.primaryButton}>
              {ultimo ? "Começar" : "Continuar"}
            </button>
            {!ultimo && (
              <button
                type="button"
                onClick={encerrar}
                className="tipo-caption min-h-11 cursor-pointer border-0 bg-transparent px-2 text-ink-3 hover:text-ink"
              >
                Pular
              </button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
