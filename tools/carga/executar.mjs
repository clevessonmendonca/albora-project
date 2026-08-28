/**
 * O arnês de carga do portão de MVP: 150 uploads em 20 minutos
 * (`CLAUDE.md`, "Gates de qualidade").
 *
 * Mede só o pipeline de upload — sessão, presign, PUT no storage, confirm. O
 * que ele prova, e por que cada escolha:
 *
 * - **Rajada, não taxa.** O cronograma sai de `rajada.mjs`. Taxa constante
 *   passaria num servidor que cai no primeiro pico.
 * - **Um aparelho sobe uma foto por vez.** É o que `drenar` de `@albora/core`
 *   faz, e é o que decide a concorrência real: ela vem de convidados
 *   diferentes, nunca de dez requisições do mesmo celular.
 * - **Retry como caminho normal**, com o mesmo backoff do cliente.
 *
 * Roda contra o dev local por padrão. Alvo remoto exige confirmação explícita
 * com o host exato — ver `config.mjs`.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Cliente, novoUploadId } from "./cliente.mjs";
import { lerConfig, ErroDeConfig } from "./config.mjs";
import { abrir, contarUploads, urlDoBanco } from "./banco.mjs";
import { gerarJpeg } from "./jpeg.mjs";
import { formatarRelatorio, paraJson } from "./relatorio.mjs";
import { distribuirEntreConvidados, gerarRajada, janelaMaisCheia, sorteador } from "./rajada.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));

/** Espelha `esperaAntesDeRetentar` de `packages/core/src/fila.ts`. */
function esperaAntesDeRetentar(tentativas) {
  return Math.min(2 ** tentativas, 60);
}

/** Espelha `ApiError.definitivo` de `apps/web/lib/transport.ts`. */
function ehDefinitivo(status) {
  return status === 401 || status === 403 || status === 422;
}

const dormir = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

