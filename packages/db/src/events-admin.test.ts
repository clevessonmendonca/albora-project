import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { collectEventLiveMetrics } from "./analytics";
import { getEventDetailAdmin, isH1Calculavel, listEventsAdmin } from "./events-admin";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let agregador: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  agregador = pools.agregador;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await agregador?.end();
});

describe("isH1Calculavel", () => {
  it("expected_guests ausente ou <= 0 não é calculável — H1 vira null, não 0", () => {
    expect(isH1Calculavel(null)).toBe(false);
    expect(isH1Calculavel(undefined)).toBe(false);
    expect(isH1Calculavel(0)).toBe(false);
    expect(isH1Calculavel(-1)).toBe(false);
    expect(isH1Calculavel(Number.NaN)).toBe(false);
  });

  it("expected_guests válido é calculável", () => {
    expect(isH1Calculavel(150)).toBe(true);
    expect(isH1Calculavel(1)).toBe(true);
  });
});

describe("listEventsAdmin", () => {
  it("traz H1 do evento e zero PII de convidado", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    await admin.query("UPDATE events SET expected_guests = 1 WHERE id = $1", [a.eventoId]);

    const { rows } = await listEventsAdmin(agregador, { limit: 20 });
    const evento = rows.find((r) => r.id === a.eventoId);

    expect(evento?.h1).toBeCloseTo(1, 5);
    const chaves = Object.keys(evento ?? {});
    expect(chaves).not.toContain("displayName");
    expect(chaves).not.toContain("guestName");
    expect(JSON.stringify(evento)).not.toContain("convidado-evento-a");
  });

  it("anfitrião aparece mascarado, nunca o e-mail cru", async () => {
    await prepararBanco();
    const { a } = await semear(admin);

    const { rows } = await listEventsAdmin(agregador, { limit: 20 });
    const evento = rows.find((r) => r.id === a.eventoId);

    expect(evento?.hostMaskedEmail).toMatch(/^.{1,2}•+@/);
    expect(evento?.hostMaskedEmail).not.toContain("anfitriao-a@exemplo.test");
  });

  it("cursor devolve página seguinte sem repetir linha", async () => {
    await prepararBanco();
    await semear(admin); // dois eventos, sob contas distintas

    const primeira = await listEventsAdmin(agregador, { limit: 1 });
    expect(primeira.nextCursor).not.toBeNull();
    const segunda = await listEventsAdmin(agregador, { limit: 1, cursor: primeira.nextCursor! });

    expect(segunda.rows).toHaveLength(1);
    expect(segunda.rows[0]?.id).not.toBe(primeira.rows[0]?.id);
  });

  it("filtro de status entra no WHERE — contagem reflete só o conjunto filtrado", async () => {
    await prepararBanco();
    await semear(admin); // ambos os eventos nascem 'active' (semear insere status explícito)

    const { rows } = await listEventsAdmin(agregador, { limit: 20, status: "draft" });
    expect(rows).toHaveLength(0);
  });
});

describe("getEventDetailAdmin", () => {
  it("evento inexistente devolve null", async () => {
    await prepararBanco();
    expect(await getEventDetailAdmin(agregador, "00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("evento existente traz funil e consentimento agregados, sem nome de convidado", async () => {
    await prepararBanco();
    const { a } = await semear(admin);

    const detalhe = await getEventDetailAdmin(agregador, a.eventoId);

    expect(detalhe?.id).toBe(a.eventoId);
    expect(detalhe?.consentsByVersion.some((c) => c.versao === "v1")).toBe(true);
    expect(JSON.stringify(detalhe)).not.toContain("convidado-evento-a");
    expect(detalhe?.hostMaskedEmail).not.toContain("anfitriao-a@exemplo.test");
  });

});

describe("listEventsAdmin — custo da página", () => {
  /** Cria `quantos` eventos publicados, cada um com uploads suficientes para os números não serem todos iguais. */
  async function semearVarios(quantos: number): Promise<string[]> {
    const { rows: conta } = await admin.query<{ id: string }>(
      "INSERT INTO accounts (email) VALUES ('lote@exemplo.test') RETURNING id",
    );
    const contaId = conta[0]!.id;
    await admin.query("INSERT INTO packs (id) VALUES ('pack-lote') ON CONFLICT (id) DO NOTHING");

    const ids: string[] = [];
    for (let i = 0; i < quantos; i += 1) {
      const { rows } = await admin.query<{ id: string }>(
        `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status, expected_guests)
         VALUES ($1, 'pack-lote', $2, now() - interval '1 day', now() - interval '18 hours', 'active', $3)
         RETURNING id`,
        [contaId, `lote-${i}`, 10 + i],
      );
      const eventoId = rows[0]!.id;
      ids.push(eventoId);
      await admin.query("INSERT INTO event_slugs (slug, event_id) VALUES ($1, $2)", [`lote-${i}`, eventoId]);

      // Número de sessões e de fotos varia por evento: se todos fossem iguais,
      // uma agregação que trocasse as linhas de lugar passaria despercebida.
      for (let sessao = 0; sessao <= i % 3; sessao += 1) {
        const { rows: s } = await admin.query<{ id: string }>(
          `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
           VALUES ($1, $2, 'v1', now()) RETURNING id`,
          [eventoId, `c-${i}-${sessao}`],
        );
        for (let foto = 0; foto <= i % 2; foto += 1) {
          await admin.query(
            `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state)
             VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 1000, 'published')`,
            [eventoId, s[0]!.id, `events/${eventoId}/f-${sessao}-${foto}.jpg`],
          );
        }
      }
    }
    return ids;
  }

  it("os números batem com o cálculo por evento — a agregação em lote não muda resultado", async () => {
    await prepararBanco();
    const ids = await semearVarios(12);

    const { rows } = await listEventsAdmin(agregador, { limit: 50 });
    expect(rows).toHaveLength(ids.length);

    for (const linha of rows) {
      const porEvento = await collectEventLiveMetrics(agregador, linha.id);
      expect(linha.totalFotos, `fotos de ${linha.id}`).toBe(porEvento.totalFotos);
      expect(linha.h1, `h1 de ${linha.id}`).toBe(porEvento.participacao);
    }
  }, 60_000);

  it("uma página custa um punhado de consultas, não duas por linha", async () => {
    await prepararBanco();
    await semearVarios(20);

    let consultas = 0;
    const contando = {
      query: (...args: unknown[]) => {
        consultas += 1;
        return (agregador.query as (...a: unknown[]) => unknown)(...args);
      },
      connect: () => agregador.connect(),
    } as unknown as typeof agregador;

    const { rows } = await listEventsAdmin(contando, { limit: 20 });

    expect(rows).toHaveLength(20);
    // Antes: 1 (página) + ~2 por linha = 40+, em série. Agora: página + lote.
    expect(consultas, `consultas para 20 eventos: ${consultas}`).toBeLessThanOrEqual(3);
  }, 60_000);
});
