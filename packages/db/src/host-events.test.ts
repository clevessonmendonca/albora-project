import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  destacarMidiaDoHost,
  ocultarMidiaDoHost,
  reexibirMidiaDoHost,
  removerMidiaDoHost,
} from "./host-events";
import { chavesDoAcervo, idsDaCapsula, purgarAcervo } from "./retention-jobs";
import { comEvento } from "./event";
import { prepararBanco, semear } from "./testes/banco";

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

async function estado(uploadId: string): Promise<string> {
  const { rows } = await admin.query<{ state: string }>(
    "SELECT state FROM uploads WHERE id = $1",
    [uploadId],
  );
  return rows[0]?.state ?? "";
}

async function publicar(uploadId: string): Promise<void> {
  await admin.query("UPDATE uploads SET state = 'published', starred_at = NULL WHERE id = $1", [
    uploadId,
  ]);
}

describe("ocultar e remover são operações diferentes", () => {
  it("ocultar manda para hidden, não para removed", async () => {
    await publicar(dados.a.uploadId);
    const ok = await ocultarMidiaDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.uploadId);

    expect(ok).toBe(true);
    expect(await estado(dados.a.uploadId)).toBe("hidden");
  });

  it("reexibir desfaz o ocultar", async () => {
    await publicar(dados.a.uploadId);
    await ocultarMidiaDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.uploadId);
    const ok = await reexibirMidiaDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.uploadId);

    expect(ok).toBe(true);
    expect(await estado(dados.a.uploadId)).toBe("published");
  });

  it("reexibir não ressuscita o que foi removido de vez", async () => {
    await publicar(dados.a.uploadId);
    await removerMidiaDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.uploadId);
    const ok = await reexibirMidiaDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.uploadId);

    expect(ok).toBe(false);
    expect(await estado(dados.a.uploadId)).toBe("removed");
  });

  it("remover aceita foto já oculta — dá para escalar de ocultei para não quero", async () => {
    await publicar(dados.a.uploadId);
    await ocultarMidiaDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.uploadId);
    const ok = await removerMidiaDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.uploadId);

    expect(ok).toBe(true);
    expect(await estado(dados.a.uploadId)).toBe("removed");
  });

  it("conta de outro evento não oculta foto alheia", async () => {
    await publicar(dados.a.uploadId);
    const ok = await ocultarMidiaDoHost(app, dados.b.contaId, dados.a.eventoId, dados.a.uploadId);

    expect(ok).toBe(false);
    expect(await estado(dados.a.uploadId)).toBe("published");
  });
});

describe("destacar", () => {
  it("grava e tira o destaque", async () => {
    await publicar(dados.a.uploadId);
    expect(
      await destacarMidiaDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.uploadId, true),
    ).toBe(true);

    const { rows: comDestaque } = await admin.query<{ starred_at: Date | null }>(
      "SELECT starred_at FROM uploads WHERE id = $1",
      [dados.a.uploadId],
    );
    expect(comDestaque[0]?.starred_at).not.toBeNull();

    await destacarMidiaDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.uploadId, false);
    const { rows: semDestaque } = await admin.query<{ starred_at: Date | null }>(
      "SELECT starred_at FROM uploads WHERE id = $1",
      [dados.a.uploadId],
    );
    expect(semDestaque[0]?.starred_at).toBeNull();
  });

  it("conta alheia não destaca foto de outro evento", async () => {
    await publicar(dados.a.uploadId);
    const ok = await destacarMidiaDoHost(
      app,
      dados.b.contaId,
      dados.a.eventoId,
      dados.a.uploadId,
      true,
    );
    expect(ok).toBe(false);
  });
});

