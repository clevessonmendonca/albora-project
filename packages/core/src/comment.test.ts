import { describe, expect, it } from "vitest";
import * as modulo from "./comment";
import {
  MAX_CARACTERES,
  PROFUNDIDADE_MAXIMA,
  decidirExibicaoDoComentario,
  montarThread,
  podeRemoverComentario,
  publicarComentario,
  registrarDecisaoDoComentario,
  validarTexto,
  type Comentario,
  type EstadoDoComentario,
  type EventoDoComentario,
  type PedidoDeComentario,
} from "./comment";
import type { EstadoDaMidia, EstadoDoEvento } from "./moderacao";

const AGORA = new Date("2026-08-11T23:00:00Z");
const min = (n: number) => new Date(AGORA.getTime() - n * 60 * 1000);

const ABERTO: EventoDoComentario = { id: "evt_1", interacaoAbreEm: min(30) };
const FECHADO: EventoDoComentario = {
  id: "evt_1",
  interacaoAbreEm: new Date(AGORA.getTime() + 60 * 60 * 1000),
};
const SEM_DATA: EventoDoComentario = { id: "evt_1", interacaoAbreEm: null };

const CALMA: EstadoDoEvento = { panico: false, modoEndurecido: false };

function pedido(parcial: Partial<PedidoDeComentario> = {}): PedidoDeComentario {
  return {
    id: "cmt_novo",
    eventoId: "evt_1",
    midiaId: "mid_1",
    sessaoId: "ses_1",
    texto: "a tia Cida rindo antes de derrubar o copo",
    respostaA: null,
    ...parcial,
  };
}

function comentario(parcial: Partial<Comentario> = {}): Comentario {
  return {
    id: "cmt_1",
    eventoId: "evt_1",
    midiaId: "mid_1",
    sessaoId: "ses_1",
    texto: "oi",
    respostaA: null,
    criadoEm: min(10),
    ...parcial,
  };
}

function publicado(pedidoParcial: Partial<PedidoDeComentario>, existentes: Comentario[] = []) {
  const r = publicarComentario(pedido(pedidoParcial), ABERTO, existentes, AGORA);
  if (!r.ok) throw new Error(`esperava publicação, veio ${r.codigo}`);
  return r.comentario;
}

function estadoDaMidia(parcial: Partial<EstadoDaMidia> = {}): EstadoDaMidia {
  return {
    classificador: "limpo",
    denuncias: 0,
    removida: false,
    liberadaPeloAnfitriao: false,
    ...parcial,
  };
}

function estadoDoComentario(parcial: Partial<EstadoDoComentario> = {}): EstadoDoComentario {
  return {
    classificador: "limpo",
    denuncias: 0,
    removido: false,
    liberadoPeloAnfitriao: false,
    ...parcial,
  };
}

describe("o gate manda no comentário", () => {
  it("antes do gate, recusa", () => {
    // Verificação 1 da spec — mesmo gate da reação e do feed: comentário antes da hora é o celular do primo apitando na troca de alianças.
    for (const evento of [FECHADO, SEM_DATA]) {
      expect(publicarComentario(pedido(), evento, [], AGORA)).toEqual({
        ok: false,
        codigo: "comentario.gate_fechado",
      });
    }
  });

  it("no instante exato da abertura já publica", () => {
    // Fronteira do gate: `>=`, não `>`. Um horário fixo de 22:00 que só abre
    // às 22:00:01 é o tipo de defeito que ninguém vê e todo mundo sente.
    const naHora: EventoDoComentario = { id: "evt_1", interacaoAbreEm: AGORA };

    expect(publicarComentario(pedido(), naHora, [], AGORA).ok).toBe(true);
  });
});

