import { describe, expect, it } from "vitest";
import {
  compararPlataforma,
  decidirTese,
  degraus,
  ehEventoDoFunil,
  ehEventoUnicoDoFunil,
  ESPINHA_DO_FUNIL,
  EVENTOS_DO_FUNIL,
  lerPlataforma,
  maiorPerda,
  MetricaInvalida,
  ondeParou,
  taxaDeParticipacao,
  validarSequencia,
  eventosDeEntrada,
  parseViaDeEntrada,
  type ContagemDePlataforma,
  type EventoDoFunil,
} from "./funnel";

const SESSAO_FELIZ: readonly EventoDoFunil[] = [
  "qr_scan",
  "page_open",
  "consent",
  "capture",
  "upload_start",
  "upload_ok",
];

describe("o conjunto é fechado", () => {
  it("tem os treze eventos do contrato e nada além", () => {
    expect([...EVENTOS_DO_FUNIL]).toEqual([
      "qr_scan",
      "page_open",
      "consent",
      "capture",
      "upload_start",
      "upload_ok",
      "upload_fail",
      "retry",
      "share",
      "install_prompt",
      "install_accept",
      "install_dismiss",
      "feed_open",
    ]);
  });

  it("recusa kind que não está no contrato", () => {
    // `kind` chega do cliente. Sem porta fechada, um valor novo entra no banco,
    // não cai em nenhum degrau e o painel passa a mentir para menos.
    expect(ehEventoDoFunil("upload_ok")).toBe(true);
    expect(ehEventoDoFunil("uploadOk")).toBe(false);
    expect(ehEventoDoFunil("install")).toBe(false);
    expect(ehEventoDoFunil("")).toBe(false);
  });

  it("a espinha é o caminho de qr_scan a upload_ok", () => {
    expect([...ESPINHA_DO_FUNIL]).toEqual([
      "qr_scan",
      "page_open",
      "consent",
      "capture",
      "upload_start",
      "upload_ok",
    ]);
  });
});

describe("a métrica principal", () => {
  it("é sessões com upload sobre convidados esperados", () => {
    expect(taxaDeParticipacao({ expectedGuests: 120, sessoesComUpload: 48 })).toBeCloseTo(0.4);
  });

  it("lança quando não há denominador, em vez de devolver zero", () => {
    // Defeito que este teste impede: `expected_guests` em branco no admin
    // viraria 0%, e 0% é "tese errada, parar" — a decisão mais cara do projeto
    // tomada por um campo não preenchido.
    for (const expectedGuests of [0, -1, Number.NaN]) {
      expect(() => taxaDeParticipacao({ expectedGuests, sessoesComUpload: 48 })).toThrow(
        MetricaInvalida,
      );
    }

    try {
      taxaDeParticipacao({ expectedGuests: 0, sessoesComUpload: 48 });
    } catch (erro) {
      expect((erro as MetricaInvalida).codigo).toBe("funil.denominador_ausente");
    }
  });

  it("lança quando o numerador é impossível", () => {
    expect(() => taxaDeParticipacao({ expectedGuests: 100, sessoesComUpload: -3 })).toThrow(
      MetricaInvalida,
    );
  });

  it("aceita mais gente do que a esperada sem quebrar", () => {
    // Convidado a mais que apareceu é dado real; travar em 100% esconderia que
    // o denominador do admin estava errado.
    expect(taxaDeParticipacao({ expectedGuests: 80, sessoesComUpload: 100 })).toBeCloseTo(1.25);
  });
});

