import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