describe("isolamento entre eventos", () => {
  it("sessão de outro evento é recusada", () => {
    // Verificação 7. Aqui é a mesma regra que o banco cobra sob RLS: o que
    // este teste impede é a rota confiar no `eventoId` que veio no corpo.
    expect(
      publicarComentario(pedido({ eventoId: "evt_2" }), ABERTO, [], AGORA),
    ).toEqual({ ok: false, codigo: "comentario.outro_evento" });
  });

  it("o evento errado é recusado antes de olhar o gate", () => {
    // Se a ordem invertesse, quem está de fora descobriria pelo código de erro
    // se a interação daquele evento já abriu.
    expect(
      publicarComentario(pedido({ eventoId: "evt_2" }), FECHADO, [], AGORA).ok,
    ).toBe(false);
    expect(
      publicarComentario(pedido({ eventoId: "evt_2" }), FECHADO, [], AGORA),
    ).toEqual({ ok: false, codigo: "comentario.outro_evento" });
  });

  it("evento errado é recusado mesmo com texto e resposta válidos", () => {
    const raiz = comentario({ eventoId: "evt_2" });

    expect(
      publicarComentario(
        pedido({ eventoId: "evt_2", respostaA: raiz.id }),
        ABERTO,
        [raiz],
        AGORA,
      ),
    ).toEqual({ ok: false, codigo: "comentario.outro_evento" });
  });
});

describe("o texto é entrada não confiável", () => {
  it("vazio e só espaço são recusados", () => {
    for (const bruto of ["", "   ", "\n\t  \r\n"]) {
      expect(validarTexto(bruto)).toEqual({
        ok: false,
        codigo: "comentario.texto_vazio",
      });
    }
  });

  it("espaço de largura zero também é vazio", () => {
    // `trim` não remove U+200B nem a marca de direção — sem esta checagem, um comentário invisível fica pendurado na foto de alguém, poluindo sem dar o que denunciar.
    for (const bruto of ["\u200B", "\uFEFF\u200D", " \u00AD \u2060 "]) {
      expect(validarTexto(bruto).ok).toBe(false);
    }
  });

  it("apara as pontas e guarda o miolo", () => {
    const r = validarTexto("  tia Cida  ");

    expect(r).toEqual({ ok: true, texto: "tia Cida" });
  });

  it("no teto passa, um acima recusa", () => {
    expect(validarTexto("a".repeat(MAX_CARACTERES)).ok).toBe(true);
    expect(validarTexto("a".repeat(MAX_CARACTERES + 1))).toEqual({
      ok: false,
      codigo: "comentario.texto_longo",
    });
  });

  it("conta ponto de código, não unidade UTF-16", () => {
    // Emoji fora do BMP ocupa duas unidades em `.length` — contar por unidade daria metade do teto a quem escreve com emoji, e partiria o par substituto se isso virasse corte em vez de recusa.
    const emojis = "\u{1F389}".repeat(MAX_CARACTERES);

    expect(emojis.length).toBe(MAX_CARACTERES * 2);
    expect(validarTexto(emojis).ok).toBe(true);
  });

  it("não escapa nada: o texto sai do validador como entrou", () => {
    // Verificação 2 é sobre render, não gravação — escapar aqui gravaria `&lt;script&gt;` no banco e o convidado veria a entidade HTML na tela depois que o template escapasse de novo.
    const bruto = "<script>alert(1)</script> & 'aspas'";

    expect(validarTexto(bruto)).toEqual({ ok: true, texto: bruto });
  });

  it("a publicação recusa o texto inválido com o código do validador", () => {
    expect(publicarComentario(pedido({ texto: "   " }), ABERTO, [], AGORA)).toEqual({
      ok: false,
      codigo: "comentario.texto_vazio",
    });
  });

  it("o comentário publicado guarda o texto aparado", () => {
    expect(publicado({ texto: "  oi  " }).texto).toBe("oi");
  });
});

