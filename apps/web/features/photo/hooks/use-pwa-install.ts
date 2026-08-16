"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { funnelEventFromInstallChoice } from "@/features/guest/lib/funnel-client-events";
import { reportFunnel } from "@/features/guest/lib/report-funnel";

type PromptInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const COPY_CTA_PWA = "Instale e receba suas fotos depois da festa";
export const COPY_IOS_COMPARTILHAR = "Toque em Compartilhar";
export const COPY_IOS_TELA_INICIO = "Adicionar à Tela de Início";
export const COPY_DISPENSAR_CTA = "Agora não";

export const CHAVE_CTA_PWA_DISPENSADO = "albora.pwa-install.dispensado";

type NavegadorIos = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
};

const MODOS_INSTALADO = ["standalone", "fullscreen", "minimal-ui"] as const;

export type SinaisDePwaInstalado = {
  displayMode: (typeof MODOS_INSTALADO)[number] | null;
  safariStandalone: boolean;
};

export function sinaisDePwaInstalado(win: Window): SinaisDePwaInstalado {
  const displayMode =
    MODOS_INSTALADO.find((modo) => win.matchMedia(`(display-mode: ${modo})`).matches) ?? null;
  const nav = win.navigator as Navigator & { standalone?: boolean };
  return { displayMode, safariStandalone: nav.standalone === true };
}

export function pwaJaInstalado(sinais: SinaisDePwaInstalado): boolean {
  return sinais.safariStandalone || sinais.displayMode !== null;
}

export function precisaInstrucaoIos(nav: NavegadorIos): boolean {
  if (/iPhone|iPod/i.test(nav.userAgent)) return true;
  if (/iPad/i.test(nav.userAgent)) return true;
  return nav.platform === "MacIntel" && nav.maxTouchPoints > 1;
}

export function ctaDispensadoNestaSessao(storage: Pick<Storage, "getItem">): boolean {
  try {
    return storage.getItem(CHAVE_CTA_PWA_DISPENSADO) === "1";
  } catch {
    return false;
  }
}

export function marcarCtaDispensado(storage: Pick<Storage, "setItem">): void {
  try {
    storage.setItem(CHAVE_CTA_PWA_DISPENSADO, "1");
  } catch {
    /* navegação privada: o estado React ainda segura a sessão atual */
  }
}

export function primeiraFotoConfirmada(enviadas: number, pendentes: number): boolean {
  return enviadas === 1 && pendentes === 0;
}

export function deveMostrarCtaPwa(opts: {
  enviadas: number;
  pendentes: number;
  jaInstalado: boolean;
  dispensado: boolean;
  promptNativo: boolean;
  precisaInstrucaoIos: boolean;
}): boolean {
  if (!primeiraFotoConfirmada(opts.enviadas, opts.pendentes)) return false;
  if (opts.jaInstalado || opts.dispensado) return false;
  return opts.promptNativo || opts.precisaInstrucaoIos;
}

/**
 * Captura o prompt nativo no Android e decide se o iOS precisa da instrução
 * manual (Compartilhar → Tela de Início). O CTA em si só aparece depois do
 * confirm da primeira foto — quem chama aplica `deveMostrarCtaPwa`.
 */
export function usePwaInstall() {
  const promptRef = useRef<PromptInstalacao | null>(null);
  const promptIosRef = useRef(false);
  const [disponivel, setDisponivel] = useState(false);
  const [jaInstalado, setJaInstalado] = useState(false);
  const [precisaIos, setPrecisaIos] = useState(false);
  const [dispensado, setDispensado] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setJaInstalado(pwaJaInstalado(sinaisDePwaInstalado(window)));
    setPrecisaIos(precisaInstrucaoIos(navigator));
    setDispensado(ctaDispensadoNestaSessao(sessionStorage));
    setPronto(true);

    const capturar = (evento: Event) => {
      evento.preventDefault();
      promptRef.current = evento as PromptInstalacao;
      setDisponivel(true);
      reportFunnel("install_prompt");
    };

    const instalou = () => {
      promptRef.current = null;
      setDisponivel(false);
      setJaInstalado(true);
    };

    window.addEventListener("beforeinstallprompt", capturar);
    window.addEventListener("appinstalled", instalou);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturar);
      window.removeEventListener("appinstalled", instalou);
    };
  }, []);

  const instalar = useCallback(async (): Promise<boolean> => {
    const prompt = promptRef.current;
    if (!prompt) return false;

    await prompt.prompt();
    const escolha = await prompt.userChoice;
    reportFunnel(funnelEventFromInstallChoice(escolha.outcome));
    if (escolha.outcome === "accepted") {
      promptRef.current = null;
      setDisponivel(false);
      setJaInstalado(true);
      return true;
    }
    marcarCtaDispensado(sessionStorage);
    setDispensado(true);
    return false;
  }, []);

  const dispensar = useCallback(() => {
    marcarCtaDispensado(sessionStorage);
    setDispensado(true);
    reportFunnel("install_dismiss");
  }, []);

  const avisarPromptIos = useCallback(() => {
    if (promptIosRef.current) return;
    promptIosRef.current = true;
    reportFunnel("install_prompt");
  }, []);

  return {
    disponivel,
    jaInstalado,
    precisaInstrucaoIos: precisaIos,
    dispensado,
    pronto,
    instalar,
    dispensar,
    avisarPromptIos,
  };
}
