import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GET_TTL_SECONDS,
  isRejected,
  KEY_CAP,
  validateBatch,
} from "../app/api/media/urls/lote";
import { config, ErroOrigemDeMidia } from "./config";

const EVENTO = "3c465e29-f183-4436-92f5-df06d5b7f289";
const OUTRO_EVENTO = "9f1c2b04-77aa-4d1e-8b3c-0f5e6a7d8c91";
const FOTO = "2949f142-2435-4eeb-976a-540917ff5899";

function chave(eventoId: string, variante = "full", uuid = FOTO): string {
  return `events/${eventoId}/2026/08/${uuid}/${variante}`;
}

function chavesRepetidas(quantidade: number): string[] {
  return Array.from({ length: quantidade }, (_, i) =>
    chave(EVENTO, "full", `${FOTO.slice(0, -3)}${String(i).padStart(3, "0")}`),
  );
}

describe("chave conferida contra o evento da sessão", () => {
  it("aceita as duas variantes do próprio evento", () => {
    const lote = validateBatch([chave(EVENTO, "full"), chave(EVENTO, "thumb")], EVENTO);

    expect(isRejected(lote)).toBe(false);
    expect(isRejected(lote) ? [] : lote.chaves).toHaveLength(2);
  });

  it("recusa com 403 a chave de outro evento", () => {
    const lote = validateBatch([chave(OUTRO_EVENTO)], EVENTO);

    expect(isRejected(lote) && lote.status).toBe(403);
    expect(isRejected(lote) && lote.code).toBe("midia.chave_invalida");
  });

  it("uma chave alheia condena o lote inteiro", () => {
    const lote = validateBatch([chave(EVENTO), chave(OUTRO_EVENTO)], EVENTO);

    expect(isRejected(lote) && lote.status).toBe(403);
  });

  it("chave de outro evento e chave malformada são indistinguíveis", () => {
    const alheia = validateBatch([chave(OUTRO_EVENTO)], EVENTO);
    const torta = validateBatch([`events/${EVENTO}/nao-e-chave`], EVENTO);

    expect(isRejected(alheia) && isRejected(torta)).toBe(true);
    if (!isRejected(alheia) || !isRejected(torta)) return;

    expect({ status: alheia.status, code: alheia.code, message: alheia.message }).toEqual({
      status: torta.status,
      code: torta.code,
      message: torta.message,
    });
  });

  it("recusa travessia que começa com o prefixo do próprio evento", () => {
    const travessia = `events/${EVENTO}/../${OUTRO_EVENTO}/2026/08/${FOTO}/full`;

    expect(isRejected(validateBatch([travessia], EVENTO))).toBe(true);
  });

  it("recusa variante fora do conjunto fechado", () => {
    expect(isRejected(validateBatch([chave(EVENTO, "original")], EVENTO))).toBe(true);
    expect(isRejected(validateBatch([`events/${EVENTO}/export/acervo.zip`], EVENTO))).toBe(true);
  });

  it("recusa prefixo que só se parece com o do evento", () => {
    const quase = `events/${EVENTO}x/2026/08/${FOTO}/full`;

    expect(isRejected(validateBatch([quase], EVENTO))).toBe(true);
  });

  it("recusa chave com querystring pendurada", () => {
    expect(isRejected(validateBatch([`${chave(EVENTO)}?x=1`], EVENTO))).toBe(true);
  });

  it("devolve cada chave uma vez só", () => {
    const lote = validateBatch([chave(EVENTO), chave(EVENTO), chave(EVENTO)], EVENTO);

    expect(isRejected(lote) ? [] : lote.chaves).toEqual([chave(EVENTO)]);
  });
});