describe("thread com um nível", () => {
  it("comentário de topo nasce sem pai", () => {
    expect(publicado({}).respostaA).toBe(null);
  });

  it("resposta a comentário de topo pendura nele", () => {
    const raiz = comentario({ id: "cmt_raiz" });

    expect(publicado({ respostaA: "cmt_raiz" }, [raiz]).respostaA).toBe("cmt_raiz");
  });

  it("resposta de resposta sobe para a raiz em vez de recusar", () => {
    // Impede defeito duplo: thread infinita (superfície de abuso e de render) e erro na cara de quem tocou em "responder" numa resposta às 22h.
    const raiz = comentario({ id: "cmt_raiz" });
    const resposta = comentario({ id: "cmt_resp", respostaA: "cmt_raiz", criadoEm: min(5) });

    expect(publicado({ respostaA: "cmt_resp" }, [raiz, resposta]).respostaA).toBe("cmt_raiz");
  });

  it("nenhuma cadeia passa do teto declarado", () => {
    const raiz = comentario({ id: "r" });
    let arvore: Comentario[] = [raiz];
    let alvo = raiz.id;

    for (let i = 0; i < 5; i += 1) {
      const novo = publicado({ id: `c${i}`, respostaA: alvo }, arvore);
      arvore = [...arvore, novo];
      alvo = novo.id;
    }

    const nivel = (c: Comentario) => (c.respostaA === null ? 0 : 1);
    expect(Math.max(...arvore.map(nivel))).toBe(PROFUNDIDADE_MAXIMA);
  });

  it("responder a id inexistente recusa", () => {
    expect(publicarComentario(pedido({ respostaA: "cmt_fantasma" }), ABERTO, [], AGORA)).toEqual({
      ok: false,
      codigo: "comentario.resposta_ausente",
    });
  });

  it("responder a comentário de outra foto ou de outro evento dá o mesmo código", () => {
    // Códigos distintos responderiam, para quem tentasse ids no escuro, se um
    // id alheio existe em algum lugar.
    const outraFoto = comentario({ id: "cmt_x", midiaId: "mid_2" });
    const outroEvento = comentario({ id: "cmt_y", eventoId: "evt_2" });

    for (const alvo of ["cmt_x", "cmt_y", "cmt_inexistente"]) {
      expect(
        publicarComentario(pedido({ respostaA: alvo }), ABERTO, [outraFoto, outroEvento], AGORA),
      ).toEqual({ ok: false, codigo: "comentario.resposta_ausente" });
    }
  });
});

describe("montar a thread para desenhar", () => {
  it("agrupa respostas sob a raiz, do mais antigo para o mais novo", () => {
    const raizA = comentario({ id: "a", criadoEm: min(30) });
    const raizB = comentario({ id: "b", criadoEm: min(20) });
    const r1 = comentario({ id: "a1", respostaA: "a", criadoEm: min(25) });
    const r2 = comentario({ id: "a2", respostaA: "a", criadoEm: min(5) });

    const thread = montarThread([r2, raizB, r1, raizA], "mid_1");

    expect(thread.map((t) => t.raiz.id)).toEqual(["a", "b"]);
    expect(thread[0]?.respostas.map((r) => r.id)).toEqual(["a1", "a2"]);
    expect(thread[1]?.respostas).toEqual([]);
  });

  it("não vaza comentário de outra foto", () => {
    const daOutra = comentario({ id: "z", midiaId: "mid_2" });

    expect(montarThread([comentario(), daOutra], "mid_1").map((t) => t.raiz.id)).toEqual(["cmt_1"]);
  });

  it("resposta órfã some junto com a raiz, não vira comentário de topo", () => {
    // Verificações 3 e 5 — quando a raiz sai da vista (denúncia, remoção, pânico), promover a resposta a topo ressuscitaria a discussão sem o começo, o que o anfitrião acabou de mandar apagar.
    const orfa = comentario({ id: "orfa", respostaA: "cmt_removido", criadoEm: min(1) });

    expect(montarThread([orfa], "mid_1")).toEqual([]);
  });

  it("foto sem comentário devolve lista vazia", () => {
    expect(montarThread([], "mid_1")).toEqual([]);
  });
});

