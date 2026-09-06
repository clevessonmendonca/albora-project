import { describe, expect, it } from "vitest";
import {
  ALTURA_DA_COMPOSICAO,
  ALTURA_DA_FAIXA,
  areaDaFoto,
  autorizarColagem,
  autorizarCompartilhamento,
  caixaDaFoto,
  celulasDaColagem,
  cobreSemPerderTopo,
  compor,
  conteudoDaMoldura,
  encaixar,
  faixaDaMarca,
  LARGURA_DA_COMPOSICAO,
  MAX_DA_COLAGEM,
  midiasCompartilhaveis,
  modelosDeMolduraPermitidos,
  modeloRecomendado,
  MODELOS_DE_MOLDURA,
  molduraCorta,
  pendenciaDeConsentimento,
  problemasDaComposicao,
  recorte,
  VERSAO_DO_CONSENTIMENTO_EXTERNO,
  type Composicao,
  type Dimensoes,
  type EventoQueCompartilha,
  type IdentidadeDoEvento,
  type MidiaParaCompartilhar,
  type ModeloDeMoldura,
  type SessaoQueCompartilha,
} from "./compartilhar";
import { decidirExibicao, type EstadoDaMidia } from "./moderacao";
import { modelosPermitidos } from "./wall-display";

const AGORA = new Date("2026-08-08T23:00:00.000Z");
const ONTEM = new Date("2026-08-07T20:00:00.000Z");

const EVENTO_LIBERADO: EventoQueCompartilha = {
  panico: false,
  modoEndurecido: false,
  compartilhamentoExternoLiberado: true,
};

const IDENTIDADE: IdentidadeDoEvento = {
  monograma: "AM",
  titulo: "A & M",
  data: "08.08.2026",
  slug: "a-e-m",
};

function estado(parcial: Partial<EstadoDaMidia> = {}): EstadoDaMidia {
  return {
    classificador: "limpo",
    denuncias: 0,
    removida: false,
    liberadaPeloAnfitriao: false,
    ...parcial,
  };
}

function sessao(parcial: Partial<SessaoQueCompartilha> = {}): SessaoQueCompartilha {
  return {
    sessaoId: "sessao-1",
    eventoId: "evento-1",
    nome: "Bia",
    consentimentoDeEntrada: { versao: "v1", em: ONTEM },
    consentimentoExterno: {
      versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
      em: ONTEM,
      revogadoEm: null,
      nomeNaMoldura: true,
    },
    ...parcial,
  };
}

function midia(parcial: Partial<MidiaParaCompartilhar> = {}): MidiaParaCompartilhar {
  return {
    id: "midia-1",
    eventoId: "evento-1",
    sessaoDeOrigem: "sessao-1",
    largura: 1080,
    altura: 1920,
    legenda: null,
    estado: estado(),
    ...parcial,
  };
}

/** Um leque de proporções reais de celular, mais os casos degenerados. */
const PROPORCOES: Dimensoes[] = [
  { largura: 1080, altura: 1920 },
  { largura: 3024, altura: 4032 },
  { largura: 1200, altura: 1200 },
  { largura: 4032, altura: 3024 },
  { largura: 1920, altura: 1080 },
  { largura: 2400, altura: 1080 },
  { largura: 1080, altura: 2400 },
];

describe("a mídia não sai do perímetro sem prova de autoria", () => {
  it("o convidado compartilha a própria foto", () => {
    expect(autorizarCompartilhamento(midia(), sessao(), EVENTO_LIBERADO, AGORA)).toEqual({
      pode: true,
      codigo: "compartilhar.autorizado",
      motivoDaModeracao: null,
    });
  });

  it("foto de terceiro nunca sai, mesmo com tudo o mais em ordem", () => {
    const deOutro = midia({ sessaoDeOrigem: "sessao-2" });

    expect(autorizarCompartilhamento(deOutro, sessao(), EVENTO_LIBERADO, AGORA).codigo).toBe(
      "compartilhar.nao_e_autor",
    );
  });

  it("token de um evento não compartilha mídia de outro", () => {
    const deOutroEvento = midia({ eventoId: "evento-2", sessaoDeOrigem: "sessao-1" });

    expect(
      autorizarCompartilhamento(deOutroEvento, sessao(), EVENTO_LIBERADO, AGORA).codigo,
    ).toBe("compartilhar.evento_diferente");
  });

  it("não revela o estado de moderação da foto de outra pessoa", () => {
    // O defeito que este teste impede: responder "removida" a quem não é o autor entrega, para qualquer convidado, quais fotos alguém apagou.
    const alheiaERemovida = midia({ sessaoDeOrigem: "sessao-2", estado: estado({ removida: true }) });

    const negada = autorizarCompartilhamento(alheiaERemovida, sessao(), EVENTO_LIBERADO, AGORA);

    expect(negada.codigo).toBe("compartilhar.nao_e_autor");
    expect(negada.motivoDaModeracao).toBeNull();
  });
});

