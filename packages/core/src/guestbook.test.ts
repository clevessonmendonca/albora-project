import { describe, expect, it } from "vitest";
import { interacaoAberta } from "./interacao";
import {
  decidirEntrega,
  foiLido,
  marcarLido,
  montarTela,
  recadoPublicado,
  telaTemConteudo,
  TETO_AUDIO_SEGUNDOS,
  TETO_TEXTO_CARACTERES,
  validarCriacao,
  validarRascunho,
  type CodigoDeEntrega,
  type Entrega,
  type EstadoDoAudio,
  type RascunhoDeRecado,
  type Recado,
  type SessaoDoRecado,
} from "./guestbook";

const ABERTURA = new Date("2026-08-11T22:00:00Z");
const ANTES = new Date("2026-08-11T21:59:59Z");
const DEPOIS = new Date("2026-08-11T22:00:01Z");

function rascunho(parcial: Partial<RascunhoDeRecado> = {}): RascunhoDeRecado {
  return {
    texto: "Obrigado por estarem aqui com a gente.",
    audio: { duracaoSegundos: 20 },
    publicaEm: ABERTURA,
    ...parcial,
  };
}

function recado(parcial: Partial<Recado> = {}): Recado {
  return {
    id: "rec_1",
    eventoId: "evt_a",
    texto: "Obrigado por estarem aqui com a gente.",
    audio: { duracaoSegundos: 20, chave: "events/evt_a/recado/rec_1" },
    publicaEm: ABERTURA,
    ...parcial,
  };
}

const SESSAO: SessaoDoRecado = { id: "ses_1", eventoId: "evt_a" };

describe("o agendamento é do anfitrião", () => {
  it("antes da hora ninguém vê; a partir dela, todos", () => {
    // Verificação 1 da spec: agenda para daqui a 2 min, e antes da hora
    // nenhum convidado vê nada.
    expect(recadoPublicado(recado(), ANTES)).toBe(false);
    expect(recadoPublicado(recado(), DEPOIS)).toBe(true);
  });

  it("o instante exato já publica", () => {
    expect(recadoPublicado(recado(), ABERTURA)).toBe(true);
  });

  it("sem horário marcado o recado não existe para o convidado", () => {
    // Falha fechada: rascunho salvo pela metade no admin não pode vazar para
    // a festa por ausência de agendamento.
    expect(recadoPublicado(recado({ publicaEm: null }), DEPOIS)).toBe(false);
  });

  it("responde igual ao gate da interação, no mesmo instante", () => {
    // Se as duas mecânicas divergirem no `>=`, a festa passa a ter dois
    // horários — e o sintoma aparece só no minuto da virada.
    for (const agora of [ANTES, ABERTURA, DEPOIS]) {
      expect(recadoPublicado({ publicaEm: ABERTURA }, agora)).toBe(
        interacaoAberta({ interacaoAbreEm: ABERTURA }, agora),
      );
    }
  });
});

describe("o salão é barulhento: o texto é o corpo", () => {
  it("recusa recado sem texto, mesmo com áudio perfeito", () => {
    // Às 23h com música alta, um recado só em áudio é inaudível. Aceitar aqui
    // criaria um recado que ninguém consegue receber, e a falha só apareceria
    // na festa.
    expect(validarRascunho(rascunho({ texto: "" }))).toEqual({
      code: "recado.texto_obrigatorio",
    });
  });

  it("espaço em branco não é texto", () => {
    expect(validarRascunho(rascunho({ texto: "   \n\t  " }))).toEqual({
      code: "recado.texto_obrigatorio",
    });
  });

  it("o áudio é opcional: texto sozinho passa", () => {
    expect(validarRascunho(rascunho({ audio: null }))).toBeNull();
  });
});

