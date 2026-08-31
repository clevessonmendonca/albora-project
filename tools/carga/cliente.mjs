/**
 * As quatro chamadas do pipeline, cronometradas uma a uma.
 *
 * Cada etapa é medida separada de propósito: um p99 de trinta segundos no
 * `presign` é o servidor engasgando, no `PUT` é o enlace do salão, e no
 * `confirm` é o banco. Um número só não diz onde consertar.
 *
 * O relógio é `performance.now()` — monotônico. `Date.now()` anda para trás
 * quando o NTP ajusta, e uma latência negativa no meio da rajada é a pior
 * amostra possível.
 */

import { randomUUID } from "node:crypto";

/**
 * @typedef {object} Medida
 * @property {"sessao"|"presign"|"put"|"confirm"} etapa
 * @property {boolean} ok
 * @property {number} ms
 * @property {number} status 0 quando nem chegou a haver resposta
 * @property {string|null} codigo
 * @property {number} tentativa
 * @property {number} em ms desde o início da janela
 */

/** @param {Response} res */
async function codigoDoErro(res) {
  try {
    const corpo = await res.json();
    return typeof corpo?.code === "string" ? corpo.code : null;
  } catch {
    return null;
  }
}

/**
 * Transforma qualquer falha — rede, DNS, timeout — em `{status, codigo}`.
 * Exceção escapando no meio da rajada derruba as medições seguintes junto.
 */
function comoFalha(e) {
  if (e?.name === "TimeoutError" || e?.name === "AbortError") {
    return { status: 0, codigo: "tempo_esgotado" };
  }
  return { status: 0, codigo: e?.cause?.code ?? e?.code ?? "rede" };
}

export class Cliente {
  /** @param {{alvo:string, tempoLimiteMs:number}} opcoes */
  constructor({ alvo, tempoLimiteMs }) {
    this.alvo = alvo;
    this.tempoLimiteMs = tempoLimiteMs;
  }

  /** @param {string} caminho @param {object} corpo @param {{cookie?:string, ip?:string}} extras */
  async #postar(caminho, corpo, { cookie, ip } = {}) {
    /** @type {Record<string,string>} */
    const cabecalhos = { "content-type": "application/json" };
    if (cookie) cabecalhos.cookie = cookie;
    // Só quando pedido: por padrão o arnês se apresenta como um IP só, que é
    // o salão real atrás de um NAT.
    if (ip) cabecalhos["x-forwarded-for"] = ip;

    return fetch(`${this.alvo}${caminho}`, {
      method: "POST",
      headers: cabecalhos,
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(this.tempoLimiteMs),
      redirect: "manual",
    });
  }

  /**
   * O `eventoId` é um uuid que o cliente nunca inventa: ele vem da página do
   * QR, que é como o convidado o obtém de verdade.
   *
   * @param {string} slug
   * @returns {Promise<string>}
   */
  async resolverEventoId(slug) {
    const res = await fetch(`${this.alvo}/e/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(this.tempoLimiteMs),
    });

    if (!res.ok) throw new Error(`página do evento respondeu ${res.status}`);

    const html = await res.text();
    const achados = new Set(
      html.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [],
    );

    if (achados.size !== 1) {
      throw new Error(
        `não deu para deduzir o event_id de /e/${slug} (achei ${achados.size}). ` +
          "Passe CARGA_EVENTO_ID com o uuid do evento de teste.",
      );
    }

    return [...achados][0];
  }

  /**
   * @param {{eventoId:string, nome:string, ip?:string}} entrada
   * @returns {Promise<{ok:boolean, status:number, codigo:string|null, ms:number, cookie:string|null, sessaoId:string|null}>}
   */
  async criarSessao({ eventoId, nome, ip }) {
    const t0 = performance.now();
    try {
      const res = await this.#postar(
        "/api/sessions",
        { eventoId, nome, consentimento: "v1" },
        { ip },
      );

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          codigo: await codigoDoErro(res),
          ms: performance.now() - t0,
          cookie: null,
          sessaoId: null,
        };
      }

      const { sessaoId } = await res.json();
      const bruto = res.headers.get("set-cookie") ?? "";
      const cookie = bruto.split(";")[0] || null;

      return { ok: true, status: res.status, codigo: null, ms: performance.now() - t0, cookie, sessaoId };
    } catch (e) {
      const { status, codigo } = comoFalha(e);
      return { ok: false, status, codigo, ms: performance.now() - t0, cookie: null, sessaoId: null };
    }
  }

  /** @param {{cookie:string, uploadId:string, bytes:number, ip?:string}} entrada */
  async presign({ cookie, uploadId, bytes, ip }) {
    const t0 = performance.now();
    try {
      const res = await this.#postar(
        "/api/uploads/presign",
        { uploadId, mime: "image/jpeg", bytes },
        { cookie, ip },
      );

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          codigo: await codigoDoErro(res),
          ms: performance.now() - t0,
          resposta: null,
        };
      }

      return {
        ok: true,
        status: res.status,
        codigo: null,
        ms: performance.now() - t0,
        resposta: await res.json(),
      };
    } catch (e) {
      const { status, codigo } = comoFalha(e);
      return { ok: false, status, codigo, ms: performance.now() - t0, resposta: null };
    }
  }

  /**
   * PUT direto no object storage. **O servidor não vê estes bytes** — é a
   * regra do caminho crítico, e é por isso que esta chamada não passa por
   * `this.alvo`.
   *
   * @param {{url:string, corpo:Uint8Array}} entrada
   */
  async enviarBytes({ url, corpo }) {
    const t0 = performance.now();
    try {
      const res = await fetch(url, {
        method: "PUT",
        body: corpo,
        headers: { "content-type": "image/jpeg" },
        signal: AbortSignal.timeout(this.tempoLimiteMs),
      });

      return {
        ok: res.ok,
        status: res.status,
        codigo: res.ok ? null : "storage",
        ms: performance.now() - t0,
      };
    } catch (e) {
      const { status, codigo } = comoFalha(e);
      return { ok: false, status, codigo, ms: performance.now() - t0 };
    }
  }

  /** @param {{cookie:string, uploadId:string, chave:string, ip?:string}} entrada */
  async confirmar({ cookie, uploadId, chave, ip }) {
    const t0 = performance.now();
    try {
      const res = await this.#postar(
        "/api/uploads/confirm",
        { uploadId, chave, mime: "image/jpeg", legenda: null, lugar: null, desafioId: null },
        { cookie, ip },
      );

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          codigo: await codigoDoErro(res),
          ms: performance.now() - t0,
          estado: null,
        };
      }

      const corpo = await res.json();
      return {
        ok: true,
        status: res.status,
        codigo: null,
        ms: performance.now() - t0,
        estado: corpo?.estado ?? null,
      };
    } catch (e) {
      const { status, codigo } = comoFalha(e);
      return { ok: false, status, codigo, ms: performance.now() - t0, estado: null };
    }
  }
}

export function novoUploadId() {
  return randomUUID();
}