async function principal() {
  const config = lerConfig(process.env);
  const cliente = new Cliente({ alvo: config.alvo, tempoLimiteMs: config.tempoLimiteMs });

  const eventoId = config.eventoId ?? (await cliente.resolverEventoId(config.evento));
  console.log(`alvo    ${config.alvo}`);
  console.log(`evento  ${config.evento}  ${eventoId}`);

  const fotos = [];
  for (let i = 0; i < config.imagens; i += 1) {
    const { bytes } = gerarJpeg({
      largura: config.largura,
      altura: config.altura,
      qualidade: config.qualidade,
      grao: config.grao,
      sortear: sorteador(`foto:${config.semente}:${i}`),
    });
    fotos.push(bytes);
  }
  const bytesPorFoto = Math.round(fotos.reduce((a, f) => a + f.length, 0) / fotos.length);
  console.log(`fotos   ${fotos.length} × ~${Math.round(bytesPorFoto / 1024)} KB`);

  /** @type {import("./cliente.mjs").Medida[]} */
  const medidas = [];
  const criados = { sessaoIds: [], uploadIds: [], chaves: [] };
  const relogio = { inicio: performance.now() };
  const desdeOInicio = () => performance.now() - relogio.inicio;

  const convidados = await criarSessoes({ cliente, config, eventoId, medidas, criados });
  const vivos = convidados.filter((c) => c.cookie);
  if (vivos.length === 0) {
    throw new Error("nenhuma sessão foi criada — o teste pararia antes de medir o que importa");
  }
  console.log(`sessões ${vivos.length} de ${config.convidados}`);

  const cronogramaMs = gerarRajada({
    total: config.total,
    duracaoMs: config.duracaoMs,
    picos: config.picos,
    fracaoEmPico: config.fracaoEmPico,
    duracaoPicoMs: config.duracaoPicoMs,
    semente: config.semente,
  });
  const donos = distribuirEntreConvidados(config.total, vivos.length, config.semente);

  const filas = vivos.map(() => []);
  cronogramaMs.forEach((instante, i) => {
    const uploadId = novoUploadId();
    criados.uploadIds.push(uploadId);
    filas[donos[i]].push({ instante, uploadId, foto: fotos[i % fotos.length] });
  });

  const emVoo = { agora: 0, maximo: 0 };
  const resultado = { confirmados: 0, perdidos: 0, comRetry: 0, retriesGastos: 0 };

  console.log(`\nrajada  ${config.total} capturas em ${config.duracaoMs / 60_000} min — começando\n`);
  relogio.inicio = performance.now();
  const progresso = setInterval(() => {
    const min = (desdeOInicio() / 60_000).toFixed(1);
    console.log(
      `  ${min} min · confirmados ${resultado.confirmados}/${config.total} · em voo ${emVoo.agora}`,
    );
  }, 30_000);

  await Promise.all(
    vivos.map((convidado, i) =>
      drenarFila({ convidado, fila: filas[i], cliente, config, medidas, criados, relogio, emVoo, resultado }),
    ),
  );

  clearInterval(progresso);
  const duracaoRealMs = desdeOInicio();

  const inicios = medidas
    .filter((m) => m.etapa === "presign" && m.tentativa === 1)
    .map((m) => m.em)
    .sort((a, b) => a - b);

  const cronograma = {
    picoPlanejado: janelaMaisCheia(cronogramaMs, config.duracaoPicoMs),
    picoObservado: janelaMaisCheia(inicios, config.duracaoPicoMs),
    maiorValeMs: maiorVale(cronogramaMs),
    concorrenciaMaxima: emVoo.maximo,
  };

  const idempotencia = await provarIdempotencia({ cliente, config, eventoId, vivos, criados, fotos });

  const execucao = {
    config,
    eventoId,
    bytesPorFoto,
    duracaoRealMs,
    cronograma,
    medidas,
    resultado,
    idempotencia,
    criados,
    veredito: vereditoFinal(config, resultado, idempotencia, medidas),
  };

  const destino = gravar(config, execucao);
  console.log(formatarRelatorio(execucao));
  console.log(`  números crus em ${destino}`);
  console.log(`  limpar com:  node tools/carga/limpar.mjs ${destino}\n`);

  // Sai diferente de zero quando o portão não foi cumprido: o arnês é gate,
  // não relatório informativo.
  process.exitCode = execucao.veredito.startsWith("PASSOU") ? 0 : 1;
}

/**
 * Fase de preparação, fora da janela medida.
 *
 * 🔴 `/api/sessions` limita 10 por minuto **por IP**, e num salão os
 * convidados estão todos atrás do mesmo NAT. Criar sessão mais rápido que o
 * limite mediria o rate limit, não o pipeline — por isso o ritmo, e por isso
 * `CARGA_IP_POR_CONVIDADO=1` existe para quem quiser medir o resto sem este
 * gargalo na frente.
 */
async function criarSessoes({ cliente, config, eventoId, medidas, criados }) {
  const intervalo = 60_000 / config.sessoesPorMinuto;
  const convidados = [];
  const inicio = performance.now();

  for (let i = 0; i < config.convidados; i += 1) {
    await dormir(inicio + i * intervalo - performance.now());

    // Nome sintético e óbvio: o arnês grava linha de verdade, e nome que
    // pareça de pessoa vira PII num banco de teste.
    const nome = `Convidado Teste ${String(i + 1).padStart(3, "0")}`;
    const ip = config.ipPorConvidado ? `198.51.100.${(i % 254) + 1}` : undefined;

    let r = await cliente.criarSessao({ eventoId, nome, ip });
    medidas.push({ etapa: "sessao", ok: r.ok, ms: r.ms, status: r.status, codigo: r.codigo, tentativa: 1, em: performance.now() - inicio });

    // Uma retentativa só, e depois do minuto virar: insistir contra o portão
    // não abre o portão.
    if (!r.ok && r.status === 429) {
      await dormir(60_000 / config.sessoesPorMinuto + 1000);
      r = await cliente.criarSessao({ eventoId, nome, ip });
      medidas.push({ etapa: "sessao", ok: r.ok, ms: r.ms, status: r.status, codigo: r.codigo, tentativa: 2, em: performance.now() - inicio });
    }

    if (r.ok && r.sessaoId) criados.sessaoIds.push(r.sessaoId);
    convidados.push({ cookie: r.cookie, sessaoId: r.sessaoId, ip });
  }

  return convidados;
}

