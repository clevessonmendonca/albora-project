"use client";

import Image from "next/image";
import React, {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";

/**
 * Prévia local do álbum — porte da demo do protótipo (personalizar pelo nome,
 * alternar álbum/telão, enviar uma foto de exemplo) para React controlado.
 * Nada sai do navegador: é uma demonstração, sem cadastro e sem upload real.
 * Estado compartilhado entre o formulário e o álbum, por isso um único client.
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
  fotoExemplo,
  telaoVars,
  qr,
}: {
  nomeExemplo: string;
  albumSub: string;
  placeholder: string;
  fotos: readonly FotoDemo[];
  fotoExemplo: FotoDemo;
  /** Recorte de tokens escuro aplicado ao álbum no modo "No telão" — sem isso
   *  var(--bg)/var(--ink) resolveriam claro (a seção vive em escopo light). */
  telaoVars: CSSProperties;
  qr: ReactNode;
}) {
  const [titulo, setTitulo] = useState(nomeExemplo);
  const [view, setView] = useState<"album" | "tela">("album");
  const [enviada, setEnviada] = useState(false);
  const [status, setStatus] = useState("Experimente enviar a primeira foto.");

  const inputRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLDivElement>(null);
  const enviarRef = useRef<HTMLButtonElement>(null);
  const inputId = useId();

  const totalFotos = enviada ? fotos.length + 1 : fotos.length;

  function personalizar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = inputRef.current;
    if (!input) return;
    const valor = input.value.trim();
    if (!valor) {
      input.setCustomValidity("Digite o nome da sua festa.");
      input.reportValidity();
      return;
    }
    input.setCustomValidity("");
    setTitulo(valor);
    setStatus("Sua prévia está pronta. Envie uma foto de exemplo.");
    const reduz =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    albumRef.current?.scrollIntoView?.({
      behavior: reduz ? "auto" : "smooth",
      block: "center",
    });
    enviarRef.current?.focus({ preventScroll: true });
  }

  function alternarEnvio() {
    setEnviada((antes) => {
      const agora = !antes;
      setStatus(
        agora
          ? "Foto de exemplo adicionada. É assim que o álbum ganha novos olhares."
          : "Prévia reiniciada. Envie outra foto de exemplo.",
      );
      return agora;
    });
  }

  return (
    <div className="grid items-start gap-[clamp(2rem,6vw,5rem)] lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="tipo-label uppercase text-acento-texto">Veja antes da festa</p>
        <h2
          className="tipo-display m-0 mt-4 font-light text-balance"
          style={{ fontSize: "clamp(2rem,4vw,3rem)" }}
        >
          Do celular deles.{" "}
          <em className="font-normal italic text-acento-texto">Para o seu álbum.</em>
        </h2>
        <p className="mt-6 max-w-[45ch] text-[1.05rem] leading-relaxed text-ink-2">
          Na festa, o convidado abre o QR Code e envia uma foto. Teste com o nome
          da sua festa e adicione uma foto de exemplo.
        </p>

        <ol className="m-0 mt-7 grid list-decimal gap-3.5 pl-[1.375rem] text-[0.9375rem] text-ink-2 marker:text-acento-texto">
          {PASSOS.map((passo) => (
            <li key={passo}>{passo}</li>
          ))}
        </ol>

        <form onSubmit={personalizar} className="my-[1.625rem]">
          <label htmlFor={inputId} className="mb-3 block font-semibold text-ink">
            Qual é o nome da sua festa?
          </label>
          <input
            ref={inputRef}
            id={inputId}
            name="event"
            required
            maxLength={60}
            autoComplete="off"
            placeholder={placeholder}
            onInput={(event) => event.currentTarget.setCustomValidity("")}
            className="w-full rounded-superficie border border-ink-borda-forte bg-superficie-alta p-4 text-ink caret-acento outline-none placeholder:text-ink-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-acento"
          />
          <button
            type="submit"
            className="pilula mt-4 inline-flex w-full items-center justify-center rounded-pilula border border-ink-borda-forte px-6 py-3.5 font-medium text-ink no-underline"
          >
            Personalizar o álbum →
          </button>
        </form>

        <button
          ref={enviarRef}
          type="button"
          onClick={alternarEnvio}
          className="pilula inline-flex w-full items-center justify-center rounded-pilula bg-ink px-6 py-3.5 font-medium text-bg no-underline"
        >
          {enviada ? "Recomeçar demonstração" : "Enviar uma foto de exemplo"}
        </button>

        <p className="mt-3.5 text-[0.8125rem] leading-normal text-ink-2">
          Prévia local, sem cadastro. Usamos apenas fotos de exemplo.
        </p>
        <p className="demo-status m-0 mt-1 text-ink-2" role="status" aria-live="polite">
          {status}
        </p>

        {qr}
      </div>

      <div
        ref={albumRef}
        className={`demo-album${view === "tela" ? " demo-album-tela" : ""}`}
        style={view === "tela" ? telaoVars : undefined}
        role="group"
        aria-label="Prévia de um álbum coletivo"
      >
        <div className="demo-album-top">
          <span>Álbum de exemplo</span>
          <span>{totalFotos} fotos</span>
        </div>
        <h3 className="tipo-display m-0 mt-6 text-[clamp(1.5rem,3vw,2rem)] font-normal">
          {titulo}
        </h3>
        <p className="demo-album-sub m-0 mt-1 text-sm text-ink-3">{albumSub}</p>

        <div
          className="demo-visao"
          role="group"
          aria-label="Visualização da demonstração"
        >
          <button
            type="button"
            aria-pressed={view === "album"}
            onClick={() => setView("album")}
          >
            No álbum
          </button>
          <button
            type="button"
            aria-pressed={view === "tela"}
            onClick={() => setView("tela")}
          >
            No telão
          </button>
        </div>

        <div className="demo-galeria">
          {fotos.map((foto) => (
            <div className="demo-foto" key={foto.src}>
              <Image
                src={foto.src}
                alt={foto.alt}
                fill
                sizes="(max-width: 760px) 40vw, 220px"
                className="object-cover"
              />
            </div>
          ))}
          {enviada ? (
            <div className="demo-foto">
              <Image
                src={fotoExemplo.src}
                alt={fotoExemplo.alt}
                fill
                sizes="(max-width: 760px) 40vw, 220px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="demo-foto demo-vazia">
              <span>Sua próxima lembrança</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