describe("os tetos", () => {
  it("aceita o texto no limite e recusa o caractere seguinte", () => {
    expect(validarRascunho(rascunho({ texto: "a".repeat(TETO_TEXTO_CARACTERES) }))).toBeNull();

    expect(validarRascunho(rascunho({ texto: "a".repeat(TETO_TEXTO_CARACTERES + 1) }))).toEqual({
      code: "recado.texto_longo_demais",
      details: { caracteres: TETO_TEXTO_CARACTERES + 1, limite: TETO_TEXTO_CARACTERES },
    });
  });

  it("aceita 60 s de áudio e recusa 61", () => {
    expect(
      validarRascunho(rascunho({ audio: { duracaoSegundos: TETO_AUDIO_SEGUNDOS } })),
    ).toBeNull();

    expect(
      validarRascunho(rascunho({ audio: { duracaoSegundos: TETO_AUDIO_SEGUNDOS + 1 } })),
    ).toEqual({
      code: "recado.audio_longo_demais",
      details: { segundos: TETO_AUDIO_SEGUNDOS + 1, limite: TETO_AUDIO_SEGUNDOS },
    });
  });

  it("gravação de duração zero é recusada como áudio, não aceita como ausência", () => {
    // Um objeto de áudio com 0 s é gravação que falhou, e passaria a assinar
    // upload de um arquivo vazio.
    expect(validarRascunho(rascunho({ audio: { duracaoSegundos: 0 } }))).toEqual({
      code: "recado.audio_vazio",
    });
  });

  it("o texto é checado antes do áudio", () => {
    const invalido = rascunho({ texto: "", audio: { duracaoSegundos: 300 } });

    expect(validarRascunho(invalido)).toEqual({ code: "recado.texto_obrigatorio" });
  });
});

describe("o cliente não informa a chave de storage", () => {
  it("o rascunho não tem campo de chave nem no áudio", () => {
    // Verificação 5. A ausência é estrutural: não há onde o cliente escrever
    // a chave, então não há o que a rota precise lembrar de ignorar.
    const r = rascunho();

    expect(Object.keys(r).sort()).toEqual(["audio", "publicaEm", "texto"]);
    expect(Object.keys(r.audio ?? {})).toEqual(["duracaoSegundos"]);
  });
});

describe("um recado por evento", () => {
  it("o segundo recado do mesmo evento é recusado", () => {
    expect(validarCriacao([recado()], "evt_a", rascunho())).toEqual({
      code: "recado.ja_existe",
      details: { eventoId: "evt_a" },
    });
  });

  it("recado do evento B não bloqueia a gravação do evento A", () => {
    // Um recado por evento é fronteira de produto, não trava global. Contar
    // sem filtrar por evento faria o segundo casamento do sábado nascer mudo.
    expect(validarCriacao([recado({ eventoId: "evt_b" })], "evt_a", rascunho())).toBeNull();
  });

  it("o primeiro recado ainda passa pela validação de conteúdo", () => {
    expect(validarCriacao([], "evt_a", rascunho({ texto: "" }))).toEqual({
      code: "recado.texto_obrigatorio",
    });
  });
});

describe("entrega uma vez por sessão", () => {
  it("aparece, é marcado como lido e não volta ao reabrir o app", () => {
    // Verificação 2 da spec.
    const r = recado();
    const primeira = decidirEntrega(r, SESSAO, [], DEPOIS);
    expect(primeira).toEqual({ mostrar: true, codigo: "recado.entregar", recado: r });

    const leituras = marcarLido([], r, SESSAO.id, DEPOIS);

    expect(decidirEntrega(r, SESSAO, leituras, DEPOIS)).toEqual({
      mostrar: false,
      codigo: "recado.ja_lido",
      recado: null,
    });
  });

  it("marcar de novo é idempotente e preserva a hora da primeira leitura", () => {
    // Reabrir o app não é ler de novo. Sobrescrever a data faria "uma vez por
    // sessão" virar "uma vez por abertura" na hora de auditar.
    const r = recado();
    const uma = marcarLido([], r, SESSAO.id, DEPOIS);
    const outra = marcarLido(uma, r, SESSAO.id, new Date("2026-08-12T02:00:00Z"));

    expect(outra).toHaveLength(1);
    expect(outra[0]?.lidoEm).toEqual(DEPOIS);
  });

  it("a leitura de uma sessão não consome a das outras", () => {
    const r = recado();
    const leituras = marcarLido([], r, "ses_1", DEPOIS);

    expect(foiLido(leituras, r.id, "ses_1")).toBe(true);
    expect(foiLido(leituras, r.id, "ses_2")).toBe(false);
    expect(decidirEntrega(r, { id: "ses_2", eventoId: "evt_a" }, leituras, DEPOIS).mostrar).toBe(
      true,
    );
  });

  it("a linha de leitura não tem campo para nome do convidado", () => {
    // PII crua em tabela de evento é violação, e leitura é onde ela mais
    // escapa porque "é só telemetria".
    const [linha] = marcarLido([], recado(), SESSAO.id, DEPOIS);

    expect(Object.keys(linha ?? {}).sort()).toEqual([
      "eventoId",
      "lidoEm",
      "recadoId",
      "sessaoId",
    ]);
  });

  it("antes da hora não marca ninguém como tendo lido", () => {
    expect(decidirEntrega(recado(), SESSAO, [], ANTES)).toEqual({
      mostrar: false,
      codigo: "recado.agendado",
      recado: null,
    });
  });

  it("evento sem recado devolve o código próprio, e não um vazio ambíguo", () => {
    expect(decidirEntrega(null, SESSAO, [], DEPOIS)).toEqual({
      mostrar: false,
      codigo: "recado.inexistente",
      recado: null,
    });
  });
});

