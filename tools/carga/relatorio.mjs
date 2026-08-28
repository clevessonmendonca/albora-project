/**
 * Duas saídas do mesmo dado: uma tabela para quem está olhando agora e um
 * JSON para comparar com a execução da semana que vem.
 *
 * A tabela nunca mostra média sozinha, e nunca soma erros de etapas
 * diferentes. As duas coisas escondem exatamente o que o teste existe para
 * revelar.
 */

import { contarPorCodigo, resumo } from "./percentis.mjs";

const ETAPAS = ["sessao", "presign", "put", "confirm"];

/** @param {number|null} ms */
function tempo(ms) {
  if (ms === null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`;
}

/** @param {string[]} cabecalho @param {string[][]} linhas */
export function tabela(cabecalho, linhas) {
  const larguras = cabecalho.map((c, i) =>
    Math.max(c.length, ...linhas.map((l) => String(l[i] ?? "").length)),
  );

  const formatar = (celulas) =>
    celulas.map((c, i) => (i === 0 ? String(c).padEnd(larguras[i]) : String(c).padStart(larguras[i]))).join("  ");

  return [formatar(cabecalho), larguras.map((l) => "─".repeat(l)).join("  "), ...linhas.map(formatar)].join(
    "\n",
  );
}

/**
 * @param {import("./executar.mjs").Execucao} execucao
 * @returns {string}
 */
export function formatarRelatorio(execucao) {
  const { config, cronograma, medidas, resultado, idempotencia } = execucao;
  const partes = [];

  partes.push("");
  partes.push("═".repeat(72));
  partes.push("  TESTE DE CARGA — pipeline de upload");
  partes.push("═".repeat(72));
  partes.push("");
  partes.push(
    tabela(
      ["", ""],
      [
        ["alvo", config.alvo],
        ["evento", `${config.evento} (${execucao.eventoId})`],
        ["semente", config.semente],
        ["capturas", String(config.total)],
        ["janela", `${config.duracaoMs / 60_000} min`],
        ["convidados", String(config.convidados)],
        ["foto", `${config.largura}×${config.altura}, ${Math.round(execucao.bytesPorFoto / 1024)} KB`],
      ],
    ),
  );

  partes.push("");
  partes.push("── Rajada ".padEnd(72, "─"));
  partes.push("");
  partes.push(
    tabela(
      ["", ""],
      [
        [
          `pico planejado (${config.duracaoPicoMs / 1000} s)`,
          `${cronograma.picoPlanejado.quantos} capturas`,
        ],
        [
          `pico observado (${config.duracaoPicoMs / 1000} s)`,
          `${cronograma.picoObservado.quantos} uploads iniciados`,
        ],
        ["maior silêncio entre capturas", tempo(cronograma.maiorValeMs)],
        ["concorrência máxima observada", `${cronograma.concorrenciaMaxima} uploads em voo`],
        ["duração real da execução", tempo(execucao.duracaoRealMs)],
      ],
    ),
  );

  partes.push("");
  partes.push("── Latência por etapa ".padEnd(72, "─"));
  partes.push("");

  const linhas = [];
  for (const etapa of ETAPAS) {
    const amostras = medidas.filter((m) => m.etapa === etapa && m.ok).map((m) => m.ms);
    const r = resumo(amostras);
    linhas.push([
      etapa,
      String(r.n),
      tempo(r.p50),
      tempo(r.p95),
      tempo(r.p99),
      tempo(r.max),
      tempo(r.media),
    ]);
  }
  partes.push(tabela(["etapa", "n", "p50", "p95", "p99", "pior", "média"], linhas));

  partes.push("");
  partes.push("── Erros por etapa e por código ".padEnd(72, "─"));
  partes.push("");

  const linhasErro = [];
  for (const etapa of ETAPAS) {
    const falhas = medidas.filter((m) => m.etapa === etapa && !m.ok);
    const porCodigo = contarPorCodigo(falhas);
    const chaves = Object.keys(porCodigo).sort();
    if (chaves.length === 0) {
      linhasErro.push([etapa, "—", "0"]);
      continue;
    }
    for (const chave of chaves) linhasErro.push([etapa, chave, String(porCodigo[chave])]);
  }
  partes.push(tabela(["etapa", "status e código", "n"], linhasErro));
  partes.push("");
  partes.push(
    "  429 é o rate limit funcionando; 5xx é defeito; status 0 é a rede do arnês.",
  );

  partes.push("");
  partes.push("── Resultado ".padEnd(72, "─"));
  partes.push("");
  partes.push(
    tabela(
      ["", ""],
      [
        ["confirmados", `${resultado.confirmados} de ${config.total}`],
        ["perdidos", String(resultado.perdidos)],
        ["itens que precisaram de retry", String(resultado.comRetry)],
        ["tentativas gastas além da primeira", String(resultado.retriesGastos)],
      ],
    ),
  );

  partes.push("");
  partes.push("── Idempotência do confirm ".padEnd(72, "─"));
  partes.push("");

  if (idempotencia.provas.length === 0) {
    partes.push("  não executada");
  } else {
    partes.push(
      tabela(
        ["uploadId", "criado", "já existia", "erro", "linhas no banco"],
        idempotencia.provas.map((p) => [
          `${p.uploadId.slice(0, 8)}…`,
          String(p.criado),
          String(p.jaExistia),
          String(p.erro),
          p.linhas === null ? "não verificado" : String(p.linhas),
        ]),
      ),
    );
    partes.push("");
    partes.push(`  ${idempotencia.veredito}`);
  }

  partes.push("");
  partes.push("═".repeat(72));
  partes.push(`  ${execucao.veredito}`);
  partes.push("═".repeat(72));
  partes.push("");

  return partes.join("\n");
}

/** O JSON cru: tudo que a tabela resume, mais o que ela não cabe. */
export function paraJson(execucao) {
  const porEtapa = {};
  for (const etapa of ETAPAS) {
    const daEtapa = execucao.medidas.filter((m) => m.etapa === etapa);
    porEtapa[etapa] = {
      latenciaMs: resumo(daEtapa.filter((m) => m.ok).map((m) => m.ms)),
      falhas: contarPorCodigo(daEtapa.filter((m) => !m.ok)),
      chamadas: daEtapa.length,
    };
  }

  return {
    versaoDoFormato: 1,
    em: new Date().toISOString(),
    alvo: execucao.config.alvo,
    evento: { slug: execucao.config.evento, id: execucao.eventoId },
    config: execucao.config,
    bytesPorFoto: execucao.bytesPorFoto,
    duracaoRealMs: execucao.duracaoRealMs,
    cronograma: execucao.cronograma,
    etapas: porEtapa,
    resultado: execucao.resultado,
    idempotencia: execucao.idempotencia,
    veredito: execucao.veredito,
    // O que a limpeza precisa para apagar exatamente isto, e nada além.
    criados: execucao.criados,
    medidas: execucao.medidas,
  };
}
