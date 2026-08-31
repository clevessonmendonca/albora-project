import { describe, expect, it } from "vitest";
import { formatarRelatorio } from "./relatorio.mjs";

/**
 * O relatório é a única coisa que sobra de uma execução de 20 minutos. Ele roda
 * depois da rajada inteira, então um campo com nome errado só aparece no fim —
 * quando o custo de repetir já foi pago.
 */
function execucaoMinima(idempotencia) {
  return {
    eventoId: "96ce4aeb-ace7-4def-a2ea-9512c3e8bfec",
    bytesPorFoto: 433_000,
    duracaoRealMs: 1_200_000,
    config: {
      alvo: "http://localhost:3000",
      evento: "festa-demo",
      semente: "sabado-22h",
      total: 150,
      duracaoMs: 1_200_000,
      convidados: 50,
      largura: 1440,
      altura: 1920,
      duracaoPicoMs: 45_000,
    },
    cronograma: { picoPlanejado: 12, picoObservado: 11, maiorValeMs: 9_000, concorrenciaMaxima: 4 },
    medidas: [{ etapa: "presign", ok: true, status: 200, ms: 31 }],
    resultado: { confirmados: 150, perdidos: 0, retries: 0, retriesGastos: 0 },
    idempotencia,
    veredito: "PASSOU — 150 de 150 confirmados, nenhum perdido",
    criados: { chaves: [] },
  };
}

describe("formatarRelatorio", () => {
  it("renderiza a idempotência não verificada do modo sem storage", () => {
    const saida = formatarRelatorio(
      execucaoMinima({
        veredito: "NÃO VERIFICADO — exige storage (CARGA_SEM_STORAGE=1)",
        provas: [],
      }),
    );

    expect(saida).toContain("não executada");
    expect(saida).toContain("NÃO VERIFICADO");
  });

  it("renderiza as provas de idempotência quando elas existem", () => {
    const saida = formatarRelatorio(
      execucaoMinima({
        veredito: "PASSOU — 3 de 3 deram exatamente uma linha",
        provas: [
          {
            uploadId: "781cab50-0000-4000-8000-000000000001",
            criado: 1,
            jaExistia: 1,
            erro: 0,
            linhas: 1,
          },
        ],
      }),
    );

    expect(saida).toContain("781cab50…");
    expect(saida).not.toContain("não executada");
  });
});