describe("o consentimento de saída é um segundo ato", () => {
  it("o consentimento da entrada não autoriza sair do evento", () => {
    // Impede reaproveitar o checkbox da porta como base para o compartilhamento externo — a LGPD não aceita, consentimento que não descreve o uso não é consentimento.
    const soEntrou = sessao({ consentimentoExterno: null });

    expect(soEntrou.consentimentoDeEntrada.versao).toBe("v1");
    expect(autorizarCompartilhamento(midia(), soEntrou, EVENTO_LIBERADO, AGORA).codigo).toBe(
      "compartilhar.sem_consentimento_externo",
    );
  });

  it("consentimento de versão antiga não vale para os termos novos", () => {
    const antigo = sessao({
      consentimentoExterno: {
        versao: "externo-v0",
        em: ONTEM,
        revogadoEm: null,
        nomeNaMoldura: true,
      },
    });

    expect(pendenciaDeConsentimento(antigo, AGORA)).toBe(
      "compartilhar.consentimento_desatualizado",
    );
  });

  it("consentimento sem data crível é ausência de consentimento", () => {
    const semData = sessao({
      consentimentoExterno: {
        versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
        em: new Date(Number.NaN),
        revogadoEm: null,
        nomeNaMoldura: true,
      },
    });
    const doFuturo = sessao({
      consentimentoExterno: {
        versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
        em: new Date(AGORA.getTime() + 60_000),
        revogadoEm: null,
        nomeNaMoldura: true,
      },
    });

    expect(pendenciaDeConsentimento(semData, AGORA)).toBe(
      "compartilhar.consentimento_sem_data",
    );
    expect(pendenciaDeConsentimento(doFuturo, AGORA)).toBe(
      "compartilhar.consentimento_sem_data",
    );
  });

  it("revogar fecha a torneira na hora, e só a partir da hora", () => {
    const revogada = sessao({
      consentimentoExterno: {
        versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
        em: ONTEM,
        revogadoEm: new Date(AGORA.getTime() - 1),
        nomeNaMoldura: true,
      },
    });
    const revogaDepois = sessao({
      consentimentoExterno: {
        versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
        em: ONTEM,
        revogadoEm: new Date(AGORA.getTime() + 60_000),
        nomeNaMoldura: true,
      },
    });

    expect(pendenciaDeConsentimento(revogada, AGORA)).toBe(
      "compartilhar.consentimento_revogado",
    );
    expect(pendenciaDeConsentimento(revogaDepois, AGORA)).toBeNull();
  });

  it("consentimento vigente e datado é o único que passa", () => {
    expect(pendenciaDeConsentimento(sessao(), AGORA)).toBeNull();
  });
});

describe("o anfitrião decide se a festa vira post", () => {
  it("com a saída desligada, nem o autor compartilha", () => {
    const fechado: EventoQueCompartilha = {
      ...EVENTO_LIBERADO,
      compartilhamentoExternoLiberado: false,
    };

    expect(autorizarCompartilhamento(midia(), sessao(), fechado, AGORA).codigo).toBe(
      "compartilhar.desligado_pelo_anfitriao",
    );
  });
});