describe("teto do lote", () => {
  it("aceita exatamente o teto", () => {
    expect(isRejected(validateBatch(chavesRepetidas(KEY_CAP), EVENTO))).toBe(false);
  });

  it("recusa um acima do teto com 422", () => {
    const lote = validateBatch(chavesRepetidas(KEY_CAP + 1), EVENTO);

    expect(isRejected(lote) && lote.status).toBe(422);
    expect(isRejected(lote) && lote.code).toBe("midia.lote_excedido");
    expect(isRejected(lote) && lote.details).toEqual({
      teto: KEY_CAP,
      recebido: KEY_CAP + 1,
    });
  });

  it("o teto vem antes da conferência de chave — o lote condenado não custa nada", () => {
    const alheias = Array.from({ length: KEY_CAP + 1 }, () => chave(OUTRO_EVENTO));
    const lote = validateBatch(alheias, EVENTO);

    expect(isRejected(lote) && lote.code).toBe("midia.lote_excedido");
  });

  it("lista vazia é lote vazio, não erro", () => {
    const lote = validateBatch([], EVENTO);

    expect(isRejected(lote) ? null : lote.chaves).toEqual([]);
  });
});

describe("forma do corpo", () => {
  it("recusa o que não é lista", () => {
    for (const bruto of [undefined, null, "chave", 7, { chaves: [] }]) {
      const lote = validateBatch(bruto, EVENTO);
      expect(isRejected(lote) && lote.status).toBe(422);
      expect(isRejected(lote) && lote.code).toBe("validation_error");
    }
  });

  it("recusa item que não é string", () => {
    const lote = validateBatch([chave(EVENTO), 42], EVENTO);

    expect(isRejected(lote) && lote.code).toBe("validation_error");
  });
});

describe("validade da URL", () => {
  it("cabe numa rolagem de feed e não vale a noite inteira", () => {
    expect(GET_TTL_SECONDS).toBeGreaterThan(5 * 60);
    expect(GET_TTL_SECONDS).toBeLessThanOrEqual(30 * 60);
  });
});

/** `config()` memoíza só quando passa — o caso que NÃO lança vem por último: depois dele os stubs de ambiente não têm efeito. */
describe("mídia nunca sai da origem da aplicação", () => {
  afterEach(() => vi.unstubAllEnvs());

  function ambiente(raiz: string, midia: string): void {
    for (const [nome, valor] of [
      ["SESSION_SECRET", "s"],
      ["R2_ACCOUNT_ID", "conta"],
      ["R2_ACCESS_KEY_ID", "k"],
      ["R2_SECRET_ACCESS_KEY", "v"],
      ["R2_BUCKET", "b"],
      ["DATABASE_URL", "postgres://x"],
      ["APP_ROOT_DOMAIN", raiz],
      ["MEDIA_DOMAIN", midia],
    ]) {
      vi.stubEnv(nome as string, valor as string);
    }
  }

  it("recusa subir quando o domínio de mídia é a origem do app", () => {
    ambiente("albora.com.br", "albora.com.br");
    expect(() => config()).toThrow(ErroOrigemDeMidia);
  });

  it("recusa subir quando o domínio de mídia é subdomínio do domínio raiz", () => {
    // Cada evento é um `<slug>.<raiz>`: um evento de slug `midia` passaria a
    // ser servido da mesma origem que a mídia dele.
    ambiente("albora.com.br", "midia.albora.com.br");
    expect(() => config()).toThrow(ErroOrigemDeMidia);
  });

  it("esquema e porta não escondem a colisão", () => {
    ambiente("albora.com.br:443", "https://midia.albora.com.br:8443/");
    expect(() => config()).toThrow(ErroOrigemDeMidia);
  });

  it("recusa subir quando não dá para provar a separação", () => {
    ambiente("", "midia.albora.com.br");
    expect(() => config()).toThrow(ErroOrigemDeMidia);
  });

  it("o endpoint do R2 é outra origem, e sobe", () => {
    ambiente("albora.com.br", "");
    expect(config().origemDaMidia).toBe("conta.r2.cloudflarestorage.com");
  });
});
