import { instanteDaParede } from "./tempo";
import { OFFSET_PADRAO_MINUTOS } from "./types";

/** IANA do salão quando o anfitrião não escolhe outro. */
export const FUSO_PADRAO = "America/Sao_Paulo";

export const FUSOS_DO_EVENTO = [
  { id: "America/Sao_Paulo", rotulo: "Brasília" },
  { id: "America/Fortaleza", rotulo: "Fortaleza" },
  { id: "America/Manaus", rotulo: "Manaus" },
  { id: "America/Cuiaba", rotulo: "Cuiabá" },
  { id: "America/Rio_Branco", rotulo: "Rio Branco" },
  { id: "America/Noronha", rotulo: "Fernando de Noronha" },
] as const;

export type FusoDoEvento = (typeof FUSOS_DO_EVENTO)[number]["id"];

export function fusoIanaValido(fuso: string): boolean {
  if (typeof fuso !== "string" || fuso.length < 3 || fuso.length > 64) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: fuso });
    return true;
  } catch {
    return false;
  }
}

export function fusoOuPadrao(fuso: string | null | undefined): string {
  return fuso && fusoIanaValido(fuso) ? fuso : FUSO_PADRAO;
}

/**
 * Offset civil do IANA naquele instante. Sem DST no Brasil o número é estável;
 * fora dele (Honolulu, Nova York no verão) muda, e é isso que o álbum precisa
 * para a faixa das 5h não cair na hora de Brasília.
 */
export function offsetMinutosDoFuso(fuso: string, instante: Date): number {
  const iana = fusoOuPadrao(fuso);
  const nome = new Intl.DateTimeFormat("en-US", {
    timeZone: iana,
    timeZoneName: "longOffset",
  })
    .formatToParts(instante)
    .find((p) => p.type === "timeZoneName")?.value;

  if (!nome) return OFFSET_PADRAO_MINUTOS;

  const m = /([+-])(\d{1,2})(?::(\d{2}))?/.exec(nome);
  if (!m) return nome === "GMT" || nome === "UTC" ? 0 : OFFSET_PADRAO_MINUTOS;

  const sinal = m[1] === "-" ? -1 : 1;
  return sinal * (Number(m[2]) * 60 + Number(m[3] ?? "0"));
}

/**
 * Parede do EXIF (componentes UTC = relógio da câmera) vira instante no IANA
 * do evento. Recalcula o offset no resultado para não errar a virada de DST.
 */
export function instanteDaParedeNoFuso(parede: Date, fuso: string): Date {
  const primeiro = instanteDaParede(parede, offsetMinutosDoFuso(fuso, parede));
  const offsetNoInstante = offsetMinutosDoFuso(fuso, primeiro);
  if (offsetNoInstante === offsetMinutosDoFuso(fuso, parede)) return primeiro;
  return instanteDaParede(parede, offsetNoInstante);
}

const NAIVE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * `datetime-local` (`YYYY-MM-DDTHH:mm`) é parede no fuso do evento. ISO com
 * offset (`Z` ou `±hh:mm`) permanece instante absoluto.
 */
export function instanteLocalNoFuso(valor: string, fuso: string): Date | null {
  const naive = NAIVE.exec(valor);
  if (naive) {
    const parede = new Date(
      Date.UTC(
        Number(naive[1]),
        Number(naive[2]) - 1,
        Number(naive[3]),
        Number(naive[4]),
        Number(naive[5]),
        Number(naive[6] ?? "0"),
      ),
    );
    if (Number.isNaN(parede.getTime())) return null;
    return instanteDaParedeNoFuso(parede, fuso);
  }

  const em = new Date(valor);
  return Number.isNaN(em.getTime()) ? null : em;
}
