import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, type QueueItem } from "./fila";
import {
  aplicarReacao,
  contagemVisivel,
  contarReacoes,
  montarGaleria,
  podeReagir,
  podeRemover,
  removerReacao,
  resumirGaleria,
  type MidiaEnviada,
} from "./galeria";

const EVENTO = "evt_1";
const AGORA = new Date("2026-08-11T23:00:00Z");
const min = (n: number) => new Date(AGORA.getTime() - n * 60 * 1000);

function enviada(id: string, minutos: number): MidiaEnviada {
  return { id, chave: `events/${EVENTO}/${id}.jpg`, criadaEm: min(minutos) };
}

function naFila(id: string, minutos: number, tentativas = 0, eventoId = EVENTO): QueueItem {
  return {
    id,
    eventoId,
    corpo: { tipo: "arquivo", caminho: `/tmp/${id}`, bytes: 1024 },
    mime: "image/jpeg",
    criadoEm: min(minutos).getTime(),
    tentativas,
  };
}

describe("a galeria mostra o que ainda não subiu", () => {
  it("junta o confirmado e o pendente numa lista só", () => {
    // Separar em duas listas obrigaria o convidado a somar de cabeça para
    // responder "mandei tudo?".
    const galeria = montarGaleria([enviada("a", 10)], [naFila("b", 5)], EVENTO);

    expect(galeria.map((i) => i.id)).toEqual(["b", "a"]);
    expect(galeria.map((i) => i.estado)).toEqual(["subindo", "enviada"]);
  });

  it("três pendentes sobrevivem a matar o app", () => {
    // A prova 5 da spec, que é a que justifica a galeria existir.
    const galeria = montarGaleria([], [naFila("a", 3), naFila("b", 2), naFila("c", 1)], EVENTO);

    expect(resumirGaleria(galeria)).toEqual({ total: 3, enviadas: 0, subindo: 3, falhou: 0 });
  });

  it("item que estourou as tentativas aparece como falha, não some", () => {
    const galeria = montarGaleria([], [naFila("a", 1, MAX_ATTEMPTS)], EVENTO);

    expect(galeria[0]?.estado).toBe("falhou");
    expect(galeria[0]?.tentativas).toBe(MAX_ATTEMPTS);
  });

  it("uma tentativa antes do teto ainda é subindo", () => {
    const galeria = montarGaleria([], [naFila("a", 1, MAX_ATTEMPTS - 1)], EVENTO);

    expect(galeria[0]?.estado).toBe("subindo");
  });

  it("não conta em dobro entre o confirm e a limpeza da fila", () => {
    // O confirm é idempotente pelo id do cliente: por um instante o mesmo
    // item existe nos dois lados, e mostrá-lo duas vezes faria o convidado
    // achar que mandou em dobro.
    const galeria = montarGaleria([enviada("a", 5)], [naFila("a", 5)], EVENTO);

    expect(galeria).toHaveLength(1);
    expect(galeria[0]?.estado).toBe("enviada");
  });

  it("não vaza pendente de outro evento", () => {
    const galeria = montarGaleria([], [naFila("a", 1), naFila("b", 1, 0, "evt_2")], EVENTO);

    expect(galeria.map((i) => i.id)).toEqual(["a"]);
  });

  it("ordena da mais nova para a mais velha, misturando as origens", () => {
    const galeria = montarGaleria(
      [enviada("velha", 60), enviada("media", 30)],
      [naFila("nova", 1), naFila("antiga", 90)],
      EVENTO,
    );

    expect(galeria.map((i) => i.id)).toEqual(["nova", "media", "velha", "antiga"]);
  });

  it("galeria vazia resume em zeros", () => {
    expect(resumirGaleria(montarGaleria([], [], EVENTO))).toEqual({
      total: 0,
      enviadas: 0,
      subindo: 0,
      falhou: 0,
    });
  });
});

describe("reagir nunca espera o gate (ADR 0009, atualizado)", () => {
  const aberto = { interacaoAbreEm: min(10) };
  const fechado = { interacaoAbreEm: new Date(AGORA.getTime() + 60 * 60 * 1000) };
  const semData = { interacaoAbreEm: null };

  it("o botão e a contagem aparecem antes do gate", () => {
    // Só o comentário espera o horário que o casal escolheu — reagir é
    // liberado assim que a mídia publica, gate aberto ou não.
    for (const evento of [fechado, semData]) {
      expect(podeReagir(evento, AGORA)).toBe(true);
      expect(contagemVisivel(evento, AGORA)).toBe(true);
    }
  });

  it("e continuam depois do gate", () => {
    expect(podeReagir(aberto, AGORA)).toBe(true);
    expect(contagemVisivel(aberto, AGORA)).toBe(true);
  });
});

describe("reagir duas vezes é reagir uma vez", () => {
  const uma = { sessaoId: "s1", midiaId: "m1", tipo: "estrela" };

  it("toque duplo não infla a contagem", () => {
    const depois = aplicarReacao(aplicarReacao([], uma), uma);

    expect(contarReacoes(depois, "m1")).toBe(1);
  });

  it("trocar o tipo substitui, não soma", () => {
    const depois = aplicarReacao(aplicarReacao([], uma), { ...uma, tipo: "riso" });

    expect(contarReacoes(depois, "m1")).toBe(1);
    expect(depois[0]?.tipo).toBe("riso");
  });

  it("sessões diferentes somam", () => {
    const depois = aplicarReacao(aplicarReacao([], uma), { ...uma, sessaoId: "s2" });

    expect(contarReacoes(depois, "m1")).toBe(2);
  });

  it("remover tira só a da própria sessão", () => {
    const duas = aplicarReacao(aplicarReacao([], uma), { ...uma, sessaoId: "s2" });
    const depois = removerReacao(duas, "s1", "m1");

    expect(contarReacoes(depois, "m1")).toBe(1);
    expect(depois[0]?.sessaoId).toBe("s2");
  });

  it("remover o que não existe não quebra nem muda nada", () => {
    expect(removerReacao([uma], "s9", "m1")).toEqual([uma]);
  });

  it("a contagem é por foto", () => {
    const duas = aplicarReacao(aplicarReacao([], uma), { ...uma, midiaId: "m2" });

    expect(contarReacoes(duas, "m1")).toBe(1);
    expect(contarReacoes(duas, "m2")).toBe(1);
  });
});

describe("remover a própria foto", () => {
  it("a sessão dona pode", () => {
    expect(podeRemover("s1", "s1")).toBe(true);
  });

  it("sessão alheia não pode", () => {
    // O token autoriza remover a própria mídia, e nada além (ADR 0004).
    expect(podeRemover("s1", "s2")).toBe(false);
  });
});
