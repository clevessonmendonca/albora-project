import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { listAuditLog } from "@albora/db";
import { completeGoogleLoginHost } from "./complete-google-login-host";

const SEGREDO = "segredo-de-teste-com-pelo-menos-32-caracteres-ok";

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

describe("completeGoogleLoginHost", () => {
  it("e-mail novo — cria a conta e emite token de sessão de host", async () => {
    const email = "google-host-novo@exemplo.test";

    const resultado = await completeGoogleLoginHost(app, SEGREDO, { email, ipHash: "hash-ip" });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error("esperado ok");
    expect(resultado.token).toBeTruthy();
    expect(resultado.validityHours).toBeGreaterThan(0);

    const { rows: contas } = await admin.query<{ id: string; email: string }>(
      "SELECT id, email FROM accounts WHERE email = $1",
      [email],
    );
    expect(contas).toHaveLength(1);

    const { rows: auditoria } = await listAuditLog(admin, {
      action: "host.login.google",
      targetId: contas[0]!.id,
      limit: 5,
    });
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]?.targetKind).toBe("account");
  });

  it("e-mail existente — resolve a MESMA conta, não duplica (accounts.email é UNIQUE)", async () => {
    const email = "google-host-repete@exemplo.test";

    const primeira = await completeGoogleLoginHost(app, SEGREDO, { email, ipHash: "hash-ip" });
    const segunda = await completeGoogleLoginHost(app, SEGREDO, { email, ipHash: "hash-ip" });
    if (!primeira.ok || !segunda.ok) throw new Error("esperado ok em ambas");

    const { rows: contas } = await admin.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM accounts WHERE email = $1",
      [email],
    );
    expect(contas[0]?.n).toBe("1");
  });

  it("o token emitido resolve a uma sessão de host válida (mesma verificação do magic link)", async () => {
    const email = "google-host-sessao-valida@exemplo.test";

    const resultado = await completeGoogleLoginHost(app, SEGREDO, { email, ipHash: "hash-ip" });
    if (!resultado.ok) throw new Error("esperado ok");

    const { resolverHostSessao } = await import("@albora/db");
    const resolvida = await resolverHostSessao(app, SEGREDO, resultado.token);
    expect(resolvida.email).toBe(email);
    expect(resolvida.impersonationId).toBeNull();
  });

  it("nunca loga o e-mail cru", async () => {
    const email = "google-host-nao-logar@exemplo.test";
    const linhas: string[] = [];
    const originalLog = console.log;
    const originalWarn = console.warn;
    console.log = (...args: unknown[]) => linhas.push(args.map(String).join(" "));
    console.warn = (...args: unknown[]) => linhas.push(args.map(String).join(" "));

    try {
      await completeGoogleLoginHost(app, SEGREDO, { email, ipHash: "hash-ip" });
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
    }

    expect(linhas.some((linha) => linha.includes(email))).toBe(false);
  });
});