describe("quem remove", () => {
  const doAutor = { eventoId: "evt_1", sessaoId: "ses_1" };

  it("o autor remove o próprio", () => {
    expect(
      podeRemoverComentario(doAutor, {
        eventoId: "evt_1",
        sessaoId: "ses_1",
        ehAnfitriao: false,
      }),
    ).toBe(true);
  });

  it("convidado não remove o dos outros", () => {
    expect(
      podeRemoverComentario(doAutor, {
        eventoId: "evt_1",
        sessaoId: "ses_2",
        ehAnfitriao: false,
      }),
    ).toBe(false);
  });

  it("o anfitrião remove qualquer um do evento dele", () => {
    expect(
      podeRemoverComentario(doAutor, {
        eventoId: "evt_1",
        sessaoId: "ses_anfitriao",
        ehAnfitriao: true,
      }),
    ).toBe(true);
  });

  it("anfitrião de outro evento não remove nada", () => {
    // Sem esta checagem, o papel de anfitrião atravessaria a fronteira do
    // evento e apagaria comentário da festa de outro casal.
    expect(
      podeRemoverComentario(doAutor, {
        eventoId: "evt_2",
        sessaoId: "ses_anfitriao",
        ehAnfitriao: true,
      }),
    ).toBe(false);
  });

  it("nem o próprio autor atravessa evento", () => {
    expect(
      podeRemoverComentario(doAutor, {
        eventoId: "evt_2",
        sessaoId: "ses_1",
        ehAnfitriao: false,
      }),
    ).toBe(false);
  });
});

describe("moderação de comentário é a mesma escada da foto", () => {
  it("comentário limpo em foto limpa aparece", () => {
    expect(decidirExibicaoDoComentario(estadoDoComentario(), estadoDaMidia(), CALMA)).toEqual({
      visivel: true,
      codigo: "moderacao.publicada",
    });
  });

  it("duas denúncias tiram o comentário da vista", () => {
    // Verificação 3. É a mesma contagem da foto no telão: uma só entregaria o
    // silenciamento a qualquer desafeto.
    expect(
      decidirExibicaoDoComentario(estadoDoComentario({ denuncias: 2 }), estadoDaMidia(), CALMA),
    ).toEqual({ visivel: false, codigo: "moderacao.denuncias" });

    expect(
      decidirExibicaoDoComentario(estadoDoComentario({ denuncias: 1 }), estadoDaMidia(), CALMA)
        .visivel,
    ).toBe(true);
  });

  it("classificador fora do ar publica assim mesmo", () => {
    // Verificação 6 — divergência deliberada do telão: classificador é enriquecimento, que degrada mas nunca derruba; o código continua estável para a auditoria saber que publicou sem parecer.
    expect(
      decidirExibicaoDoComentario(
        estadoDoComentario({ classificador: "sem-resposta" }),
        estadoDaMidia(),
        CALMA,
      ),
    ).toEqual({ visivel: true, codigo: "moderacao.classificador_sem_resposta" });
  });

  it("classificador suspeito segura, porque é sinal e não silêncio", () => {
    expect(
      decidirExibicaoDoComentario(
        estadoDoComentario({ classificador: "suspeito" }),
        estadoDaMidia(),
        CALMA,
      ).codigo,
    ).toBe("moderacao.classificador_suspeito");
  });

  it("o botão de pânico leva o comentário junto com a foto", () => {
    // Verificação 5. A escada roda duas vezes, então não existe uma segunda
    // regra de pânico para esquecer de atualizar quando a primeira mudar.
    expect(
      decidirExibicaoDoComentario(estadoDoComentario(), estadoDaMidia(), {
        ...CALMA,
        panico: true,
      }),
    ).toEqual({ visivel: false, codigo: "moderacao.panico" });
  });

  it("remover a foto remove os comentários dela", () => {
    expect(
      decidirExibicaoDoComentario(
        estadoDoComentario(),
        estadoDaMidia({ removida: true }),
        CALMA,
      ),
    ).toEqual({ visivel: false, codigo: "moderacao.removida" });
  });

  it("foto denunciada leva a thread junto", () => {
    expect(
      decidirExibicaoDoComentario(estadoDoComentario(), estadoDaMidia({ denuncias: 2 }), CALMA)
        .codigo,
    ).toBe("moderacao.denuncias");
  });

  it("a liberação do anfitrião vence denúncia, classificador e modo endurecido", () => {
    // Caminho do falso positivo (spec 011, risco mais provável) — a foto precisa estar liberada também: em modo endurecido ela segura primeiro, e comentário em foto não aprovada não aparece.
    expect(
      decidirExibicaoDoComentario(
        estadoDoComentario({
          liberadoPeloAnfitriao: true,
          denuncias: 9,
          classificador: "suspeito",
        }),
        estadoDaMidia({ liberadaPeloAnfitriao: true }),
        { ...CALMA, modoEndurecido: true },
      ),
    ).toEqual({ visivel: true, codigo: "moderacao.liberada_pelo_anfitriao" });
  });

  it("comentário liberado em foto que ainda aguarda aprovação não aparece", () => {
    // O defeito que isto impede é o comentário sobreviver à foto em modo
    // endurecido: a legenda apareceria sem a imagem que ela legenda.
    expect(
      decidirExibicaoDoComentario(
        estadoDoComentario({ liberadoPeloAnfitriao: true }),
        estadoDaMidia(),
        { ...CALMA, modoEndurecido: true },
      ),
    ).toEqual({ visivel: false, codigo: "moderacao.aguarda_aprovacao" });
  });

  it("remoção e pânico vencem a liberação do anfitrião", () => {
    // A precedência vem inteira de `decidirExibicao`: se este teste cair, é
    // porque alguém escreveu uma escada paralela para texto.
    const liberado = estadoDoComentario({ liberadoPeloAnfitriao: true });

    expect(
      decidirExibicaoDoComentario({ ...liberado, removido: true }, estadoDaMidia(), CALMA).codigo,
    ).toBe("moderacao.removida");
    expect(
      decidirExibicaoDoComentario(liberado, estadoDaMidia(), { ...CALMA, panico: true }).codigo,
    ).toBe("moderacao.panico");
  });

  it("modo endurecido segura o comentário mesmo com a foto já aprovada", () => {
    // Aprovar a imagem não aprova o texto embaixo dela: o anfitrião ligou o
    // modo endurecido porque algo aconteceu, e o texto é a superfície nova.
    expect(
      decidirExibicaoDoComentario(
        estadoDoComentario(),
        estadoDaMidia({ liberadaPeloAnfitriao: true }),
        { ...CALMA, modoEndurecido: true },
      ).codigo,
    ).toBe("moderacao.aguarda_aprovacao");
  });

  it("foto com classificador mudo não esconde a thread", () => {
    // A foto pode estar segura do telão por silêncio do classificador; isso é
    // assunto do telão, e não motivo para sumir com a conversa no app.
    expect(
      decidirExibicaoDoComentario(
        estadoDoComentario(),
        estadoDaMidia({ classificador: "sem-resposta" }),
        CALMA,
      ).visivel,
    ).toBe(true);
  });
});