describe("a moderação é a mesma, e a régua é a do telão", () => {
  it("mídia removida não sai, com o motivo preservado para auditoria", () => {
    const removida = midia({ estado: estado({ removida: true }) });

    expect(autorizarCompartilhamento(removida, sessao(), EVENTO_LIBERADO, AGORA)).toEqual({
      pode: false,
      codigo: "compartilhar.bloqueado_pela_moderacao",
      motivoDaModeracao: "moderacao.removida",
    });
  });

  it("pânico do anfitrião corta o compartilhamento junto", () => {
    const emPanico: EventoQueCompartilha = { ...EVENTO_LIBERADO, panico: true };

    expect(autorizarCompartilhamento(midia(), sessao(), emPanico, AGORA).motivoDaModeracao).toBe(
      "moderacao.panico",
    );
  });

  it("duas denúncias seguram o compartilhamento como seguram a parede", () => {
    const denunciada = midia({ estado: estado({ denuncias: 2 }) });

    expect(
      autorizarCompartilhamento(denunciada, sessao(), EVENTO_LIBERADO, AGORA).motivoDaModeracao,
    ).toBe("moderacao.denuncias");
  });

  it("modo endurecido exige aprovação antes de sair", () => {
    const endurecido: EventoQueCompartilha = { ...EVENTO_LIBERADO, modoEndurecido: true };

    expect(
      autorizarCompartilhamento(midia(), sessao(), endurecido, AGORA).motivoDaModeracao,
    ).toBe("moderacao.aguarda_aprovacao");
  });

  it("classificador sem resposta: a galeria publica, o compartilhamento não", () => {
    // Impede usar a superfície "galeria" na delegação — ela falha aberta de propósito, e falhar aberto para fora do perímetro é irreversível de um jeito que a galeria não é.
    const semResposta = midia({ estado: estado({ classificador: "sem-resposta" }) });

    expect(decidirExibicao(semResposta.estado, EVENTO_LIBERADO, "galeria").visivel).toBe(true);
    expect(
      autorizarCompartilhamento(semResposta, sessao(), EVENTO_LIBERADO, AGORA).motivoDaModeracao,
    ).toBe("moderacao.classificador_sem_resposta");
  });

  it("liberada pelo anfitrião volta a poder sair", () => {
    const liberada = midia({
      estado: estado({ classificador: "suspeito", liberadaPeloAnfitriao: true }),
    });

    expect(autorizarCompartilhamento(liberada, sessao(), EVENTO_LIBERADO, AGORA).pode).toBe(true);
  });
});

