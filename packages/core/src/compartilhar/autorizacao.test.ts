import { describe, expect, it } from "vitest";
import {
  pendenciaDeConsentimento,
  autorizarCompartilhamento,
  midiasCompartilhaveis,
  autorizarColagem,
} from "./autorizacao";
import { VERSAO_DO_CONSENTIMENTO_EXTERNO, MAX_DA_COLAGEM } from "./types";
import type {
  SessaoQueCompartilha,
  MidiaParaCompartilhar,
  EventoQueCompartilha,
} from "./types";

const AGORA = new Date("2026-09-01T23:00:00Z");
const EVENTO_ID = "evt-1";

function sessao(overrides: Partial<SessaoQueCompartilha> = {}): SessaoQueCompartilha {
  return {
    sessaoId: "s1",
    eventoId: EVENTO_ID,
    nome: "Ana",
    consentimentoDeEntrada: { versao: "v1", em: new Date("2026-09-01T20:00:00Z") },
    consentimentoExterno: {
      versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
      em: new Date("2026-09-01T21:00:00Z"),
      revogadoEm: null,
      nomeNaMoldura: true,
    },
    ...overrides,
  };
}

function midiaCompartilhavel(overrides: Partial<MidiaParaCompartilhar> = {}): MidiaParaCompartilhar {
  return {
    id: "m1",
    eventoId: EVENTO_ID,
    sessaoDeOrigem: "s1",
    largura: 1080,
    altura: 1920,
    legenda: null,
    estado: {
      classificador: "limpo",
      denuncias: 0,
      removida: false,
      liberadaPeloAnfitriao: false,
    },
    ...overrides,
  };
}

const EVENTO: EventoQueCompartilha = {
  panico: false,
  modoEndurecido: false,
  compartilhamentoExternoLiberado: true,
};

describe("pendenciaDeConsentimento", () => {
  it("null quando consentimento válido", () => {
    expect(pendenciaDeConsentimento(sessao(), AGORA)).toBeNull();
  });

  it("sem consentimento externo", () => {
    expect(pendenciaDeConsentimento(sessao({ consentimentoExterno: null }), AGORA))
      .toBe("compartilhar.sem_consentimento_externo");
  });

  it("consentimento desatualizado", () => {
    const s = sessao({
      consentimentoExterno: {
        versao: "v-antigo",
        em: new Date("2026-09-01T21:00:00Z"),
        revogadoEm: null,
        nomeNaMoldura: true,
      },
    });
    expect(pendenciaDeConsentimento(s, AGORA)).toBe("compartilhar.consentimento_desatualizado");
  });

  it("consentimento revogado", () => {
    const s = sessao({
      consentimentoExterno: {
        versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
        em: new Date("2026-09-01T21:00:00Z"),
        revogadoEm: new Date("2026-09-01T22:00:00Z"),
        nomeNaMoldura: true,
      },
    });
    expect(pendenciaDeConsentimento(s, AGORA)).toBe("compartilhar.consentimento_revogado");
  });

  it("consentimento com data futura", () => {
    const s = sessao({
      consentimentoExterno: {
        versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
        em: new Date("2030-01-01T00:00:00Z"),
        revogadoEm: null,
        nomeNaMoldura: true,
      },
    });
    expect(pendenciaDeConsentimento(s, AGORA)).toBe("compartilhar.consentimento_sem_data");
  });
});

