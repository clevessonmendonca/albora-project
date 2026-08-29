/**
 * Configuração do arnês, lida do ambiente e validada na entrada.
 *
 * Nada de segredo aqui: o arnês fala com o alvo por HTTP como um convidado
 * falaria, e as credenciais que ele chega a usar — banco, R2, só na limpeza —
 * saem do ambiente, nunca de literal.
 */

const LOCAIS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

/**
 * Perfis nomeados do arnês existente — não é k6. Cada um só muda os
 * defaults de rajada; variáveis `CARGA_*` explícitas continuam ganhando.
 *
 * fumaca  — prova que o arnês sobe (CI semanal)
 * gate    — portão MVP: 150 uploads / 20 min
 * pico    — mesmo volume, mais sessões (salão cheio)
 * normal  — janela mais longa, rajada mais diluída
 * stress  — acima do portão, para achar o teto
 * soak    — horas, carga moderada; só local/manual (não no CI)
 */
export const PERFIS_DE_CARGA = {
  fumaca: { total: 6, duracaoMin: 1, convidados: 3, picos: 1 },
  gate: { total: 150, duracaoMin: 20, convidados: 50 },
  pico: { total: 150, duracaoMin: 20, convidados: 150 },
  normal: { total: 300, duracaoMin: 30, convidados: 50, picos: 2, fracaoEmPico: 0.4 },
  stress: { total: 400, duracaoMin: 20, convidados: 200, picos: 6, fracaoEmPico: 0.85 },
  soak: { total: 200, duracaoMin: 240, convidados: 30, picos: 8, fracaoEmPico: 0.3 },
};

/** @param {Record<string, string|undefined>} env */
function perfilOuVazio(env) {
  const nome = env.CARGA_PERFIL;
  if (!nome) return {};
  const perfil = PERFIS_DE_CARGA[nome];
  if (!perfil) {
    throw new ErroDeConfig(
      `CARGA_PERFIL desconhecido: ${nome}. Use: ${Object.keys(PERFIS_DE_CARGA).join(", ")}`,
    );
  }
  return perfil;
}

/** @param {string} alvo */
export function ehLocal(alvo) {
  // `URL` devolve IPv6 entre colchetes; sem tirá-los, `[::1]` não casaria e o
  // arnês pediria confirmação para o próprio computador.
  const hostname = new URL(alvo).hostname.replace(/^\[|\]$/g, "");
  return LOCAIS.has(hostname) || hostname.endsWith(".localhost");
}

/**
 * 🔴 Falha fechada. O arnês cria sessões e uploads **de verdade**, e apontá-lo
 * para produção por descuido sujaria o álbum de um casamento que aconteceu.
 *
 * A confirmação tem de ser o host exato, não um "sim": um `ALVO` digitado
 * errado deixa de casar com a confirmação e o arnês para em vez de rodar
 * contra o lugar errado.
 *
 * @param {string} alvo
 * @param {string|undefined} confirmacao
 */
export function guardarAlvo(alvo, confirmacao) {
  if (ehLocal(alvo)) return;

  const { host } = new URL(alvo);
  if (confirmacao !== host) {
    throw new ErroDeConfig(
      `alvo não é local: ${host}.\n` +
        `Para rodar mesmo assim, exporte a confirmação com o host exato:\n` +
        `  CARGA_CONFIRMO_ALVO=${host}`,
    );
  }
}

/** @param {Record<string, string|undefined>} env @param {string} nome @param {number} padrao */
function numero(env, nome, padrao) {
  const bruto = env[nome];
  if (bruto === undefined || bruto === "") return padrao;

  const v = Number(bruto);
  if (!Number.isFinite(v)) throw new ErroDeConfig(`${nome} não é número: ${bruto}`);
  return v;
}

/** @param {Record<string, string|undefined>} env */
export function lerConfig(env) {
  const alvo = (env.ALVO ?? "http://localhost:3000").replace(/\/+$/, "");

  try {
    new URL(alvo);
  } catch {
    throw new ErroDeConfig(`ALVO não é URL válida: ${alvo}`);
  }

  guardarAlvo(alvo, env.CARGA_CONFIRMO_ALVO);

  const local = ehLocal(alvo);
  const evento = env.CARGA_EVENTO ?? (local ? "festa-demo" : undefined);

  // Fora de localhost não existe evento padrão: o padrão é justamente o que
  // faz alguém rodar contra o evento errado sem perceber.
  if (!evento) {
    throw new ErroDeConfig("alvo remoto exige CARGA_EVENTO com o slug do evento de teste");
  }

  const eventoId = env.CARGA_EVENTO_ID;
  if (eventoId && !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(eventoId)) {
    throw new ErroDeConfig(`CARGA_EVENTO_ID não é uuid: ${eventoId}`);
  }

  const perfil = perfilOuVazio(env);

  const config = {
    alvo,
    local,
    evento,
    eventoId: eventoId ?? null,
    perfil: env.CARGA_PERFIL ?? null,

    total: numero(env, "CARGA_TOTAL", perfil.total ?? 150),
    duracaoMs: numero(env, "CARGA_DURACAO_MIN", perfil.duracaoMin ?? 20) * 60_000,
    convidados: numero(env, "CARGA_CONVIDADOS", perfil.convidados ?? 50),

    picos: numero(env, "CARGA_PICOS", perfil.picos ?? 4),
    fracaoEmPico: numero(env, "CARGA_FRACAO_PICO", perfil.fracaoEmPico ?? 0.7),
    duracaoPicoMs: numero(env, "CARGA_PICO_SEG", 45) * 1000,
    semente: env.CARGA_SEMENTE ?? "sabado-22h",

    imagens: numero(env, "CARGA_IMAGENS", 4),
    largura: numero(env, "CARGA_LARGURA", 1440),
    altura: numero(env, "CARGA_ALTURA", 1920),
    qualidade: numero(env, "CARGA_QUALIDADE", 82),
    grao: numero(env, "CARGA_GRAO", 20),

    // O limite de /api/sessions é 10 por minuto **por IP**, e num salão os 200
    // convidados estão atrás de um NAT só. Criar sessão mais rápido que isto
    // mede o rate limit, não o pipeline.
    sessoesPorMinuto: numero(env, "CARGA_SESSOES_POR_MINUTO", 9),
    ipPorConvidado: env.CARGA_IP_POR_CONVIDADO === "1",

    tentativas: numero(env, "CARGA_TENTATIVAS", 6),
    provasDeIdempotencia: numero(env, "CARGA_IDEMPOTENCIA", 3),

    tempoLimiteMs: numero(env, "CARGA_TIMEOUT_SEG", 120) * 1000,
    saida: env.CARGA_SAIDA ?? null,
  };

  if (!Number.isInteger(config.total) || config.total < 1) {
    throw new ErroDeConfig(`CARGA_TOTAL inválido: ${config.total}`);
  }
  if (!Number.isInteger(config.convidados) || config.convidados < 1) {
    throw new ErroDeConfig(`CARGA_CONVIDADOS inválido: ${config.convidados}`);
  }
  if (config.duracaoMs <= 0) throw new ErroDeConfig("CARGA_DURACAO_MIN precisa ser maior que zero");
  if (config.provasDeIdempotencia > config.total) {
    throw new ErroDeConfig("CARGA_IDEMPOTENCIA não pode passar de CARGA_TOTAL");
  }

  return config;
}

export class ErroDeConfig extends Error {
  code = "carga.config_invalida";
}