describe("🔴 a moldura nunca corta o topo nem a base", () => {
  it("nenhum modelo permitido perde topo ou base, em nenhuma proporção", () => {
    for (const foto of PROPORCOES) {
      for (const modelo of modelosDeMolduraPermitidos(foto)) {
        const perdido = recorte(caixaDaFoto(modelo, foto), areaDaFoto(modelo));

        expect(perdido.topo, `${modelo} ${foto.largura}x${foto.altura}`).toBeLessThan(0.5);
        expect(perdido.base, `${modelo} ${foto.largura}x${foto.altura}`).toBeLessThan(0.5);
      }
    }
  });

  it("a moldura cheia é recusada exatamente onde o telão libera a dele", () => {
    // O defeito que este teste impede: uma segunda regra de enquadramento, paralela à do telão, que aceite na moldura o que a parede recusa.
    for (const foto of PROPORCOES) {
      const telaoSangra = modelosPermitidos(foto).includes("cheio");
      if (telaoSangra) expect(molduraCorta("cheia", foto)).toBe(true);
    }
  });

  it("a foto 9:16 não ganha a moldura cheia, porque a faixa da marca comeu 320px", () => {
    // Impede preencher o canvas 1080×1920 inteiro com a foto 9:16 e desenhar a marca por cima — exatamente a marca d'água sobre a imagem que a spec proíbe.
    const noveDezesseis = { largura: 1080, altura: 1920 };

    expect(cobreSemPerderTopo(noveDezesseis, areaDaFoto("cheia"))).toBe(false);
    expect(modelosDeMolduraPermitidos(noveDezesseis)).not.toContain("cheia");
    expect(modeloRecomendado(noveDezesseis)).toBe("ambiente");
  });

  it("foto deitada não preenche borda a borda, mesmo sem perder topo nem base", () => {
    // Escalar 4:3 pela altura da área preserva topo e base e ainda assim joga fora metade da largura. Meia foto na horizontal também é gente cortada.
    const deitada = { largura: 4032, altura: 3024 };

    expect(cobreSemPerderTopo(deitada, areaDaFoto("cheia"))).toBe(false);
    expect(modeloRecomendado(deitada)).toBe("polaroide");
  });

  it("foto 3:4 preenche a área perdendo só o teto lateral", () => {
    const tresQuartos = { largura: 3024, altura: 4032 };
    const area = areaDaFoto("cheia");

    expect(molduraCorta("cheia", tresQuartos)).toBe(false);

    const perdido = recorte(caixaDaFoto("cheia", tresQuartos), area);
    expect(perdido.topo).toBe(0);
    expect(perdido.base).toBe(0);
    expect(perdido.esquerda + perdido.direita).toBeGreaterThan(0);
  });

  it("foto na proporção da área preenche borda a borda sem perder nada", () => {
    const area = areaDaFoto("cheia");
    const exata = { largura: area.largura, altura: area.altura };

    expect(molduraCorta("cheia", exata)).toBe(false);
    expect(recorte(caixaDaFoto("cheia", exata), area)).toEqual({
      topo: 0,
      base: 0,
      esquerda: 0,
      direita: 0,
    });
  });

  it("dimensão degenerada não ganha modelo nenhum", () => {
    expect(modelosDeMolduraPermitidos({ largura: 0, altura: 1920 })).toEqual([]);
    expect(modelosDeMolduraPermitidos({ largura: Number.NaN, altura: 10 })).toEqual([]);
    expect(molduraCorta("polaroide", { largura: -1, altura: 10 })).toBe(true);
  });

  it("o modelo recomendado nunca corta", () => {
    for (const foto of PROPORCOES) {
      expect(molduraCorta(modeloRecomendado(foto), foto), `${foto.largura}x${foto.altura}`).toBe(
        false,
      );
    }
  });

  it("encaixar mantém a proporção da foto", () => {
    const area = areaDaFoto("polaroide");
    const caixa = encaixar({ largura: 4032, altura: 3024 }, area);

    expect(caixa.largura / caixa.altura).toBeCloseTo(4032 / 3024, 6);
  });
});

describe("🔴 a marca fica fora da foto", () => {
  it("a faixa começa onde a área da foto termina, em todo modelo", () => {
    const faixa = faixaDaMarca();

    for (const modelo of MODELOS_DE_MOLDURA) {
      const area = areaDaFoto(modelo);
      expect(area.y + area.altura, modelo).toBeLessThanOrEqual(faixa.y);
    }

    expect(faixa.y + faixa.altura).toBe(ALTURA_DA_COMPOSICAO);
    expect(faixa.altura).toBe(ALTURA_DA_FAIXA);
  });

  it("nenhuma composição válida põe a foto sobre a faixa", () => {
    for (const foto of PROPORCOES) {
      for (const modelo of modelosDeMolduraPermitidos(foto)) {
        const resultado = compor({
          midia: midia(foto),
          sessao: sessao(),
          evento: EVENTO_LIBERADO,
          identidade: IDENTIDADE,
          modelo,
          agora: AGORA,
        });

        expect(resultado.autorizada).toBe(true);
        const composicao = resultado.composicao as Composicao;
        expect(problemasDaComposicao(composicao), `${modelo}`).toEqual([]);
      }
    }
  });

  it("problemasDaComposicao acusa a foto invadindo a faixa", () => {
    const invasora: Composicao = {
      largura: LARGURA_DA_COMPOSICAO,
      altura: ALTURA_DA_COMPOSICAO,
      modelo: "ambiente",
      area: areaDaFoto("ambiente"),
      foto: { x: 0, y: 0, largura: LARGURA_DA_COMPOSICAO, altura: ALTURA_DA_COMPOSICAO },
      faixa: faixaDaMarca(),
      conteudo: conteudoDaMoldura(IDENTIDADE, midia(), sessao(), AGORA),
    };

    expect(problemasDaComposicao(invasora)).toContain("marca.sobre_a_foto");
    expect(problemasDaComposicao(invasora)).toContain("recorte.base");
  });
});

