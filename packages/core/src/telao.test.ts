import { describe, expect, it } from "vitest";
import {
  JANELA_RECENTE_MS,
  MODELOS_DE_TELAO,
  TETO_DO_CACHE,
  ehVertical,
  faixaDe,
  PERFIS,
  problemasDaEscolha,
  modeloCorta,
  modelosPermitidos,
  podarCache,
  pontuacaoPopular,
  proximaDoTelao,
  type ItemDoTelao,
} from "./telao";

const AGORA = new Date("2026-08-11T23:00:00Z");
const min = (n: number) => new Date(AGORA.getTime() - n * 60 * 1000);

function item(parcial: Partial<ItemDoTelao> & { id: string }): ItemDoTelao {
  return {
    criadaEm: min(1),
    exibicoes: 0,
    reacoes: 0,
    largura: 1080,
    altura: 1920,
    ...parcial,
  };
}

describe("nunca cortar na vertical", () => {
  it("cheio recusa foto em pé", () => {
    // A regra vermelha: 9:16 em 16:9 descarta o topo, que é onde estão as
    // cabeças. O produto decapitaria os convidados na parede.
    const emPe = item({ id: "a", largura: 1080, altura: 1920 });

    expect(ehVertical(emPe)).toBe(true);
    expect(modelosPermitidos(emPe)).not.toContain("cheio");
    expect(modeloCorta("cheio", emPe)).toBe(true);
  });

  it("todos os outros aceitam foto em pé", () => {
    const emPe = item({ id: "a", largura: 1080, altura: 1920 });

    for (const modelo of MODELOS_DE_TELAO.filter((m) => m !== "cheio")) {
      expect(modeloCorta(modelo, emPe), modelo).toBe(false);
    }
  });

  it("cheio aceita foto deitada", () => {
    const deitada = item({ id: "a", largura: 1920, altura: 1080 });

    expect(modelosPermitidos(deitada)).toContain("cheio");
    expect(modelosPermitidos(deitada)).toHaveLength(MODELOS_DE_TELAO.length);
  });

  it("quadrada também não vai para cheio", () => {
    // Sangrar uma quadrada em 16:9 corta as laterais. Menos grave que decapitar
    // e ainda assim corte — a spec diz "só foto horizontal".
    expect(modelosPermitidos(item({ id: "a", largura: 1000, altura: 1000 }))).not.toContain(
      "cheio",
    );
  });

  it("a fila filtra antes de sortear, não depois", () => {
    const so = proximaDoTelao(
      [item({ id: "vertical" }), item({ id: "deitada", largura: 1920, altura: 1080 })],
      { agora: AGORA, sorteio: () => 0, modelo: "cheio" },
    );

    expect(so?.id).toBe("deitada");
  });

  it("devolve nulo quando nenhuma foto cabe no modelo da vez", () => {
    expect(
      proximaDoTelao([item({ id: "a" }), item({ id: "b" })], {
        agora: AGORA,
        sorteio: () => 0,
        modelo: "cheio",
      }),
    ).toBeNull();
  });
});

