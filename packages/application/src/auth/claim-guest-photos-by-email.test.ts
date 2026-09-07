import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarSessao } from "@albora/db";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { claimGuestPhotosByEmail } from "./claim-guest-photos-by-email";

const SEGREDO = "um-segredo-de-teste-com-mais-de-32-caracteres";

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

async function sessaoDeConvidadoViva(eventoId: string, nome: string): Promise<string> {
  const { sessaoId } = await criarSessao(app, SEGREDO, {
    eventoId,
    nome,
    consentimentoVersao: "v1",
    duracaoHoras: 1,
  });
  return sessaoId;
}

describe("claimGuestPhotosByEmail", () => {
  it("grava guest_contacts verificado quando a sessão está viva no evento", async () => {
    const sessionId = await sessaoDeConvidadoViva(dados.a.eventoId, "convidado-grava");

    await claimGuestPhotosByEmail(app, {
      eventId: dados.a.eventoId,
      guestSessionId: sessionId,
      email: "Convidado@Exemplo.test",
    });

    const { rows } = await admin.query<{ verified_at: Date | null; verified_via: string | null }>(
      `SELECT verified_at, verified_via FROM guest_contacts
        WHERE event_id = $1 AND session_id = $2 AND channel = 'email' AND value = $3`,
      [dados.a.eventoId, sessionId, "convidado@exemplo.test"],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]!.verified_via).toBe("google");
    expect(rows[0]!.verified_at).not.toBeNull();
  });

  it("idempotente — reivindicar duas vezes não duplica, só atualiza a verificação", async () => {
    const sessionId = await sessaoDeConvidadoViva(dados.a.eventoId, "convidado-repete");
    const email = "convidado-repete@exemplo.test";

    await claimGuestPhotosByEmail(app, { eventId: dados.a.eventoId, guestSessionId: sessionId, email });
    await claimGuestPhotosByEmail(app, { eventId: dados.a.eventoId, guestSessionId: sessionId, email });

    const { rows } = await admin.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM guest_contacts
        WHERE event_id = $1 AND session_id = $2 AND channel = 'email' AND value = $3`,
      [dados.a.eventoId, sessionId, email],
    );
    expect(rows[0]!.n).toBe(1);
  });

  it("concorrente — dois claims em paralelo na mesma sessão gravam UMA linha (UNIQUE, não corrida)", async () => {
    const sessionId = await sessaoDeConvidadoViva(dados.a.eventoId, "convidado-concorrente");
    const email = "convidado-concorrente@exemplo.test";

    // Sem a UNIQUE da migration 0069, os dois passavam o SELECT vazio e
    // inseriam duas linhas. Com ela, um insere e o outro cai no ON CONFLICT.
    await Promise.all([
      claimGuestPhotosByEmail(app, { eventId: dados.a.eventoId, guestSessionId: sessionId, email }),
      claimGuestPhotosByEmail(app, { eventId: dados.a.eventoId, guestSessionId: sessionId, email }),
    ]);

    const { rows } = await admin.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM guest_contacts
        WHERE event_id = $1 AND session_id = $2 AND channel = 'email' AND value = $3`,
      [dados.a.eventoId, sessionId, email],
    );
    expect(rows[0]!.n).toBe(1);
  });

  it("sessão inexistente nunca grava contato", async () => {
    await claimGuestPhotosByEmail(app, {
      eventId: dados.a.eventoId,
      guestSessionId: "00000000-0000-0000-0000-000000000000",
      email: "fantasma@exemplo.test",
    });

    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM guest_contacts WHERE value = 'fantasma@exemplo.test'",
    );
    expect(rows[0]!.n).toBe(0);
  });

  it("sessão de outro evento nunca grava contato — não cruza evento", async () => {
    const sessionId = await sessaoDeConvidadoViva(dados.a.eventoId, "convidado-de-a");

    await claimGuestPhotosByEmail(app, {
      eventId: dados.b.eventoId,
      guestSessionId: sessionId,
      email: "cruzado@exemplo.test",
    });

    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM guest_contacts WHERE value = 'cruzado@exemplo.test'",
    );
    expect(rows[0]!.n).toBe(0);
  });

  it("BLINDADO — nunca cria conta de anfitrião nem sessão de anfitrião (prova por ausência)", async () => {
    const sessionId = await sessaoDeConvidadoViva(dados.a.eventoId, "convidado-blindado");

    const { rows: antesContas } = await admin.query<{ n: number }>("SELECT count(*)::int AS n FROM accounts");
    const { rows: antesSessoesHost } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM host_sessions",
    );

    await claimGuestPhotosByEmail(app, {
      eventId: dados.a.eventoId,
      guestSessionId: sessionId,
      email: "convidado-blindado@exemplo.test",
    });

    const { rows: depoisContas } = await admin.query<{ n: number }>("SELECT count(*)::int AS n FROM accounts");
    const { rows: depoisSessoesHost } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM host_sessions",
    );

    expect(depoisContas[0]!.n).toBe(antesContas[0]!.n);
    expect(depoisSessoesHost[0]!.n).toBe(antesSessoesHost[0]!.n);
  });

  it("nunca loga o e-mail cru", async () => {
    const sessionId = await sessaoDeConvidadoViva(dados.a.eventoId, "convidado-log");
    const email = "nao-logar@exemplo.test";
    const linhas: string[] = [];
    const originalLog = console.log;
    const originalWarn = console.warn;
    console.log = (...args: unknown[]) => linhas.push(args.map(String).join(" "));
    console.warn = (...args: unknown[]) => linhas.push(args.map(String).join(" "));

    try {
      await claimGuestPhotosByEmail(app, { eventId: dados.a.eventoId, guestSessionId: sessionId, email });
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
    }

    expect(linhas.some((linha) => linha.includes(email))).toBe(false);
  });

  it("REGRA DE REVIEW (ADR 0018) — o código do caminho guest nunca referencia conta de anfitrião nem sessão de anfitrião", () => {
    const arquivo = path.join(path.dirname(fileURLToPath(import.meta.url)), "claim-guest-photos-by-email.ts");
    const fonte = readFileSync(arquivo, "utf8");
    expect(fonte).not.toMatch(/\baccounts\b/);
    expect(fonte).not.toMatch(/hostCookie|issueMarkedHostSession|host_sessions/);
  });
});