describe("o que atravessa o perímetro junto da imagem", () => {
  it("a identidade sai do resolvedor, não de constante", () => {
    const conteudo = conteudoDaMoldura(IDENTIDADE, midia(), sessao(), AGORA);

    expect(conteudo.monograma).toBe(IDENTIDADE.monograma);
    expect(conteudo.titulo).toBe(IDENTIDADE.titulo);
    expect(conteudo.data).toBe(IDENTIDADE.data);
    expect(conteudo.slug).toBe(IDENTIDADE.slug);
  });

  it("o crédito só aparece com consentimento que cubra o nome", () => {
    const semNome = sessao({
      consentimentoExterno: {
        versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
        em: ONTEM,
        revogadoEm: null,
        nomeNaMoldura: false,
      },
    });

    expect(conteudoDaMoldura(IDENTIDADE, midia(), sessao(), AGORA).credito).toBe("Bia");
    expect(conteudoDaMoldura(IDENTIDADE, midia(), semNome, AGORA).credito).toBeNull();
  });

  it("consentimento revogado tira o crédito junto", () => {
    const revogada = sessao({
      consentimentoExterno: {
        versao: VERSAO_DO_CONSENTIMENTO_EXTERNO,
        em: ONTEM,
        revogadoEm: ONTEM,
        nomeNaMoldura: true,
      },
    });

    expect(conteudoDaMoldura(IDENTIDADE, midia(), revogada, AGORA).credito).toBeNull();
  });

  it("nunca credita quem não capturou a foto", () => {
    // O defeito que este teste impede: assinar com o nome de quem apertou compartilhar uma imagem que outra pessoa fez.
    const deOutro = midia({ sessaoDeOrigem: "sessao-2" });

    expect(conteudoDaMoldura(IDENTIDADE, deOutro, sessao(), AGORA).credito).toBeNull();
  });

  it("o conteúdo tem exatamente os campos previstos e nenhum de terceiro", () => {
    const conteudo = conteudoDaMoldura(
      IDENTIDADE,
      midia({ legenda: "a melhor mesa" }),
      sessao(),
      AGORA,
    );

    expect(Object.keys(conteudo).sort()).toEqual([
      "credito",
      "data",
      "legenda",
      "monograma",
      "slug",
      "titulo",
    ]);
    expect(conteudo.legenda).toBe("a melhor mesa");
  });
});

describe("compor é a única porta para a composição", () => {
  it("recusa devolve o código e nenhuma composição para desenhar", () => {
    const resultado = compor({
      midia: midia({ sessaoDeOrigem: "sessao-2" }),
      sessao: sessao(),
      evento: EVENTO_LIBERADO,
      identidade: IDENTIDADE,
      modelo: "polaroide",
      agora: AGORA,
    });

    expect(resultado.autorizada).toBe(false);
    expect(resultado.composicao).toBeNull();
    expect(resultado.codigo).toBe("compartilhar.nao_e_autor");
  });

  it("modelo que cortaria a foto é recusado depois da autorização", () => {
    const horizontal = midia({ largura: 4032, altura: 3024 });

    const resultado = compor({
      midia: horizontal,
      sessao: sessao(),
      evento: EVENTO_LIBERADO,
      identidade: IDENTIDADE,
      modelo: "cheia",
      agora: AGORA,
    });

    expect(resultado.codigo).toBe("compartilhar.modelo_corta_a_foto");
    expect(resultado.composicao).toBeNull();
  });

  it("a composição autorizada sai em 1080×1920", () => {
    const resultado = compor({
      midia: midia(),
      sessao: sessao(),
      evento: EVENTO_LIBERADO,
      identidade: IDENTIDADE,
      modelo: modeloRecomendado(midia()),
      agora: AGORA,
    });

    expect(resultado.composicao?.largura).toBe(1080);
    expect(resultado.composicao?.altura).toBe(1920);
  });
});

