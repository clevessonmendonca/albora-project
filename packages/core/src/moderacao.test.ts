import { describe, expect, it } from "vitest";
import {
  DENUNCIAS_PARA_SEGURAR,
  decidirExibicao,
  precisaDeRevisao,
  registrarDecisao,
  type EstadoDaMidia,
  type EstadoDoEvento,
} from "./moderacao";

const CALMA: EstadoDoEvento = { panico: false, modoEndurecido: false };

function midia(parcial: Partial<EstadoDaMidia> = {}): EstadoDaMidia {
  return {
    classificador: "limpo",
    denuncias: 0,
    removida: false,
    liberadaPeloAnfitriao: false,
    ...parcial,
  };
}

describe("publicação automática é o padrão", () => {
  it("foto limpa aparece nas duas superfícies sem ninguém tocar", () => {
    // Verificação 1: fila de aprovação como padrão está fora de escopo, e um
    // controle que fica desligado não é controle.
    for (const superficie of ["galeria", "telao"] as const) {
      expect(decidirExibicao(midia(), CALMA, superficie)).toEqual({
        visivel: true,
        codigo: "moderacao.publicada",
      });
    }
  });
});

describe("a assimetria que decide", () => {
  it("classificador sem resposta: galeria publica, telão segura", () => {
    // Galeria é ativa, alguém escolheu abrir. Telão é passivo: 150 pessoas
    // estão olhando sem ter escolhido.
    const sem = midia({ classificador: "sem-resposta" });

    expect(decidirExibicao(sem, CALMA, "galeria").visivel).toBe(true);
    expect(decidirExibicao(sem, CALMA, "telao")).toEqual({
      visivel: false,
      codigo: "moderacao.classificador_sem_resposta",
    });
  });

  it("suspeito segura das duas, porque é sinal e não silêncio", () => {
    const suspeita = midia({ classificador: "suspeito" });

    for (const superficie of ["galeria", "telao"] as const) {
      expect(decidirExibicao(suspeita, CALMA, superficie).codigo).toBe(
        "moderacao.classificador_suspeito",
      );
    }
  });
});

describe("as 150 pessoas na sala", () => {
  it("duas denúncias tiram do telão sozinhas", () => {
    const denunciada = midia({ denuncias: DENUNCIAS_PARA_SEGURAR });

    expect(decidirExibicao(denunciada, CALMA, "telao")).toEqual({
      visivel: false,
      codigo: "moderacao.denuncias",
    });
  });

  it("uma só não tira: seria entregar a parede a qualquer desafeto", () => {
    expect(decidirExibicao(midia({ denuncias: 1 }), CALMA, "telao").visivel).toBe(true);
  });

  it("a denúncia não derruba a galeria", () => {
    // A spec diz "tiram do telão". Derrubar a galeria junto puniria quem
    // enviou por decisão de dois estranhos, sem revisão.
    expect(decidirExibicao(midia({ denuncias: 9 }), CALMA, "galeria").visivel).toBe(true);
  });
});

describe("o que um humano acabou de mandar fazer", () => {
  it("pânico pausa as duas superfícies", () => {
    for (const superficie of ["galeria", "telao"] as const) {
      expect(decidirExibicao(midia(), { ...CALMA, panico: true }, superficie)).toEqual({
        visivel: false,
        codigo: "moderacao.panico",
      });
    }
  });

  it("remoção vence tudo, inclusive a liberação do anfitrião", () => {
    const removida = midia({ removida: true, liberadaPeloAnfitriao: true });

    expect(decidirExibicao(removida, CALMA, "galeria").codigo).toBe("moderacao.removida");
  });

  it("pânico vence a liberação do anfitrião", () => {
    const liberada = midia({ liberadaPeloAnfitriao: true });

    expect(decidirExibicao(liberada, { ...CALMA, panico: true }, "telao").codigo).toBe(
      "moderacao.panico",
    );
  });

  it("liberação vence classificador, denúncia e modo endurecido", () => {
    // É o caminho do falso positivo, que a spec registra como o risco mais
    // provável: o anfitrião libera em um toque.
    const liberada = midia({
      liberadaPeloAnfitriao: true,
      classificador: "suspeito",
      denuncias: 5,
    });

    expect(
      decidirExibicao(liberada, { ...CALMA, modoEndurecido: true }, "telao"),
    ).toEqual({ visivel: true, codigo: "moderacao.liberada_pelo_anfitriao" });
  });
});