/**
 * Um aparelho, uma foto por vez. A concorrência do teste vem de convidados
 * diferentes — que é de onde ela vem no salão.
 */
async function drenarFila({ convidado, fila, cliente, config, medidas, criados, relogio, emVoo, resultado }) {
  for (const item of fila) {
    await dormir(relogio.inicio + item.instante - performance.now());

    emVoo.agora += 1;
    emVoo.maximo = Math.max(emVoo.maximo, emVoo.agora);

    const fim = await subirComRetry({ convidado, item, cliente, config, medidas, criados, relogio });

    emVoo.agora -= 1;

    if (fim.ok) resultado.confirmados += 1;
    else resultado.perdidos += 1;
    if (fim.tentativas > 1) {
      resultado.comRetry += 1;
      resultado.retriesGastos += fim.tentativas - 1;
    }
  }
}

async function subirComRetry({ convidado, item, cliente, config, medidas, criados, relogio }) {
  const desdeOInicio = () => performance.now() - relogio.inicio;
  const anotar = (etapa, r, tentativa) =>
    medidas.push({ etapa, ok: r.ok, ms: r.ms, status: r.status, codigo: r.codigo, tentativa, em: desdeOInicio() });

  for (let tentativa = 1; tentativa <= config.tentativas; tentativa += 1) {
    const presign = await cliente.presign({
      cookie: convidado.cookie,
      uploadId: item.uploadId,
      bytes: item.foto.length,
      ip: convidado.ip,
    });
    anotar("presign", presign, tentativa);

    if (presign.ok) {
      if (!criados.chaves.includes(presign.resposta.chave)) {
        criados.chaves.push(presign.resposta.chave);
      }

      const put = await cliente.enviarBytes({ url: presign.resposta.full, corpo: item.foto });
      anotar("put", put, tentativa);

      if (put.ok) {
        const confirm = await cliente.confirmar({
          cookie: convidado.cookie,
          uploadId: item.uploadId,
          chave: presign.resposta.chave,
          ip: convidado.ip,
        });
        anotar("confirm", confirm, tentativa);

        if (confirm.ok) return { ok: true, tentativas: tentativa };
        if (ehDefinitivo(confirm.status)) return { ok: false, tentativas: tentativa };
      } else if (ehDefinitivo(put.status)) {
        return { ok: false, tentativas: tentativa };
      }
    } else if (ehDefinitivo(presign.status)) {
      return { ok: false, tentativas: tentativa };
    }

    if (tentativa < config.tentativas) await dormir(esperaAntesDeRetentar(tentativa) * 1000);
  }

  return { ok: false, tentativas: config.tentativas };
}

/**
 * A invariante 3 da task 004, sob concorrência: o mesmo `uploadId` chegando
 * duas vezes ao mesmo tempo tem de virar **uma** linha — nem duas, nem erro.
 *
 * Faz upload novo em vez de reusar um já confirmado: só assim as duas
 * chamadas disputam a inserção de verdade, que é a corrida que interessa.
 */