describe("autorizarCompartilhamento", () => {
  it("autoriza mídia válida", () => {
    const resultado = autorizarCompartilhamento(midiaCompartilhavel(), sessao(), EVENTO, AGORA);
    expect(resultado.pode).toBe(true);
    expect(resultado.codigo).toBe("compartilhar.autorizado");
  });

  it("recusa evento diferente", () => {
    const m = midiaCompartilhavel({ eventoId: "outro-evento" });
    const resultado = autorizarCompartilhamento(m, sessao(), EVENTO, AGORA);
    expect(resultado.pode).toBe(false);
    expect(resultado.codigo).toBe("compartilhar.evento_diferente");
  });

  it("recusa quando não é autor", () => {
    const m = midiaCompartilhavel({ sessaoDeOrigem: "s-outro" });
    const resultado = autorizarCompartilhamento(m, sessao(), EVENTO, AGORA);
    expect(resultado.pode).toBe(false);
    expect(resultado.codigo).toBe("compartilhar.nao_e_autor");
  });

  it("recusa quando compartilhamento desligado", () => {
    const eventoDesligado = { ...EVENTO, compartilhamentoExternoLiberado: false };
    const resultado = autorizarCompartilhamento(midiaCompartilhavel(), sessao(), eventoDesligado, AGORA);
    expect(resultado.pode).toBe(false);
    expect(resultado.codigo).toBe("compartilhar.desligado_pelo_anfitriao");
  });

  it("recusa mídia removida", () => {
    const m = midiaCompartilhavel({
      estado: { classificador: "limpo", denuncias: 0, removida: true, liberadaPeloAnfitriao: false },
    });
    const resultado = autorizarCompartilhamento(m, sessao(), EVENTO, AGORA);
    expect(resultado.pode).toBe(false);
    expect(resultado.codigo).toBe("compartilhar.bloqueado_pela_moderacao");
  });

  it("recusa mídia em pânico", () => {
    const eventoPanico = { ...EVENTO, panico: true };
    const resultado = autorizarCompartilhamento(midiaCompartilhavel(), sessao(), eventoPanico, AGORA);
    expect(resultado.pode).toBe(false);
    expect(resultado.codigo).toBe("compartilhar.bloqueado_pela_moderacao");
  });
});

describe("midiasCompartilhaveis", () => {
  it("filtra apenas mídias autorizadas", () => {
    const midias = [
      midiaCompartilhavel({ id: "m1" }),
      midiaCompartilhavel({ id: "m2", sessaoDeOrigem: "s-outro" }),
      midiaCompartilhavel({ id: "m3" }),
    ];
    const resultado = midiasCompartilhaveis(midias, sessao(), EVENTO, AGORA);
    expect(resultado.map((m) => m.id)).toEqual(["m1", "m3"]);
  });

  it("retorna vazio quando nenhuma autorizada", () => {
    const midias = [midiaCompartilhavel({ sessaoDeOrigem: "s-outro" })];
    const resultado = midiasCompartilhaveis(midias, sessao(), EVENTO, AGORA);
    expect(resultado).toHaveLength(0);
  });
});

describe("autorizarColagem", () => {
  it("autoriza colagem válida", () => {
    const midias = [midiaCompartilhavel({ id: "m1" }), midiaCompartilhavel({ id: "m2" })];
    const resultado = autorizarColagem(midias, sessao(), EVENTO, AGORA);
    expect(resultado.pode).toBe(true);
  });

  it("recusa colagem vazia", () => {
    const resultado = autorizarColagem([], sessao(), EVENTO, AGORA);
    expect(resultado.pode).toBe(false);
    expect(resultado.codigo).toBe("compartilhar.colagem_vazia");
  });

  it("recusa colagem grande demais", () => {
    const midias = Array.from({ length: MAX_DA_COLAGEM + 1 }, (_, i) =>
      midiaCompartilhavel({ id: `m${i}` }),
    );
    const resultado = autorizarColagem(midias, sessao(), EVENTO, AGORA);
    expect(resultado.pode).toBe(false);
    expect(resultado.codigo).toBe("compartilhar.colagem_grande_demais");
  });

  it("recusa se qualquer mídia não autorizada", () => {
    const midias = [
      midiaCompartilhavel({ id: "m1" }),
      midiaCompartilhavel({ id: "m2", sessaoDeOrigem: "s-outro" }),
    ];
    const resultado = autorizarColagem(midias, sessao(), EVENTO, AGORA);
    expect(resultado.pode).toBe(false);
    expect(resultado.codigo).toBe("compartilhar.nao_e_autor");
  });
});
