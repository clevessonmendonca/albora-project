import { maiorPerda, type PerdaEntre } from "./funnel";

/**
 * Aquisição → conversão. É outro funil que o do convidado
 * (`ESPINHA_DO_FUNIL`, QR→foto): aquele mede uso de um evento, este mede
 * negócio da plataforma. Misturar os dois numa tela só responde as duas
 * perguntas pela metade.
 *
 * Os nomes são os de `product_events` — a fonte é a tabela, não uma
 * modelagem paralela que envelheceria sozinha.
 */
export const ESPINHA_COMERCIAL = [
  "account_created",
  "event_created",
  "qr_downloaded",
  "checkout_started",
  "checkout_paid",
] as const;

export type EtapaComercial = (typeof ESPINHA_COMERCIAL)[number];

export type DegrauComercial = {
  etapa: EtapaComercial;
  eventos: number;
  /** Fração que sobreviveu do degrau anterior. `null` no primeiro e quando o anterior é zero. */
  retencao: number | null;
};

export type PerdaComercial = PerdaEntre<EtapaComercial>;

/**
 * Degrau ausente em `product_events` conta zero, não some: um funil com
 * buraco no meio esconde exatamente o degrau que precisa de conserto.
 */
export function funilComercial(porNome: Readonly<Record<string, number>>): DegrauComercial[] {
  const resultado: DegrauComercial[] = [];
  let anterior: number | null = null;

  for (const etapa of ESPINHA_COMERCIAL) {
    const eventos = Math.max(0, Math.trunc(porNome[etapa] ?? 0));
    resultado.push({
      etapa,
      eventos,
      retencao: anterior === null || anterior === 0 ? null : eventos / anterior,
    });
    anterior = eventos;
  }

  return resultado;
}

export function maiorPerdaComercial(passos: readonly DegrauComercial[]): PerdaComercial | null {
  return maiorPerda(passos.map((d) => ({ etapa: d.etapa, sessoes: d.eventos })));
}
