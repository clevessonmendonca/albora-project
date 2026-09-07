import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createStaffUser } from "@albora/db";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { listActiveStaff } from "./list-active-staff";

let admin: pg.Pool;
let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

function actor(roles: string[]) {
  return { staffUserId: "s1", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

describe("listActiveStaff", () => {
  it("nega quem não tem tickets.assign — finance só lê a fila, não atribui", async () => {
    await expect(listActiveStaff({ pool: {} as never }, { actor: actor(["finance"]) })).rejects.toThrow(
      CommandDeniedError,
    );
  });

  it("não passa por withPlatformAggregation — chama listActiveStaffUsers direto no pool normal", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as never;
    await listActiveStaff({ pool }, { actor: actor(["support"]) });
    expect(query).toHaveBeenCalled();
  });

  it("devolve só staff active para quem tem tickets.assign", async () => {
    await prepararBanco();
    await createStaffUser(admin, { email: "ativa-dropdown@equipe.test", name: "Ativa Dropdown" });
    const suspenso = await createStaffUser(admin, { email: "suspensa-dropdown@equipe.test", name: "Suspensa Dropdown" });
    await admin.query("UPDATE staff_users SET status = 'suspended' WHERE id = $1", [suspenso.id]);

    const opcoes = await listActiveStaff({ pool: app }, { actor: actor(["support"]) });
    expect(opcoes.some((o) => o.email === "ativa-dropdown@equipe.test")).toBe(true);
    expect(opcoes.some((o) => o.id === suspenso.id)).toBe(false);
  });
});
