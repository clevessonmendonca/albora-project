import { describe, expect, it } from "vitest";
import {
  CONCESSOES_DA_PAREDE,
  VALIDADE_DA_PAREDE_HORAS,
  autorizarParede,
  expiraEmPara,
  type CrachaDaParede,
} from "./parede";

const AGORA = new Date("2026-08-11T23:00:00Z");
const hora = (n: number) => new Date(AGORA.getTime() + n * 60 * 60 * 1000);

function cracha(parcial: Partial<CrachaDaParede> = {}): CrachaDaParede {
  return { eventoId: "evt_1", expiraEm: hora(6), revogado: false, ...parcial };
}

const LER = { eventoId: "evt_1", concessao: "ler.midia.publicada" };

describe("o crachá não escreve nada", () => {
  it("nenhuma concessão de escrita existe na lista", () => {
    // É isto que faz o crachá ser seguro de deixar numa TV pendurada: mesmo
    // copiado, ele não sobe, não reage, não comenta e não remove.
    for (const concessao of CONCESSOES_DA_PAREDE) {
      expect(concessao.startsWith("ler.")).toBe(true);
    }
  });

  it("recusa concessão que não está na lista", () => {
    for (const tentativa of ["escrever.midia", "midia.remover", "reagir", ""]) {
      expect(
        autorizarParede(cracha(), { eventoId: "evt_1", concessao: tentativa }, AGORA).codigo,
      ).toBe("parede.concessao_negada");
    }
  });

  it("autoriza o que está na lista", () => {
    for (const concessao of CONCESSOES_DA_PAREDE) {
      expect(
        autorizarParede(cracha(), { eventoId: "evt_1", concessao }, AGORA).autorizado,
      ).toBe(true);
    }
  });
});

describe("preso a um evento", () => {
  it("recusa crachá de outra festa", () => {
    // Vazamento entre eventos é o que o CLAUDE.md chama de irreversível.
    const veredicto = autorizarParede(cracha(), { ...LER, eventoId: "evt_2" }, AGORA);

    expect(veredicto).toEqual({ autorizado: false, codigo: "parede.evento_divergente" });
  });

  it("evento divergente vem antes de expiração e revogação", () => {
    // É a tentativa que mais interessa registrar, então não pode ser mascarada
    // por um código menos grave.
    const podre = cracha({ revogado: true, expiraEm: hora(-1) });

    expect(autorizarParede(podre, { ...LER, eventoId: "evt_2" }, AGORA).codigo).toBe(
      "parede.evento_divergente",
    );
  });
});

describe("o crachá acaba", () => {
  it("recusa depois de expirar", () => {
    expect(autorizarParede(cracha({ expiraEm: hora(-1) }), LER, AGORA).codigo).toBe(
      "parede.expirada",
    );
  });

  it("o instante exato da expiração já é fora", () => {
    expect(autorizarParede(cracha({ expiraEm: AGORA }), LER, AGORA).autorizado).toBe(false);
  });

  it("revogado recusa mesmo dentro da validade", () => {
    expect(autorizarParede(cracha({ revogado: true }), LER, AGORA).codigo).toBe(
      "parede.revogada",
    );
  });

  it("a validade cobre a noite inteira sem virar link permanente", () => {
    const emitido = new Date("2026-08-11T18:00:00Z");

    expect(expiraEmPara(emitido).getTime() - emitido.getTime()).toBe(
      VALIDADE_DA_PAREDE_HORAS * 60 * 60 * 1000,
    );
    // Emitido às 18h, ainda vale às 3h da manhã; não vale no dia seguinte.
    expect(autorizarParede(cracha({ expiraEm: expiraEmPara(emitido) }), LER, new Date("2026-08-12T03:00:00Z")).autorizado).toBe(true);
    expect(autorizarParede(cracha({ expiraEm: expiraEmPara(emitido) }), LER, new Date("2026-08-12T12:00:00Z")).autorizado).toBe(false);
  });
});