describe("modo endurecido", () => {
  it("ligado no meio da festa passa a exigir aprovação", () => {
    // Verificação 6. Vale para o que já estava limpo: o anfitrião ligou porque
    // algo aconteceu, e o que estava na fila é justamente o que preocupa.
    for (const superficie of ["galeria", "telao"] as const) {
      expect(decidirExibicao(midia(), { ...CALMA, modoEndurecido: true }, superficie)).toEqual({
        visivel: false,
        codigo: "moderacao.aguarda_aprovacao",
      });
    }
  });
});

describe("a fila de revisão", () => {
  it("junta denúncia, suspeita e modo endurecido", () => {
    expect(precisaDeRevisao(midia({ denuncias: 2 }), CALMA)).toBe(true);
    expect(precisaDeRevisao(midia({ classificador: "suspeito" }), CALMA)).toBe(true);
    expect(precisaDeRevisao(midia(), { ...CALMA, modoEndurecido: true })).toBe(true);
  });

  it("não pede revisão do que já foi resolvido", () => {
    expect(precisaDeRevisao(midia({ removida: true, denuncias: 9 }), CALMA)).toBe(false);
    expect(precisaDeRevisao(midia({ liberadaPeloAnfitriao: true, denuncias: 9 }), CALMA)).toBe(
      false,
    );
  });

  it("sem resposta do classificador não vira fila", () => {
    // Segurar do telão já é a resposta. Mandar para revisão faria a fila
    // encher de foto normal toda vez que o classificador ficasse lento — e a
    // premissa é que ninguém está olhando fila.
    expect(precisaDeRevisao(midia({ classificador: "sem-resposta" }), CALMA)).toBe(false);
  });

  it("com menores, a fila enxerga a foto que o telão segurou com 1 denúncia", () => {
    // Regressão: o limiar da fila tem de acompanhar o de `decidirExibicao`. Com
    // menores (ADR 0012) o telão segura em 1; a fila presa em 2 esconderia a
    // foto sem recurso.
    const uma = midia({ denuncias: 1 });

    expect(decidirExibicao(uma, CALMA, "telao", 1)).toEqual({
      visivel: false,
      codigo: "moderacao.denuncias",
    });
    expect(precisaDeRevisao(uma, CALMA, 1)).toBe(true);
    // Sem menores, 1 denúncia não segura nem revisa — o padrão continua 2.
    expect(precisaDeRevisao(uma, CALMA)).toBe(false);
  });
});

describe("a auditoria registra a decisão, não só a negativa", () => {
  it("grava o código também quando publicou", () => {
    const decisao = decidirExibicao(midia(), CALMA, "telao");
    const linha = registrarDecisao(
      { eventoId: "evt_1", midiaId: "mid_1", superficie: "telao", ator: "ses_opaca" },
      decisao,
      new Date("2026-08-11T23:41:00Z"),
    );

    expect(linha).toEqual({
      eventoId: "evt_1",
      midiaId: "mid_1",
      superficie: "telao",
      ator: "ses_opaca",
      visivel: true,
      codigo: "moderacao.publicada",
      em: "2026-08-11T23:41:00.000Z",
    });
  });

  it("a linha não tem campo para nome, telefone nem e-mail", () => {
    // Log com PII crua é violação, e auditoria é onde ela mais escapa porque
    // "é interno". O tipo não aceita a sessão inteira de propósito.
    const linha = registrarDecisao(
      { eventoId: "e", midiaId: "m", superficie: "galeria", ator: "ses_opaca" },
      decidirExibicao(midia(), CALMA, "galeria"),
      new Date(),
    );

    expect(Object.keys(linha).sort()).toEqual([
      "ator",
      "codigo",
      "em",
      "eventoId",
      "midiaId",
      "superficie",
      "visivel",
    ]);
  });
});