describe("a definição de pronto, escrita antes de olhar o resultado", () => {
  it("40% exatos validam a tese", () => {
    expect(decidirTese({ expectedGuests: 100, sessoesComUpload: 40 })).toEqual({
      taxa: 0.4,
      codigo: "funil.tese_validada",
    });
  });

  it("logo abaixo de 40% mexe em fricção, não em feature", () => {
    expect(decidirTese({ expectedGuests: 1000, sessoesComUpload: 399 }).codigo).toBe(
      "funil.mexe_em_friccao",
    );
  });

  it("25% exatos ainda mexem em fricção", () => {
    // A fronteira inferior é inclusiva. Sem teste, 25% cravado vira "parar" e o
    // produto morre por um sinal de comparação.
    expect(decidirTese({ expectedGuests: 100, sessoesComUpload: 25 }).codigo).toBe(
      "funil.mexe_em_friccao",
    );
  });

  it("abaixo de 25% para", () => {
    expect(decidirTese({ expectedGuests: 1000, sessoesComUpload: 249 }).codigo).toBe("funil.parar");
  });

  it("o veredito carrega a taxa junto do código", () => {
    // O número que produziu a decisão fica registrado com ela: é o que impede
    // reinterpretar o resultado dois meses depois.
    expect(decidirTese({ expectedGuests: 200, sessoesComUpload: 61 })).toEqual({
      taxa: 0.305,
      codigo: "funil.mexe_em_friccao",
    });
  });

  it("herda a recusa de decidir sem denominador", () => {
    expect(() => decidirTese({ expectedGuests: 0, sessoesComUpload: 0 })).toThrow(MetricaInvalida);
  });
});

describe("instalação nunca é lida sozinha", () => {
  const evento = (parcial: Partial<ContagemDePlataforma> = {}): ContagemDePlataforma => ({
    expectedGuests: 100,
    sessoesComUpload: 45,
    sessoesComInstalacao: 20,
    ...parcial,
  });

  it("a leitura devolve as duas taxas, sempre", () => {
    // Defeito que este teste impede: alguém expor a taxa de instalação sozinha
    // no painel. Se este objeto ganhar um caminho que devolva só instalação, a
    // asserção das chaves quebra.
    const leitura = lerPlataforma(evento());

    expect(Object.keys(leitura).sort()).toEqual(["instalacao", "participacao"]);
    expect(leitura.participacao).toBeCloseTo(0.45);
    expect(leitura.instalacao).toBeCloseTo(0.2);
  });

  it("instalação subindo com participação caindo é prejuízo", () => {
    const comparacao = compararPlataforma(
      evento({ sessoesComUpload: 45, sessoesComInstalacao: 20 }),
      evento({ sessoesComUpload: 30, sessoesComInstalacao: 40 }),
    );

    expect(comparacao.codigo).toBe("funil.plataforma_prejuizo");
    expect(comparacao.anterior.participacao).toBeCloseTo(0.45);
    expect(comparacao.atual.instalacao).toBeCloseTo(0.4);
  });

  it("instalação subindo sem derrubar participação é ganho", () => {
    // É a variante de CTA na entrada vencendo o experimento dos três primeiros
    // casamentos — e só vence se a participação ficar de pé.
    expect(
      compararPlataforma(
        evento({ sessoesComUpload: 45, sessoesComInstalacao: 20 }),
        evento({ sessoesComUpload: 45, sessoesComInstalacao: 35 }),
      ).codigo,
    ).toBe("funil.plataforma_ganho");
  });

  it("as duas caindo é regressão, não prejuízo", () => {
    expect(
      compararPlataforma(
        evento({ sessoesComUpload: 45, sessoesComInstalacao: 20 }),
        evento({ sessoesComUpload: 30, sessoesComInstalacao: 10 }),
      ).codigo,
    ).toBe("funil.plataforma_regressao");
  });

  it("uma pessoa a mais em cem não é veredito, três são", () => {
    // Sem margem de ruído, um convidado de diferença entre dois casamentos vira
    // "prejuízo" e o produto muda por causa dele. A segunda asserção existe
    // para a margem não virar mordaça: movimento real continua sendo lido.
    expect(
      compararPlataforma(
        evento({ sessoesComUpload: 45, sessoesComInstalacao: 20 }),
        evento({ sessoesComUpload: 44, sessoesComInstalacao: 21 }),
      ).codigo,
    ).toBe("funil.plataforma_estavel");

    expect(
      compararPlataforma(
        evento({ sessoesComUpload: 45, sessoesComInstalacao: 20 }),
        evento({ sessoesComUpload: 42, sessoesComInstalacao: 23 }),
      ).codigo,
    ).toBe("funil.plataforma_prejuizo");
  });
});