describe("isolamento entre eventos", () => {
  it("sessão do evento A não lê o recado do evento B", () => {
    // Verificação 4, na camada de aplicação. O RLS é a primeira defesa e
    // continua sendo a que vale; esta pega o payload mal montado antes de a
    // tela existir.
    const doOutroEvento = recado({ eventoId: "evt_b" });

    expect(decidirEntrega(doOutroEvento, SESSAO, [], DEPOIS)).toEqual({
      mostrar: false,
      codigo: "recado.outro_evento",
      recado: null,
    });
  });

  it("o recado do outro evento é recusado mesmo já publicado e nunca lido", () => {
    const doOutroEvento = recado({ eventoId: "evt_b", publicaEm: ANTES });

    expect(montarTela(decidirEntrega(doOutroEvento, SESSAO, [], DEPOIS), "disponivel")).toEqual({
      texto: null,
      audio: null,
      camera: "livre",
    });
  });
});

describe("degradação: o recado é enriquecimento", () => {
  it("áudio bloqueado no DevTools: a tela mostra o texto", () => {
    // Verificação 3 da spec. O texto não é alternativa do áudio — é o corpo.
    const entrega = decidirEntrega(recado(), SESSAO, [], DEPOIS);
    const tela = montarTela(entrega, "indisponivel");

    expect(tela.texto).toBe("Obrigado por estarem aqui com a gente.");
    expect(tela.audio).toBeNull();
    expect(telaTemConteudo(tela)).toBe(true);
  });

  it("com tudo carregado, o player vem junto do texto", () => {
    const r = recado();
    const tela = montarTela(decidirEntrega(r, SESSAO, [], DEPOIS), "disponivel");

    expect(tela.texto).toBe(r.texto);
    expect(tela.audio).toEqual({ duracaoSegundos: 20, chave: "events/evt_a/recado/rec_1" });
  });

  it("nada carregou: a tela não tem conteúdo e o app segue para a câmera", () => {
    const tela = montarTela(decidirEntrega(null, SESSAO, [], DEPOIS), "indisponivel");

    expect(telaTemConteudo(tela)).toBe(false);
    expect(tela.camera).toBe("livre");
  });

  it("o caminho da câmera fica livre em todo estado possível de entrega", () => {
    // A prova de que um recado nunca bloqueia o envio de foto: a matriz
    // inteira de códigos × estados de áudio, mais dois estados incoerentes que
    // a validação deveria ter impedido. Se algum caminho pudesse fechar a
    // câmera, ele apareceria aqui.
    const porCodigo: Record<CodigoDeEntrega, Entrega> = {
      "recado.inexistente": decidirEntrega(null, SESSAO, [], DEPOIS),
      "recado.outro_evento": decidirEntrega(recado({ eventoId: "evt_b" }), SESSAO, [], DEPOIS),
      "recado.agendado": decidirEntrega(recado(), SESSAO, [], ANTES),
      "recado.ja_lido": decidirEntrega(
        recado(),
        SESSAO,
        marcarLido([], recado(), SESSAO.id, DEPOIS),
        DEPOIS,
      ),
      "recado.entregar": decidirEntrega(recado(), SESSAO, [], DEPOIS),
    };

    const incoerentes: Entrega[] = [
      { mostrar: true, codigo: "recado.entregar", recado: null },
      { mostrar: true, codigo: "recado.entregar", recado: recado({ texto: "   " }) },
    ];

    const estados: EstadoDoAudio[] = ["disponivel", "indisponivel"];

    for (const entrega of [...Object.values(porCodigo), ...incoerentes]) {
      for (const estado of estados) {
        expect(() => montarTela(entrega, estado)).not.toThrow();
        expect(montarTela(entrega, estado).camera).toBe("livre");
      }
    }
  });

  it("recado incoerente sem texto não segura o convidado na tela", () => {
    // `mostrar: true` com texto vazio só acontece se algo tiver escapado da
    // validação. Mesmo assim a tela não tem corpo, e o app não para nela.
    const entrega: Entrega = {
      mostrar: true,
      codigo: "recado.entregar",
      recado: recado({ texto: "  " }),
    };

    expect(telaTemConteudo(montarTela(entrega, "disponivel"))).toBe(false);
  });
});