async function provarIdempotencia({ cliente, config, eventoId, vivos, criados, fotos }) {
  const provas = [];

  for (let i = 0; i < config.provasDeIdempotencia; i += 1) {
    const convidado = vivos[i % vivos.length];
    const uploadId = novoUploadId();
    criados.uploadIds.push(uploadId);

    const foto = fotos[i % fotos.length];
    const presign = await cliente.presign({
      cookie: convidado.cookie,
      uploadId,
      bytes: foto.length,
      ip: convidado.ip,
    });
    if (!presign.ok) {
      provas.push({ uploadId, criado: 0, jaExistia: 0, erro: 1, linhas: null, motivo: presign.codigo });
      continue;
    }
    criados.chaves.push(presign.resposta.chave);

    const put = await cliente.enviarBytes({ url: presign.resposta.full, corpo: foto });
    if (!put.ok) {
      provas.push({ uploadId, criado: 0, jaExistia: 0, erro: 1, linhas: null, motivo: "put" });
      continue;
    }

    const pedido = () =>
      cliente.confirmar({
        cookie: convidado.cookie,
        uploadId,
        chave: presign.resposta.chave,
        ip: convidado.ip,
      });

    const [a, b] = await Promise.all([pedido(), pedido()]);
    const respostas = [a, b];

    provas.push({
      uploadId,
      criado: respostas.filter((r) => r.ok && r.estado === "criado").length,
      jaExistia: respostas.filter((r) => r.ok && r.estado === "ja_existia").length,
      erro: respostas.filter((r) => !r.ok).length,
      linhas: null,
      motivo: null,
    });
  }

  const url = urlDoBanco(process.env);
  if (url && provas.length > 0) {
    const pool = abrir(url);
    try {
      const contagem = await contarUploads(pool, eventoId, provas.map((p) => p.uploadId));
      for (const p of provas) p.linhas = contagem.get(p.uploadId) ?? 0;
    } catch (e) {
      console.warn(`  contagem no banco não rodou: ${e.message}`);
    } finally {
      await pool.end();
    }
  }

  return { provas, veredito: vereditoDaIdempotencia(provas) };
}

function vereditoDaIdempotencia(provas) {
  if (provas.length === 0) return "não executada";

  const quebradas = provas.filter(
    (p) => p.erro > 0 || p.criado !== 1 || (p.linhas !== null && p.linhas !== 1),
  );

  if (quebradas.length > 0) {
    return `FALHOU — ${quebradas.length} de ${provas.length} não deram exatamente uma linha`;
  }

  const semBanco = provas.some((p) => p.linhas === null);
  return semBanco
    ? "passou pelo HTTP (uma resposta 'criado' por uploadId); sem DATABASE_URL não houve contagem no banco"
    : "passou — uma linha por uploadId, contada no banco";
}

function vereditoFinal(config, resultado, idempotencia, medidas) {
  const motivos = [];

  if (resultado.perdidos > 0) motivos.push(`${resultado.perdidos} upload(s) perdido(s)`);
  if (idempotencia.veredito.startsWith("FALHOU")) motivos.push("idempotência quebrada");

  const cincoxx = medidas.filter((m) => !m.ok && m.status >= 500).length;
  if (cincoxx > 0) motivos.push(`${cincoxx} resposta(s) 5xx`);

  return motivos.length === 0
    ? `PASSOU — ${resultado.confirmados} de ${config.total} confirmados, nenhum perdido`
    : `FALHOU — ${motivos.join("; ")}`;
}

function maiorVale(instantes) {
  let maior = 0;
  for (let i = 1; i < instantes.length; i += 1) {
    maior = Math.max(maior, instantes[i] - instantes[i - 1]);
  }
  return maior;
}

function gravar(config, execucao) {
  const pasta = config.saida ?? join(AQUI, "execucoes");
  mkdirSync(pasta, { recursive: true });

  const nome = `${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const destino = join(pasta, nome);
  writeFileSync(destino, `${JSON.stringify(paraJson(execucao), null, 2)}\n`);
  return destino;
}

principal().catch((e) => {
  if (e instanceof ErroDeConfig) {
    console.error(`\n${e.message}\n`);
    process.exit(2);
  }
  console.error(e);
  process.exit(1);
});