describe("as três faixas", () => {
  it("classifica pela exibição antes da idade", () => {
    expect(faixaDe(item({ id: "a", exibicoes: 0, criadaEm: min(600) }), AGORA)).toBe(
      "nunca-exibida",
    );
  });

  it("recente é o que subiu dentro da janela", () => {
    expect(faixaDe(item({ id: "a", exibicoes: 2, criadaEm: min(1) }), AGORA)).toBe("recente");
    expect(
      faixaDe(
        item({ id: "b", exibicoes: 2, criadaEm: new Date(AGORA.getTime() - JANELA_RECENTE_MS - 1) }),
        AGORA,
      ),
    ).toBe("popular");
  });

  it("o sorteio respeita os pesos declarados", () => {
    const itens = [
      item({ id: "nova", exibicoes: 0 }),
      item({ id: "recente", exibicoes: 3, criadaEm: min(2) }),
      item({ id: "antiga", exibicoes: 3, criadaEm: min(300), reacoes: 40 }),
    ];

    expect(proximaDoTelao(itens, { agora: AGORA, sorteio: () => 0.1 })?.id).toBe("nova");
    expect(proximaDoTelao(itens, { agora: AGORA, sorteio: () => 0.6 })?.id).toBe("recente");
    expect(proximaDoTelao(itens, { agora: AGORA, sorteio: () => 0.9 })?.id).toBe("antiga");
  });

  it("faixa vazia cai para outra em vez de mostrar parede vazia", () => {
    const so = [item({ id: "unica", exibicoes: 0 })];

    for (const dado of [0.1, 0.6, 0.99]) {
      expect(proximaDoTelao(so, { agora: AGORA, sorteio: () => dado })?.id).toBe("unica");
    }
  });

  it("entre as nunca exibidas, a que espera há mais tempo vai primeiro", () => {
    // Ordenar pela mais nova deixaria a foto do começo da festa nunca subir.
    const escolhida = proximaDoTelao(
      [item({ id: "nova", criadaEm: min(1) }), item({ id: "velha", criadaEm: min(120) })],
      { agora: AGORA, sorteio: () => 0 },
    );

    expect(escolhida?.id).toBe("velha");
  });
});

describe("a popularidade se gasta", () => {
  it("decai por exibição, não só por tempo", () => {
    const base = { id: "a", criadaEm: min(5), reacoes: 20 };
    const virgem = pontuacaoPopular(item({ ...base, exibicoes: 0 }), AGORA);
    const gasta = pontuacaoPopular(item({ ...base, exibicoes: 9 }), AGORA);

    expect(gasta).toBeLessThan(virgem);
    expect(gasta).toBeCloseTo(virgem / 10, 5);
  });

  it("decai por tempo também", () => {
    const nova = pontuacaoPopular(item({ id: "a", criadaEm: min(0), reacoes: 20, exibicoes: 1 }), AGORA);
    const velha = pontuacaoPopular(item({ id: "b", criadaEm: min(180), reacoes: 20, exibicoes: 1 }), AGORA);

    expect(velha).toBeLessThan(nova);
  });

  it("a foto das 21h não fica na parede até as 3h", () => {
    // O caso que a spec nomeia: muita reação cedo, exibida muitas vezes.
    const das21 = item({ id: "das21", criadaEm: min(240), reacoes: 80, exibicoes: 12 });
    const recemChegada = item({ id: "nova", criadaEm: min(3), reacoes: 4, exibicoes: 1 });

    expect(pontuacaoPopular(das21, AGORA)).toBeLessThan(pontuacaoPopular(recemChegada, AGORA));
  });
});

describe("toda foto aparece pelo menos uma vez", () => {
  it("a parede drena as nunca exibidas", () => {
    // Verificação 6 da spec. Simula a noite: a cada rodada, a escolhida conta
    // mais uma exibição, e no fim ninguém pode ter ficado com zero.
    let itens = Array.from({ length: 25 }, (_, i) =>
      item({ id: `f${i}`, criadaEm: min(200 - i), reacoes: i % 7 }),
    );

    let semente = 7;
    const sorteio = () => {
      // Gerador determinístico simples: o teste não pode depender de sorte.
      semente = (semente * 1103515245 + 12345) % 2147483648;
      return semente / 2147483648;
    };

    for (let rodada = 0; rodada < 400; rodada += 1) {
      const escolhida = proximaDoTelao(itens, { agora: AGORA, sorteio });
      if (!escolhida) break;
      itens = itens.map((i) =>
        i.id === escolhida.id ? { ...i, exibicoes: i.exibicoes + 1 } : i,
      );
    }

    expect(itens.filter((i) => i.exibicoes === 0)).toEqual([]);
  });

  it("lista vazia devolve nulo em vez de estourar", () => {
    expect(proximaDoTelao([], { agora: AGORA })).toBeNull();
  });
});

