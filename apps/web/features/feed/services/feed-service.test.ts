import { describe, it, expect } from "vitest";
import {
  calcularJanelaPrefetch,
  validarIndice,
  proximoIndice,
  indiceAnterior,
  formatarContagemReacoes,
  deveNotificarNovosItens,
  calcularTempoRelativo,
} from "./feed-service";
import type { ItemVisivel } from "../hooks/use-feed";

describe("feed-service", () => {
  describe("calcularJanelaPrefetch", () => {
    it("retorna array vazio para lista vazia", () => {
      expect(calcularJanelaPrefetch([], 0)).toEqual([]);
    });

    it("retorna chaves para janela ao redor do índice", () => {
      const itens: ItemVisivel[] = [
        { id: "1", chaveThumb: "thumb1", chaveFull: "full1", mime: "image/jpeg", autor: "A", legenda: null, lugar: null, criadaEm: new Date().toISOString() },
        { id: "2", chaveThumb: "thumb2", chaveFull: "full2", mime: "image/jpeg", autor: "A", legenda: null, lugar: null, criadaEm: new Date().toISOString() },
        { id: "3", chaveThumb: "thumb3", chaveFull: "full3", mime: "image/jpeg", autor: "A", legenda: null, lugar: null, criadaEm: new Date().toISOString() },
      ];
      
      const result = calcularJanelaPrefetch(itens, 1, 1);
      expect(result).toContain("thumb1");
      expect(result).toContain("thumb2");
      expect(result).toContain("thumb3");
    });

    it("inclui poster para vídeos", () => {
      const itens: ItemVisivel[] = [
        {
          id: "1",
          chaveThumb: "thumb1",
          chaveFull: "full1",
          chavePoster: "poster1",
          mime: "video/mp4",
          autor: "A",
          legenda: null,
          lugar: null,
          criadaEm: new Date().toISOString(),
        },
      ];
      
      const result = calcularJanelaPrefetch(itens, 0, 1);
      expect(result).toContain("full1");
      expect(result).toContain("poster1");
    });
  });

  describe("validarIndice", () => {
    it("retorna true para índice válido", () => {
      expect(validarIndice(0, 5)).toBe(true);
      expect(validarIndice(4, 5)).toBe(true);
    });

    it("retorna false para índice inválido", () => {
      expect(validarIndice(-1, 5)).toBe(false);
      expect(validarIndice(5, 5)).toBe(false);
    });
  });

  describe("proximoIndice", () => {
    it("incrementa o índice", () => {
      expect(proximoIndice(0, 5)).toBe(1);
      expect(proximoIndice(3, 5)).toBe(4);
    });

    it("faz wrap around no final", () => {
      expect(proximoIndice(4, 5)).toBe(0);
    });
  });

  describe("indiceAnterior", () => {
    it("decrementa o índice", () => {
      expect(indiceAnterior(1, 5)).toBe(0);
      expect(indiceAnterior(4, 5)).toBe(3);
    });

    it("faz wrap around no início", () => {
      expect(indiceAnterior(0, 5)).toBe(4);
    });
  });

  describe("formatarContagemReacoes", () => {
    it("retorna string vazia para zero", () => {
      expect(formatarContagemReacoes(0)).toBe("");
    });

    it("retorna número direto para valores pequenos", () => {
      expect(formatarContagemReacoes(42)).toBe("42");
      expect(formatarContagemReacoes(999)).toBe("999");
    });

    it("formata milhares com 'k'", () => {
      expect(formatarContagemReacoes(1500)).toBe("1.5k");
      expect(formatarContagemReacoes(9999)).toBe("10.0k");
      expect(formatarContagemReacoes(10000)).toBe("10k");
    });
  });

  describe("deveNotificarNovosItens", () => {
    it("retorna false se não há ID anterior", () => {
      expect(deveNotificarNovosItens(null, "novo", 200)).toBe(false);
    });

    it("retorna false se IDs são iguais", () => {
      expect(deveNotificarNovosItens("id1", "id1", 200)).toBe(false);
    });

    it("retorna false se usuário está no topo", () => {
      expect(deveNotificarNovosItens("id1", "id2", 50)).toBe(false);
    });

    it("retorna true se ID mudou e usuário não está no topo", () => {
      expect(deveNotificarNovosItens("id1", "id2", 200)).toBe(true);
    });
  });

  describe("calcularTempoRelativo", () => {
    it("retorna 'agora' para tempos muito recentes", () => {
      const agora = new Date().toISOString();
      expect(calcularTempoRelativo(agora)).toBe("agora");
    });

    it("retorna minutos para tempos recentes", () => {
      const data = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(calcularTempoRelativo(data)).toBe("5m");
    });

    it("retorna horas para períodos de horas", () => {
      const data = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      expect(calcularTempoRelativo(data)).toBe("3h");
    });

    it("retorna dias para períodos de dias", () => {
      const data = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(calcularTempoRelativo(data)).toBe("2d");
    });
  });
});
