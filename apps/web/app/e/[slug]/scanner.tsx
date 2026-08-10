"use client";

import { useEffect, useRef, useState } from "react";
import { caminhoDoEvento, extrairSlug } from "@/lib/qr";

/**
 * A saída de toda tela sem saída.
 *
 * Mandar escanear o QR de novo sem dar como custa participação: a pessoa teria
 * de sair do navegador, abrir a câmera do sistema e reachar a placa — e numa
 * festa boa parte simplesmente para aí. Isso pesa mais na N1.5, onde a placa já
 * saiu da gráfica e o QR na mão da pessoa é o velho.
 *
 * Duas camadas, nesta ordem de importância:
 *
 * 1. O campo de código, sempre presente. O slug vai impresso ao lado do QR
 *    (N1.4), custa zero byte e é o único caminho que sobrevive à permissão de
 *    câmera negada — que é cenário documentado deste produto (N5.1).
 * 2. O botão de escanear, só onde o aparelho decodifica sozinho via
 *    `BarcodeDetector`. Sem ele o botão abriria a câmera para não decodificar
 *    nada, o que é pior que não existir.
 */

const FORMATO_QR = "qr_code";

/** ~3 leituras por segundo. Cadência de vídeo aqui é bateria, não precisão. */
const INTERVALO_LEITURA = 350;

/** `HAVE_CURRENT_DATA`: antes disso não há quadro para ler. */
const QUADRO_PRONTO = 2;

type CodigoDetectado = { rawValue: string };

type DetectorDeCodigo = { detect(fonte: CanvasImageSource): Promise<CodigoDetectado[]> };

type ConstrutorDetector = {
  new (opcoes: { formats: string[] }): DetectorDeCodigo;
  getSupportedFormats?: () => Promise<string[]>;
};

export function Resgate() {
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
      // Câmera viva em segundo plano numa festa de seis horas é bateria do
      // convidado, e é a bateria que decide se ele ainda fotografa à meia-noite.
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
        // Permissão negada cai direto no campo de código, sem tela de erro no
        // meio — é a mesma regra da N5.1.
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
          window.location.href = caminhoDoEvento(slug);
        });
      }, INTERVALO_LEITURA);
    }

    void abrir();

    return () => {
      vivo = false;
      encerrar();
    };
  }, [escaneando]);

  function digitou(evento: React.FormEvent) {
    evento.preventDefault();

    const slug = extrairSlug(codigo);
    if (slug === null) {
      setNaoEntendi(true);
      return;
    }

    window.location.href = caminhoDoEvento(slug);
  }

  return (
    <section className="resgate">
      <style>{ESTILO}</style>

      <p className="resgate-rotulo">Código da mesa</p>

      <form onSubmit={digitou} className="resgate-linha">
        <input
          ref={campo}
          className="resgate-campo"
          value={codigo}
          onChange={(evento) => {
            setCodigo(evento.target.value);
            setNaoEntendi(false);
          }}
          placeholder="o código impresso"
          maxLength={80}
          required
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-label="Código da mesa"
        />
        <button type="submit" className="resgate-primario" disabled={codigo.trim().length === 0}>
          Entrar
        </button>
      </form>

      {naoEntendi && (
        <p role="alert" className="resgate-recado">
          Esse código não parece certo. Confira as letras impressas na mesa.
        </p>
      )}

      {podeEscanear && !escaneando && (
        <button type="button" className="resgate-fino" onClick={() => setEscaneando(true)}>
          Escanear o QR
        </button>
      )}

      {escaneando && (
        <div className="resgate-visor">
          <video ref={visor} muted playsInline aria-label="Câmera apontada para o QR" />
          <span className="resgate-mira" />
        </div>
      )}

      {escaneando && (
        <>
          <p className="resgate-dica">Aponte para o QR da mesa.</p>
          <button type="button" className="resgate-fino" onClick={() => setEscaneando(false)}>
            Cancelar
          </button>
        </>
      )}
    </section>
  );
}

function construtorDetector(): ConstrutorDetector | null {
  if (typeof window === "undefined") return null;
  if (typeof navigator.mediaDevices?.getUserMedia !== "function") return null;

  const global = window as unknown as { BarcodeDetector?: ConstrutorDetector };
  return global.BarcodeDetector ?? null;
}

/**
 * Pergunta ao aparelho, não ao user-agent.
 *
 * Existe navegador que expõe `BarcodeDetector` sem trazer o formato QR — e ali
 * o botão abriria a câmera para nunca achar nada.
 */
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
    // Quadro escuro, foco ruim, mão tremendo. Tenta no próximo.
    return;
  }

  for (const codigo of codigos) {
    const slug = extrairSlug(codigo.rawValue);
    if (slug !== null) {
      achou(slug);
      return;
    }
  }
}

const ESTILO = `
.resgate {
  margin-top: calc(var(--espaco) * 10);
  padding-top: calc(var(--espaco) * 8);
  border-top: 1px solid var(--linha);
  text-align: left;
  display: grid;
  gap: calc(var(--espaco) * 3);
}
.resgate-rotulo {
  margin: 0;
  font-family: var(--fonte-titulo);
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.resgate-linha {
  display: flex;
  align-items: flex-end;
  gap: calc(var(--espaco) * 3);
}
.resgate-campo {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 54px;
  font-family: var(--fonte-titulo);
  font-size: 1.3rem;
  font-weight: 300;
  color: var(--ink);
  background: transparent;
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--linha);
  padding: calc(var(--espaco) * 2) 2px calc(var(--espaco) * 3);
  outline: none;
  transition: border-color 300ms ease;
}
.resgate-campo::placeholder {
  color: var(--ink-3);
  font-style: italic;
}
.resgate-campo:focus {
  border-bottom-color: var(--acento);
}
.resgate-primario {
  flex: 0 0 auto;
  font: inherit;
  font-size: 1rem;
  font-weight: 500;
  min-height: 54px;
  padding: 0 calc(var(--espaco) * 6);
  border: none;
  border-radius: var(--raio);
  background: var(--ink);
  color: var(--bg);
  cursor: pointer;
  transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1);
}
.resgate-primario:disabled {
  opacity: 0.45;
  cursor: default;
}
.resgate-primario:active:not(:disabled) {
  transform: scale(0.977);
}
.resgate-fino {
  font: inherit;
  font-size: 0.95rem;
  min-height: 54px;
  padding: 0 calc(var(--espaco) * 5);
  background: transparent;
  color: var(--ink-2);
  border: 1px solid var(--linha);
  border-radius: var(--raio);
  cursor: pointer;
}
.resgate-primario:focus-visible,
.resgate-fino:focus-visible {
  outline: 1px solid var(--acento);
  outline-offset: 4px;
}
.resgate-recado {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--critico);
}
.resgate-dica {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-2);
}
.resgate-visor {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: var(--raio);
  overflow: hidden;
  background: var(--superficie);
}
.resgate-visor video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.resgate-mira {
  position: absolute;
  inset: 15%;
  border: 1px solid var(--acento);
  border-radius: var(--raio);
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .resgate-campo,
  .resgate-primario {
    transition: none;
  }
  .resgate-primario:active:not(:disabled) {
    transform: none;
  }
}
`;