describe("a auditoria guarda a decisão, não a frase", () => {
  it("registra o código também quando exibiu", () => {
    const decisao = decidirExibicaoDoComentario(estadoDoComentario(), estadoDaMidia(), CALMA);

    expect(
      registrarDecisaoDoComentario(
        { eventoId: "evt_1", midiaId: "mid_1", comentarioId: "cmt_1", ator: "ses_opaca" },
        decisao,
        AGORA,
      ),
    ).toEqual({
      eventoId: "evt_1",
      midiaId: "mid_1",
      comentarioId: "cmt_1",
      ator: "ses_opaca",
      visivel: true,
      codigo: "moderacao.publicada",
      em: "2026-08-11T23:00:00.000Z",
    });
  });

  it("a linha não tem campo para o texto nem para o nome de quem escreveu", () => {
    // Comentário de festa cita nome de gente que nunca abriu o produto — PII crua em log é violação, e a auditoria é onde ela escapa porque "é interno".
    const linha = registrarDecisaoDoComentario(
      { eventoId: "e", midiaId: "m", comentarioId: "c", ator: "ses_opaca" },
      decidirExibicaoDoComentario(estadoDoComentario(), estadoDaMidia(), CALMA),
      AGORA,
    );

    expect(Object.keys(linha).sort()).toEqual([
      "ator",
      "codigo",
      "comentarioId",
      "em",
      "eventoId",
      "midiaId",
      "visivel",
    ]);
  });
});

describe("reação em comentário não existe", () => {
  it("o módulo não exporta nada de reação", () => {
    // Regra de escopo da spec 014, não lacuna — "curtir comentário" é a coisa mais fácil de alguém acrescentar sem perceber que está reabrindo uma decisão.
    expect(Object.keys(modulo).filter((k) => /rea[cç]|curtir/i.test(k))).toEqual([]);
  });
});
