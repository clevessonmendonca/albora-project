"use client";

import React, {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@albora/ui-web";
import { fireLandingProduct } from "./landing-product";
import { Frame, lightPillClasses, pillClasses, radiusStyle, transition } from "./pieces";
import { Qr } from "./showcases";

/**
 * A demo interativa "primeira foto sem app" (feature D3 do mapa de crescimento).
 *
 * A maior objeção do casal é "meus convidados vão instalar um aplicativo?".
 * O ADR 0008 já resolve isso no produto — a primeira foto nunca passa por
 * loja de app nem login — mas a landing só afirmava em texto. Aqui o
 * visitante toca os quatro passos com as próprias mãos, num telefone
 * desenhado na tela, e não pede nada que a sessão do convidado também não
 * pede: sem e-mail, sem senha, sem instalar nada até o fim.
 *
 * A foto que o visitante escolhe no passo 3 nunca sai do navegador — é um
 * `URL.createObjectURL` local, nunca um upload. Uma demo que fingisse subir
 * a foto de alguém para provar um ponto seria o próprio problema que o
 * produto resolve.
 */

type DemoStep = "qr" | "nome" | "foto" | "pronto";

const STEPS: readonly { id: DemoStep; label: string }[] = [
  { id: "qr", label: "O QR" },
  { id: "nome", label: "O nome" },
  { id: "foto", label: "A foto" },
  { id: "pronto", label: "No álbum" },
];

function stepIndexOf(step: DemoStep): number {
  return STEPS.findIndex((s) => s.id === step);
}

function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto aspect-[9/19] w-[min(16.5rem,72vw)] rounded-superficie bg-gradient-device p-2 shadow-alta">
      <div
        className="relative flex h-full w-full flex-col overflow-hidden bg-bg text-ink"
        style={radiusStyle("calc(var(--raio-superficie) - 0.5rem)")}
      >
        {children}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: DemoStep }) {
  const current = stepIndexOf(step);

  return (
    <div className="mb-6 flex items-center gap-2.5" role="list" aria-label="Passos da demonstração">
      {STEPS.map((s, i) => (
        <div key={s.id} role="listitem" className="flex flex-1 items-center gap-2.5 last:flex-initial">
          <span
            aria-current={i === current ? "step" : undefined}
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-full border font-titulo text-[0.75rem]",
              i <= current
                ? "border-acento bg-acento text-sobre-acento"
                : "border-linha bg-transparent text-ink-3",
            )}
            style={transition("all", "var(--tempo)")}
          >
            {i + 1}
          </span>
          <span className={cn("hidden text-[0.8125rem] sm:inline", i <= current ? "text-ink" : "text-ink-3")}>
            {s.label}
          </span>
          {i < STEPS.length - 1 ? (
            <span
              aria-hidden="true"
              className={cn("h-px flex-1", i < current ? "bg-acento" : "bg-linha")}
              style={transition("background-color", "var(--tempo)")}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function FirstPhotoDemo({ packHint }: { packHint?: string }) {
  const [step, setStep] = useState<DemoStep>("qr");
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const nameInputId = useId();
  const fileInputId = useId();

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function setPhoto(url: string | null) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (url) objectUrlRef.current = url;
    setPhotoUrl(url);
  }

  function goBack() {
    const i = stepIndexOf(step);
    if (i > 0) setStep(STEPS[i - 1]!.id);
  }

  function handleScan() {
    setStep("nome");
  }

  function handleNameSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!name.trim()) return;
    setStep("foto");
  }

  function reachAlbum() {
    setStep("pronto");
    fireLandingProduct("landing_demo", packHint);
  }

  function handleFile(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setPhoto(URL.createObjectURL(file));
    reachAlbum();
  }

  function handleSkipPhoto() {
    setPhoto(null);
    reachAlbum();
  }

  function handleReset() {
    setStep("qr");
    setName("");
    setPhoto(null);
  }

  const firstName = name.trim().split(/\s+/)[0] || "você";

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(15.625rem,1fr))] items-center gap-[clamp(1.5rem,4vw,3rem)]">
      <PhoneShell>
        {step === "qr" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-5 text-center">
            <Qr size="min(7.5rem, 55%)" />
            <p className="m-0 leading-[1.4] text-ink-2">
              Aponta a câmera, sem baixar nada
            </p>
            <button type="button" onClick={handleScan} className={cn(pillClasses, "px-5 py-3 text-[0.84375rem]")}>
              Simular leitura do QR
            </button>
          </div>
        ) : null}

        {step === "nome" ? (
          <form
            onSubmit={handleNameSubmit}
            className="flex flex-1 flex-col justify-center gap-3 p-5"
          >
            <label htmlFor={nameInputId} className="text-[0.8125rem] text-ink-2">
              Seu primeiro nome
            </label>
            <input
              id={nameInputId}
              type="text"
              autoFocus
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              placeholder="Ex.: Ana"
              className="rounded-token border border-linha bg-bg px-3.5 py-3 text-ink outline-none"
              style={transition("border-color", "var(--tempo-rapido)")}
            />
            <p className="m-0 text-[0.75rem] leading-[1.4] text-ink-3">
              Só isso. Nada de e-mail, nada de senha — este nome e este aparelho já são a sua sessão.
            </p>
            <button
              type="submit"
              disabled={!name.trim()}
              className={cn(pillClasses, "px-5 py-3 text-[0.84375rem] disabled:opacity-40")}
            >
              Entrar na festa
            </button>
            <button type="button" onClick={goBack} className="text-[0.75rem] text-ink-3 underline">
              Voltar ao QR
            </button>
          </form>
        ) : null}

        {step === "foto" ? (
          <div className="flex flex-1 flex-col justify-center gap-3 p-5 text-center">
            <p className="m-0 text-[0.8125rem] text-ink-2">Oi, {firstName}. Sua primeira foto:</p>
            <label
              htmlFor={fileInputId}
              className={cn(pillClasses, "cursor-pointer px-5 py-3 text-[0.84375rem]")}
            >
              Tirar ou escolher uma foto
            </label>
            <input
              id={fileInputId}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="sr-only"
            />
            <button type="button" onClick={handleSkipPhoto} className="text-[0.75rem] text-ink-3 underline">
              Prefiro só simular
            </button>
            <p className="m-0 text-[0.6875rem] leading-[1.4] text-ink-3">
              Essa foto fica só no seu navegador. É uma demonstração — nada é enviado a lugar nenhum.
            </p>
            <button type="button" onClick={goBack} className="text-[0.75rem] text-ink-3 underline">
              Voltar
            </button>
          </div>
        ) : null}

        {step === "pronto" ? (
          <div className="relative flex flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              <Frame
                label="Sua foto entraria aqui"
                radius="0rem"
                {...(photoUrl ? { src: photoUrl } : {})}
              />
            </div>
            <div className="flex items-center gap-2.5 p-3.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-acento text-[0.75rem] text-sobre-acento">
                ✓
              </span>
              <p className="m-0 text-[0.75rem] leading-[1.3] text-ink-2">No álbum. Sem instalar nada.</p>
            </div>
          </div>
        ) : null}
      </PhoneShell>

      <div>
        <Stepper step={step} />

        {step !== "pronto" ? (
          <p className="m-0 max-w-[30ch] leading-normal text-ink-2">
            Toque nos passos ao lado como se fosse o celular de um convidado. É exatamente o que
            ele vê — nada foi encurtado para a demonstração.
          </p>
        ) : (
          <>
            <p className="m-0 max-w-[34ch] leading-normal text-ink-2">
              Prontinho, {firstName}. Sua foto já estaria no álbum, e ninguém pediu e-mail, senha
              ou uma loja de aplicativo para isso acontecer.
            </p>
            <p className="m-0 mt-3 max-w-[34ch] text-[0.84375rem] leading-normal text-ink-3">
              Se depois alguém quiser guardar as próprias fotos, o convite para o aplicativo
              aparece só a partir desse primeiro envio.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className={cn(lightPillClasses, "mt-5 px-5 py-3 text-[0.84375rem]")}
            >
              Refazer a demonstração
            </button>
          </>
        )}
      </div>
    </div>
  );
}
