"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { funnelEventFromInstallChoice } from "@/features/guest/lib/funnel-client-events";
import { reportFunnel } from "@/features/guest/lib/report-funnel";

type PromptInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Captura o prompt nativo de instalação do PWA quando o navegador oferece.
 *
 * No iOS não há evento — quem chama decide mostrar instrução manual ou nada.
 */
export function usePwaInstall() {
  const promptRef = useRef<PromptInstalacao | null>(null);
  const [disponivel, setDisponivel] = useState(false);

  useEffect(() => {
    const capturar = (evento: Event) => {
      evento.preventDefault();
      promptRef.current = evento as PromptInstalacao;
      setDisponivel(true);
      reportFunnel("install_prompt");
    };

    window.addEventListener("beforeinstallprompt", capturar);
    return () => window.removeEventListener("beforeinstallprompt", capturar);
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
      return true;
    }
    return false;
  }, []);

  return { disponivel, instalar };
}
