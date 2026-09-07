import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarSessao } from "@albora/db";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { emitGuestMagicLink, verifyGuestMagicLink } from "./guest-magic-link";

const SEGREDO = "um-segredo-de-teste-com-mais-de-32-caracteres";
const BASE_URL = "https://convidado.albora.test";

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

function fakeSendEmail() {
  const chamadas: Array<{ to: string; subject: string; text: string }> = [];
  const sendEmail = async (mensagem: { to: string; subject: string; text: string }) => {
    chamadas.push(mensagem);
    return { enviado: true };
  };
  return { sendEmail, chamadas };
}

async function contar(pool: pg.Pool, tabela: string): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${tabela}`);
  return rows[0]!.n;
}

describe("emitGuestMagicLink", () => {
  it("sessão viva: grava guest_magic_links e envia e-mail com o link de callback", async () => {
    const sessionId = await sessaoDeConvidadoViva(dados.a.eventoId, "convidado-emit-viva");
    const { sendEmail, chamadas } = fakeSendEmail();
    const antes = await contar(admin, "guest_magic_links");

    const resultado = await emitGuestMagicLink(
      { pool: app, segredo: SEGREDO, baseUrl: BASE_URL, sendEmail },
      { eventId: dados.a.eventoId, guestSessionId: sessionId, email: "Convidado@Exemplo.test" },
    );

    const depois = await contar(admin, "guest_magic_links");

    expect(resultado).toEqual({ enviado: true });
    expect(depois).toBe(antes + 1);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]!.to).toBe("convidado@exemplo.test");
    expect(chamadas[0]!.text).toContain(`${BASE_URL}/auth/guest-magic/callback?token=`);
  });

  it("sessão fantasma: no-op — nada gravado, e-mail não enviado, {enviado:false}", async () => {
    const { sendEmail, chamadas } = fakeSendEmail();
    const antes = await contar(admin, "guest_magic_links");

    const resultado = await emitGuestMagicLink(
      { pool: app, segredo: SEGREDO, baseUrl: BASE_URL, sendEmail },
      {
        eventId: dados.a.eventoId,
        guestSessionId: "00000000-0000-0000-0000-000000000000",
        email: "fantasma@exemplo.test",
      },
    );

    const depois = await contar(admin, "guest_magic_links");

    expect(resultado).toEqual({ enviado: false });
    expect(depois).toBe(antes);
    expect(chamadas).toHaveLength(0);
  });

  it("nunca loga o e-mail cru", async () => {
    const sessionId = await sessaoDeConvidadoViva(dados.a.eventoId, "convidado-emit-log");
    const { sendEmail } = fakeSendEmail();
    const email = "nao-logar-emit@exemplo.test";
    const linhas: string[] = [];
    const originalLog = console.log;
    const originalWarn = console.warn;
    console.log = (...args: unknown[]) => linhas.push(args.map(String).join(" "));
    console.warn = (...args: unknown[]) => linhas.push(args.map(String).join(" "));

    try {
      await emitGuestMagicLink(
        { pool: app, segredo: SEGREDO, baseUrl: BASE_URL, sendEmail },
        { eventId: dados.a.eventoId, guestSessionId: sessionId, email },
      );
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
    }

    expect(linhas.some((linha) => linha.includes(email))).toBe(false);
  });
});

describe("verifyGuestMagicLink", () => {
  it("token válido: consome e grava guest_contacts verificado via magic_link", async () => {
    const sessionId = await sessaoDeConvidadoViva(dados.a.eventoId, "convidado-verify-ok");
    const { sendEmail, chamadas } = fakeSendEmail();
    const email = "convidado-verify@exemplo.test";

    await emitGuestMagicLink(
      { pool: app, segredo: SEGREDO, baseUrl: BASE_URL, sendEmail },
      { eventId: dados.a.eventoId, guestSessionId: sessionId, email },
    );
    const token = new URL(chamadas[0]!.text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;

    const resultado = await verifyGuestMagicLink(app, SEGREDO, token);

    expect(resultado).toEqual({ eventId: dados.a.eventoId });

    const { rows } = await admin.query<{ verified_via: string | null; verified_at: Date | null }>(
      `SELECT verified_via, verified_at FROM guest_contacts
        WHERE event_id = $1 AND session_id = $2 AND channel = 'email' AND value = $3`,
      [dados.a.eventoId, sessionId, email],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.verified_via).toBe("magic_link");
    expect(rows[0]!.verified_at).not.toBeNull();
  });

  it("segundo verify do mesmo token devolve null e não duplica o contato", async () => {
    const sessionId = await sessaoDeConvidadoViva(dados.a.eventoId, "convidado-verify-repete");
    const { sendEmail, chamadas } = fakeSendEmail();
    const email = "convidado-verify-repete@exemplo.test";

    await emitGuestMagicLink(
      { pool: app, segredo: SEGREDO, baseUrl: BASE_URL, sendEmail },
      { eventId: dados.a.eventoId, guestSessionId: sessionId, email },
    );
    const token = new URL(chamadas[0]!.text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;

    const primeiro = await verifyGuestMagicLink(app, SEGREDO, token);
    const segundo = await verifyGuestMagicLink(app, SEGREDO, token);

    expect(primeiro).toEqual({ eventId: dados.a.eventoId });
    expect(segundo).toBeNull();

    const { rows } = await admin.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM guest_contacts
        WHERE event_id = $1 AND session_id = $2 AND channel = 'email' AND value = $3`,
      [dados.a.eventoId, sessionId, email],
    );
    expect(rows[0]!.n).toBe(1);
  });

  it("token inválido/forjado devolve null sem escrever nada", async () => {
    const resultado = await verifyGuestMagicLink(app, SEGREDO, "forjado.sem-assinatura-valida");
    expect(resultado).toBeNull();
  });

  it("BLINDADO — verify nunca cria conta de anfitrião nem sessão de anfitrião (prova por ausência)", async () => {
    const sessionId = await sessaoDeConvidadoViva(dados.a.eventoId, "convidado-verify-blindado");
    const { sendEmail, chamadas } = fakeSendEmail();
    const email = "convidado-verify-blindado@exemplo.test";

    await emitGuestMagicLink(
      { pool: app, segredo: SEGREDO, baseUrl: BASE_URL, sendEmail },
      { eventId: dados.a.eventoId, guestSessionId: sessionId, email },
    );
    const token = new URL(chamadas[0]!.text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;

    const antesContas = await contar(admin, "accounts");
    const antesSessoesHost = await contar(admin, "host_sessions");

    await verifyGuestMagicLink(app, SEGREDO, token);

    const depoisContas = await contar(admin, "accounts");
    const depoisSessoesHost = await contar(admin, "host_sessions");

    expect(depoisContas).toBe(antesContas);
    expect(depoisSessoesHost).toBe(antesSessoesHost);
  });

  it("nunca loga o e-mail cru", async () => {
    const sessionId = await sessaoDeConvidadoViva(dados.a.eventoId, "convidado-verify-log");
    const { sendEmail, chamadas } = fakeSendEmail();
    const email = "nao-logar-verify@exemplo.test";

    await emitGuestMagicLink(
      { pool: app, segredo: SEGREDO, baseUrl: BASE_URL, sendEmail },
      { eventId: dados.a.eventoId, guestSessionId: sessionId, email },
    );
    const token = new URL(chamadas[0]!.text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;

    const linhas: string[] = [];
    const originalLog = console.log;
    const originalWarn = console.warn;
    console.log = (...args: unknown[]) => linhas.push(args.map(String).join(" "));
    console.warn = (...args: unknown[]) => linhas.push(args.map(String).join(" "));

    try {
      await verifyGuestMagicLink(app, SEGREDO, token);
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
    }

    expect(linhas.some((linha) => linha.includes(email))).toBe(false);
  });

  it("REGRA DE REVIEW (ADR 0018) — o código do magic link do convidado nunca referencia conta de anfitrião nem sessão de anfitrião", () => {
    const arquivo = path.join(path.dirname(fileURLToPath(import.meta.url)), "guest-magic-link.ts");
    const fonte = readFileSync(arquivo, "utf8");
    expect(fonte).not.toMatch(/\baccounts\b/);
    expect(fonte).not.toMatch(/host_sessions|hostCookie|issueMarkedHostSession/);
  });
});
