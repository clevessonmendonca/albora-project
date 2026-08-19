"use client";

import { useEffect, useRef, useState } from "react";
import type { ViaDeEntrada } from "@albora/core";
import { eventEntryPath, extractSlug } from "@/lib/qr";

const FORMATO_QR = "qr_code";
const INTERVALO_LEITURA = 350;
const QUADRO_PRONTO = 2;

type CodigoDetectado = { rawValue: string };
type DetectorDeCodigo = { detect(fonte: CanvasImageSource): Promise<CodigoDetectado[]> };
type ConstrutorDetector = {
  new (opcoes: { formats: string[] }): DetectorDeCodigo;
  getSupportedFormats?: () => Promise<string[]>;
};

/**
 * `via` distingue câmera lida de código digitado — bug de instrumentação
 * (`goToEvent` gravava `qr` para os dois casos) inflava `entradasPorVia.qr`
 * com gente que nunca abriu a câmera.
 */
export function goToEvent(slug: string, via: ViaDeEntrada) {
  window.location.href = eventEntryPath(slug, via);
}

export function useScanQr() {
  const [codigo, setCodigo] = useState("");
  const [naoEntendi, setNaoEntendi] = useState(false);
  const [podeEscanear, setPodeEscanear] = useState(false);
  const [escaneando, setEscaneando] = useState(false);

  const campo = useRef<HTMLInputElement>(null);
  const visor = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let vivo = true;
    void aparelhoDecodificaQr().then((pode) => {
      if (vivo) setPodeEscanear(pode);
    });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!escaneando) return;

    let vivo = true;
    let fluxo: MediaStream | null = null;
    let relogio: number | undefined;

    function encerrar() {
      if (relogio !== undefined) window.clearInterval(relogio);
      relogio = undefined;
      fluxo?.getTracks().forEach((trilha) => trilha.stop());
      fluxo = null;
    }

    async function abrir() {
      const Detector = construtorDetector();
      if (Detector === null) {
        if (vivo) setEscaneando(false);
        return;
      }

      try {
        fluxo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
      } catch {
        if (vivo) {
          setEscaneando(false);
          setPodeEscanear(false);
          campo.current?.focus();
        }
        return;
      }

      if (!vivo) {
        encerrar();
        return;
      }

      const elemento = visor.current;
      if (elemento !== null) {
        elemento.srcObject = fluxo;
        await elemento.play().catch(() => undefined);
      }

      const detector = new Detector({ formats: [FORMATO_QR] });

      relogio = window.setInterval(() => {
        void procurar(detector, visor.current, (slug) => {
          encerrar();
          setEscaneando(false);
          goToEvent(slug, "qr");
        });
      }, INTERVALO_LEITURA);
    }

    void abrir();

    return () => {
      vivo = false;
      encerrar();
    };
  }, [escaneando]);

  function enviarCodigo(evento?: React.FormEvent) {
    evento?.preventDefault();
    const slug = extractSlug(codigo);
    if (slug === null) {
      setNaoEntendi(true);
      return;
    }
    goToEvent(slug, "code");
  }

  return {
    codigo,
    setCodigo,
    naoEntendi,
    setNaoEntendi,
    podeEscanear,
    escaneando,
    setEscaneando,
    campo,
    visor,
    enviarCodigo,
  };
}

function construtorDetector(): ConstrutorDetector | null {
  if (typeof window === "undefined") return null;
  if (typeof navigator.mediaDevices?.getUserMedia !== "function") return null;
  const global = window as unknown as { BarcodeDetector?: ConstrutorDetector };
  return global.BarcodeDetector ?? null;
}

async function aparelhoDecodificaQr(): Promise<boolean> {
  const Detector = construtorDetector();
  if (Detector === null) return false;
  if (typeof Detector.getSupportedFormats !== "function") return true;
  try {
    return (await Detector.getSupportedFormats()).includes(FORMATO_QR);
  } catch {
    return false;
  }
}

async function procurar(
  detector: DetectorDeCodigo,
  elemento: HTMLVideoElement | null,
  achou: (slug: string) => void,
): Promise<void> {
  if (elemento === null || elemento.readyState < QUADRO_PRONTO) return;

  let codigos: CodigoDetectado[];
  try {
    codigos = await detector.detect(elemento);
  } catch {
    return;
  }

  for (const item of codigos) {
    const slug = extractSlug(item.rawValue);
    if (slug !== null) {
      achou(slug);
      return;
    }
  }
}