describe("a ordem do funil", () => {
  it("a sessão feliz é válida", () => {
    expect(validarSequencia(SESSAO_FELIZ)).toEqual({ valida: true, codigo: "funil.ordem_ok" });
  });

  it("upload_ok sem upload_start é inválido e aponta onde quebrou", () => {
    expect(validarSequencia(["page_open", "consent", "capture", "upload_ok"])).toEqual({
      valida: false,
      codigo: "funil.pre_requisito_ausente",
      posicao: 3,
      evento: "upload_ok",
      faltando: ["upload_start"],
    });
  });

  it("captura sem consentimento tem código próprio", () => {
    // Defeito que este teste impede: tratar como desordem genérica de
    // instrumentação. Não é — é captura antes do consentimento versionado e
    // datado, e precisa de um código auditável só dela.
    expect(validarSequencia(["page_open", "capture"])).toMatchObject({
      valida: false,
      codigo: "funil.captura_sem_consentimento",
      posicao: 1,
      faltando: ["consent"],
    });
  });

  it("retry sem falha anterior é inválido", () => {
    expect(validarSequencia([...SESSAO_FELIZ, "retry"])).toMatchObject({
      valida: false,
      evento: "retry",
      faltando: ["upload_fail"],
    });
  });

  it("falha e retentativa fazem parte do caminho normal", () => {
    expect(
      validarSequencia([
        "qr_scan",
        "page_open",
        "consent",
        "capture",
        "upload_start",
        "upload_fail",
        "retry",
        "upload_ok",
      ]).valida,
    ).toBe(true);
  });

  it("várias fotos na mesma sessão continuam válidas", () => {
    expect(validarSequencia([...SESSAO_FELIZ, "capture", "upload_start", "upload_ok"]).valida).toBe(
      true,
    );
  });

  it("QR grava scan; WhatsApp, link e código só abrem a página", () => {
    expect(eventosDeEntrada("qr")).toEqual(["qr_scan", "page_open", "consent"]);
    expect(eventosDeEntrada("wa")).toEqual(["page_open", "consent"]);
    expect(eventosDeEntrada("link")).toEqual(["page_open", "consent"]);
    expect(eventosDeEntrada("code")).toEqual(["page_open", "consent"]);
  });

  it("via ausente ou inventada vira link, nunca QR", () => {
    expect(parseViaDeEntrada(undefined)).toBe("link");
    expect(parseViaDeEntrada("qr_scan")).toBe("link");
    expect(parseViaDeEntrada("qr")).toBe("qr");
    expect(parseViaDeEntrada("wa")).toBe("wa");
    expect(parseViaDeEntrada("code")).toBe("code");
  });

  it("entrar por link, sem QR, é válido", () => {
    // Defeito que este teste impede: exigir `qr_scan` antes de `page_open`
    // descartaria como inválida toda sessão que veio do link no WhatsApp — ou
    // seja, participação real virando zero no painel.
    expect(validarSequencia(["page_open", "consent", "capture", "upload_start"]).valida).toBe(true);
  });

  it("o CTA de instalação na entrada é válido", () => {
    // Defeito que este teste impede: exigir `upload_ok` antes de
    // `install_prompt` rejeitaria a variante de entrada do experimento dos três
    // primeiros casamentos, que é justamente o que se quer medir.
    expect(validarSequencia(["page_open", "install_prompt", "install_dismiss"]).valida).toBe(true);
  });

  it("abrir o feed antes ou depois do upload é válido", () => {
    expect(validarSequencia(["page_open", "consent", "feed_open"]).valida).toBe(true);
    expect(validarSequencia([...SESSAO_FELIZ, "feed_open"]).valida).toBe(true);
  });

  it("refresh não pode contar de novo o QR, a entrada, o consentimento nem o feed", () => {
    expect(ehEventoUnicoDoFunil("qr_scan")).toBe(true);
    expect(ehEventoUnicoDoFunil("page_open")).toBe(true);
    expect(ehEventoUnicoDoFunil("consent")).toBe(true);
    expect(ehEventoUnicoDoFunil("feed_open")).toBe(true);
    expect(ehEventoUnicoDoFunil("upload_ok")).toBe(false);
    expect(ehEventoUnicoDoFunil("capture")).toBe(false);
  });

  it("aceitar instalação sem ter recebido o convite é inválido", () => {
    expect(validarSequencia(["page_open", "install_accept"])).toMatchObject({
      valida: false,
      evento: "install_accept",
      faltando: ["install_prompt"],
    });
  });

  it("compartilhar exige ter subido alguma foto", () => {
    expect(validarSequencia([...SESSAO_FELIZ, "share"]).valida).toBe(true);
    expect(validarSequencia(["page_open", "share"]).valida).toBe(false);
  });
});

