import { describe, expect, it } from "vitest";
import {
  compartilhamentoExternoPadrao,
  denunciasParaSegurar,
  gateComecaFechado,
  padroesDoEvento,
} from "./menores";
import { DENUNCIAS_PARA_SEGURAR, decidirExibicao } from "./moderacao";

const COM = { haMenores: true };
const SEM = { haMenores: false };

const CALMA = { panico: false, modoEndurecido: false };
const midia = (denuncias: number) => ({
  classificador: "limpo" as const,
  denuncias,
  removida: false,
  liberadaPeloAnfitriao: false,
});

describe("o interruptor sobe o piso sem marcar ninguém", () => {
  it("com menores, uma denúncia já segura", () => {
    // A assimetria de custo inverte: segurar por engano custa um toque para
    // liberar, publicar por engano não tem desfazer.
    expect(denunciasParaSegurar(COM)).toBe(1);
    expect(denunciasParaSegurar(SEM)).toBe(DENUNCIAS_PARA_SEGURAR);
  });

  it("com menores, compartilhar para fora nasce desligado", () => {
    expect(compartilhamentoExternoPadrao(COM)).toBe(false);
    expect(compartilhamentoExternoPadrao(SEM)).toBe(true);
  });

  it("com menores, o gate começa fechado", () => {
    expect(gateComecaFechado(COM)).toBe(true);
    expect(gateComecaFechado(SEM)).toBe(false);
  });

  it("os três padrões saem juntos", () => {
    // O admin escreve a configuração inicial de uma vez: consultar três
    // funções é como esquecer a terceira.
    expect(padroesDoEvento(COM)).toEqual({
      denunciasParaSegurar: 1,
      compartilhamentoExterno: false,
      gateComecaFechado: true,
    });
  });
});

describe("o limiar chega na decisão de exibição", () => {
  it("uma denúncia tira da parede quando há menores", () => {
    expect(
      decidirExibicao(midia(1), CALMA, "telao", denunciasParaSegurar(COM)).codigo,
    ).toBe("moderacao.denuncias");
  });

  it("uma denúncia não tira quando não há", () => {
    expect(decidirExibicao(midia(1), CALMA, "telao", denunciasParaSegurar(SEM)).visivel).toBe(
      true,
    );
  });

  it("sem o quarto argumento, o comportamento é o de antes", () => {
    // Quem já chamava com três argumentos não pode mudar de comportamento por
    // causa deste ADR — senão a mudança vaza para evento sem menor.
    expect(decidirExibicao(midia(1), CALMA, "telao").visivel).toBe(true);
    expect(decidirExibicao(midia(2), CALMA, "telao").visivel).toBe(false);
  });

  it("o limiar não afeta a galeria, só a parede", () => {
    // A denúncia tira do telão, não da galeria: derrubar a galeria puniria
    // quem enviou por decisão de estranhos, sem revisão.
    expect(
      decidirExibicao(midia(9), CALMA, "galeria", denunciasParaSegurar(COM)).visivel,
    ).toBe(true);
  });
});