describe("o cache tem teto duro", () => {
  it("guarda as mais novas até o teto", () => {
    // Com o cabo arrancado, o que a parede tem para mostrar é o fim da festa.
    const muitas = Array.from({ length: 120 }, (_, i) =>
      item({ id: `f${i}`, criadaEm: min(120 - i) }),
    );
    const podado = podarCache(muitas);

    expect(podado).toHaveLength(TETO_DO_CACHE);
    expect(podado[0]?.id).toBe("f119");
    expect(podado.map((i) => i.id)).not.toContain("f0");
  });

  it("não mexe quando cabe", () => {
    const poucas = [item({ id: "a" }), item({ id: "b" })];

    expect(podarCache(poucas)).toHaveLength(2);
  });

  it("não muta a lista de origem", () => {
    const original = Array.from({ length: 60 }, (_, i) => item({ id: `f${i}`, criadaEm: min(i) }));
    podarCache(original);

    expect(original).toHaveLength(60);
  });
});

describe("os oito modelos e a escolha do casal", () => {
  it("cheio é o único que recusa foto em pé", () => {
    const recusam = MODELOS_DE_TELAO.filter((m) => !PERFIS[m].aceitaEmPe);

    expect(recusam).toEqual(["cheio"]);
  });

  it("recusa escolha em que nenhum modelo aceita foto em pé", () => {
    // O defeito que isto impede é o pior tipo: o telão roda a noite inteira
    // parecendo funcionar, mostrando só o quarto deitado do acervo, e ninguém
    // descobre até o dia seguinte.
    expect(problemasDaEscolha(["cheio"])).toHaveLength(1);
    expect(problemasDaEscolha(["cheio"])[0]).toContain("em pé");
  });

  it("recusa escolha vazia", () => {
    expect(problemasDaEscolha([])).toEqual(["nenhum modelo escolhido"]);
  });

  it("aceita qualquer escolha com ao menos um que aceite em pé", () => {
    expect(problemasDaEscolha(["cheio", "polaroide"])).toEqual([]);
    expect(problemasDaEscolha(["dump"])).toEqual([]);
    expect(problemasDaEscolha([...MODELOS_DE_TELAO])).toEqual([]);
  });

  it("dump mostra muitas de uma vez e carrossel uma só", () => {
    expect(PERFIS.dump.fotos).toBeGreaterThan(PERFIS.carrossel.fotos);
    expect(PERFIS.carrossel.fotos).toBe(1);
  });
});

describe("TBT é seleção, não layout", () => {
  const acervo = [
    item({ id: "agora", criadaEm: min(1), exibicoes: 2 }),
    item({ id: "antiga", criadaEm: min(300), exibicoes: 2, reacoes: 30 }),
  ];

  it("puxa da faixa antiga, qualquer que seja o sorteio", () => {
    // Um modelo chamado retrospectiva que mostra a foto de cinco minutos atrás
    // não é retrospectiva de nada.
    for (const dado of [0, 0.3, 0.6, 0.99]) {
      expect(
        proximaDoTelao(acervo, { agora: AGORA, sorteio: () => dado, modelo: "tbt" })?.id,
      ).toBe("antiga");
    }
  });

  it("os outros modelos continuam sorteando", () => {
    expect(proximaDoTelao(acervo, { agora: AGORA, sorteio: () => 0.6, modelo: "polaroide" })?.id).toBe(
      "agora",
    );
  });

  it("tbt cai para outra faixa quando não há foto antiga", () => {
    const so = [item({ id: "unica", criadaEm: min(1), exibicoes: 0 })];

    expect(proximaDoTelao(so, { agora: AGORA, sorteio: () => 0, modelo: "tbt" })?.id).toBe("unica");
  });
});