describe("onde a participação se perdeu", () => {
  it("a sessão para na etapa mais avançada que alcançou", () => {
    expect(ondeParou(SESSAO_FELIZ)).toBe("upload_ok");
    expect(ondeParou(["qr_scan", "page_open", "consent"])).toBe("consent");
    expect(ondeParou(["install_prompt", "install_dismiss"])).toBe(null);
  });

  it("um upload_fail depois do ok não faz a sessão andar para trás", () => {
    expect(ondeParou([...SESSAO_FELIZ, "capture", "upload_start", "upload_fail"])).toBe("upload_ok");
  });

  it("conta as sessões de cada degrau e a retenção entre eles", () => {
    const passos = degraus([
      SESSAO_FELIZ,
      SESSAO_FELIZ,
      ["qr_scan", "page_open", "consent", "capture"],
      ["qr_scan", "page_open"],
    ]);

    expect(passos.map((p) => [p.etapa, p.sessoes])).toEqual([
      ["qr_scan", 4],
      ["page_open", 4],
      ["consent", 3],
      ["capture", 3],
      ["upload_start", 2],
      ["upload_ok", 2],
    ]);
    expect(passos[0]?.retencao).toBe(null);
    expect(passos[2]?.retencao).toBeCloseTo(0.75);
  });

  it("evento perdido no meio nunca produz retenção acima de 100%", () => {
    // Defeito que este teste impede: contar por presença do evento. O `consent`
    // que não chegou faria `capture` (2) parecer maior que `consent` (1) — e um
    // painel com retenção de 200% faz o casal decidir sobre número inventado.
    const passos = degraus([
      SESSAO_FELIZ,
      ["qr_scan", "page_open", "capture", "upload_start", "upload_ok"],
    ]);

    for (const passo of passos) {
      expect(passo.sessoes).toBe(2);
      if (passo.retencao !== null) expect(passo.retencao).toBeLessThanOrEqual(1);
    }
  });

  it("aponta o degrau que mais custou participação", () => {
    const passos = degraus([
      ...Array.from({ length: 40 }, () => ["qr_scan", "page_open"] as EventoDoFunil[]),
      ...Array.from({ length: 55 }, () => SESSAO_FELIZ),
      ...Array.from({ length: 5 }, () => ["qr_scan"] as EventoDoFunil[]),
    ]);

    expect(maiorPerda(passos)).toEqual({
      de: "page_open",
      para: "consent",
      sessoesPerdidas: 40,
      retencao: 55 / 95,
    });
  });

  it("funil sem queda e funil sem sessão não inventam um culpado", () => {
    expect(maiorPerda(degraus([SESSAO_FELIZ, SESSAO_FELIZ]))).toBe(null);
    expect(maiorPerda(degraus([]))).toBe(null);
  });
});