describe("a colagem monta só com as fotos do próprio convidado", () => {
  it("uma foto de terceiro derruba a colagem inteira", () => {
    // O defeito que este teste impede: filtrar em silêncio e entregar um arquivo diferente do que o convidado escolheu na tela.
    const minhas = [midia({ id: "a" }), midia({ id: "b" })];
    const comAlheia = [...minhas, midia({ id: "c", sessaoDeOrigem: "sessao-2" })];

    expect(autorizarColagem(minhas, sessao(), EVENTO_LIBERADO, AGORA).pode).toBe(true);
    expect(autorizarColagem(comAlheia, sessao(), EVENTO_LIBERADO, AGORA).codigo).toBe(
      "compartilhar.nao_e_autor",
    );
  });

  it("uma mídia removida derruba a colagem, com o motivo preservado", () => {
    const comRemovida = [midia({ id: "a" }), midia({ id: "b", estado: estado({ removida: true }) })];

    expect(autorizarColagem(comRemovida, sessao(), EVENTO_LIBERADO, AGORA)).toEqual({
      pode: false,
      codigo: "compartilhar.bloqueado_pela_moderacao",
      motivoDaModeracao: "moderacao.removida",
    });
  });

  it("colagem vazia e colagem grande demais são recusadas", () => {
    const demais = Array.from({ length: MAX_DA_COLAGEM + 1 }, (_, i) => midia({ id: `m${i}` }));

    expect(autorizarColagem([], sessao(), EVENTO_LIBERADO, AGORA).codigo).toBe(
      "compartilhar.colagem_vazia",
    );
    expect(autorizarColagem(demais, sessao(), EVENTO_LIBERADO, AGORA).codigo).toBe(
      "compartilhar.colagem_grande_demais",
    );
  });

  it("midiasCompartilhaveis é o caminho para montar uma colagem legítima", () => {
    const acervo = [
      midia({ id: "a" }),
      midia({ id: "b", sessaoDeOrigem: "sessao-2" }),
      midia({ id: "c", estado: estado({ denuncias: 2 }) }),
      midia({ id: "d" }),
    ];

    const minhas = midiasCompartilhaveis(acervo, sessao(), EVENTO_LIBERADO, AGORA);

    expect(minhas.map((m) => m.id)).toEqual(["a", "d"]);
    expect(autorizarColagem(minhas, sessao(), EVENTO_LIBERADO, AGORA).pode).toBe(true);
  });

  it("as células cabem acima da faixa e não cortam as fotos", () => {
    const faixa = faixaDaMarca();

    for (let quantidade = 1; quantidade <= MAX_DA_COLAGEM; quantidade += 1) {
      const celulas = celulasDaColagem(quantidade);
      expect(celulas).toHaveLength(quantidade);

      for (const celula of celulas) {
        expect(celula.y + celula.altura).toBeLessThanOrEqual(faixa.y + 0.5);

        for (const foto of PROPORCOES) {
          expect(recorte(encaixar(foto, celula), celula).topo).toBeLessThan(0.5);
          expect(recorte(encaixar(foto, celula), celula).base).toBeLessThan(0.5);
        }
      }
    }
  });

  it("quantidade fora da faixa não produz célula nenhuma", () => {
    expect(celulasDaColagem(0)).toEqual([]);
    expect(celulasDaColagem(MAX_DA_COLAGEM + 1)).toEqual([]);
    expect(celulasDaColagem(2.5)).toEqual([]);
  });

  it("duas fotos ficam lado a lado, três preenchem a grade", () => {
    const duas = celulasDaColagem(2);
    expect(duas[0]!.y).toBe(duas[1]!.y);
    expect(duas[0]!.x).toBeLessThan(duas[1]!.x);

    const tres = celulasDaColagem(3);
    expect(tres[0]!.altura).toBeGreaterThan(tres[1]!.altura);
    expect(tres[1]!.x).toBe(tres[2]!.x);
    expect(tres[1]!.y).toBeLessThan(tres[2]!.y);
  });
});

describe("os modelos declarados são os que existem", () => {
  it("todo modelo tem área, e a área cabe no canvas", () => {
    for (const modelo of MODELOS_DE_MOLDURA satisfies readonly ModeloDeMoldura[]) {
      const area = areaDaFoto(modelo);

      expect(area.x).toBeGreaterThanOrEqual(0);
      expect(area.y).toBeGreaterThanOrEqual(0);
      expect(area.x + area.largura).toBeLessThanOrEqual(LARGURA_DA_COMPOSICAO);
      expect(area.y + area.altura).toBeLessThanOrEqual(ALTURA_DA_COMPOSICAO - ALTURA_DA_FAIXA);
    }
  });
});