describe("cápsula de memória", () => {
  async function emailDaConta(): Promise<string> {
    const { rows } = await admin.query<{ email: string }>(
      "SELECT a.email FROM events e JOIN accounts a ON a.id = e.account_id WHERE e.id = $1",
      [dados.a.eventoId],
    );
    return rows[0]?.email ?? "";
  }

  async function ligarCapsula(ligada: boolean): Promise<void> {
    await admin.query("UPDATE events SET memory_capsule = $2 WHERE id = $1", [
      dados.a.eventoId,
      ligada,
    ]);
  }

  async function vincularSessaoAoCasal(): Promise<void> {
    await admin.query(
      `INSERT INTO guest_contacts (event_id, session_id, channel, value, verified_at, verified_via)
       VALUES ($1, $2, 'email', $3, now(), 'google')
       ON CONFLICT (event_id, session_id, channel, value)
       DO UPDATE SET verified_at = now()`,
      [dados.a.eventoId, dados.a.sessaoId, await emailDaConta()],
    );
  }

  async function desvincular(): Promise<void> {
    await admin.query("DELETE FROM guest_contacts WHERE event_id = $1", [dados.a.eventoId]);
  }

  it("desligada, não guarda nada — é o padrão", async () => {
    await publicar(dados.a.uploadId);
    await vincularSessaoAoCasal();
    await destacarMidiaDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.uploadId, true);
    await ligarCapsula(false);

    const ids = await comEvento(app, dados.a.eventoId, (c) => idsDaCapsula(c, dados.a.eventoId));
    expect(ids).toEqual([]);
  });

  it("ligada, guarda destaque do casal: sobrevive ao purge e sai das chaves a apagar", async () => {
    await publicar(dados.a.uploadId);
    await vincularSessaoAoCasal();
    await destacarMidiaDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.uploadId, true);
    await ligarCapsula(true);

    const chaves = await comEvento(app, dados.a.eventoId, (c) =>
      chavesDoAcervo(c, dados.a.eventoId),
    );
    expect(chaves).toEqual([]);

    await comEvento(app, dados.a.eventoId, (c) => purgarAcervo(c, dados.a.eventoId));
    expect(await estado(dados.a.uploadId)).toBe("capsule");
  });

  // A linha que a decisão de produto desenhou: o casal consente pelo que é
  // dele. Foto de convidado segue o prazo anunciado a ele.
  it("ligada, NÃO guarda destaque de convidado — consentimento de terceiro não é do casal para dar", async () => {
    await publicar(dados.a.uploadId);
    await desvincular();
    await destacarMidiaDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.uploadId, true);
    await ligarCapsula(true);

    const ids = await comEvento(app, dados.a.eventoId, (c) => idsDaCapsula(c, dados.a.eventoId));
    expect(ids).toEqual([]);

    await comEvento(app, dados.a.eventoId, (c) => purgarAcervo(c, dados.a.eventoId));
    expect(await estado(dados.a.uploadId)).toBe("purged");
  });

  it("ligada, não guarda o que não foi destacado", async () => {
    await publicar(dados.a.uploadId);
    await vincularSessaoAoCasal();
    await ligarCapsula(true);

    const ids = await comEvento(app, dados.a.eventoId, (c) => idsDaCapsula(c, dados.a.eventoId));
    expect(ids).toEqual([]);

    await comEvento(app, dados.a.eventoId, (c) => purgarAcervo(c, dados.a.eventoId));
    expect(await estado(dados.a.uploadId)).toBe("purged");
  });
});

// A retenção filtrava por `IN ('published','removed')`. Um estado novo escapava
// do apagamento do dia 365 — exatamente o que `hidden` teria feito.
describe("retenção alcança estado novo", () => {
  it("foto oculta entra nas chaves a apagar e é purgada", async () => {
    await publicar(dados.a.uploadId);
    await ocultarMidiaDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.uploadId);

    const chaves = await comEvento(app, dados.a.eventoId, (c) =>
      chavesDoAcervo(c, dados.a.eventoId),
    );
    expect(chaves.length).toBeGreaterThan(0);

    await comEvento(app, dados.a.eventoId, (c) => purgarAcervo(c, dados.a.eventoId));
    expect(await estado(dados.a.uploadId)).toBe("purged");
  });
});
