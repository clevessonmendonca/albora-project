import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import {
  consumirStepUp,
  criarJobExport,
  emitirStepUp,
  jobExportMaisRecente,
  VALIDADE_STEP_UP_MINUTOS,
} from "./export-db";
import { ErroMagicLinkInvalido } from "./host-auth";
import { prepararBanco, semear } from "./testes/banco";

const SEGREDO = "um-segredo-de-teste-com-mais-de-32-caracteres";
const daqui = (min: number) => new Date(Date.now() + min * 60 * 1000);

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

describe("o job de export só enxerga o evento do contexto", () => {
  it("o recorte de A tem a foto de A e nunca a de B", async () => {
    const job = await criarJobExport(app, dados.a.contaId, dados.a.eventoId);
    expect(job?.estado).toBe("pronto");
    expect(job?.fotos).toBe(1);
    expect(job?.itens.map((i) => i.id)).toContain(dados.a.uploadId);
    expect(job?.itens.map((i) => i.id)).not.toContain(dados.b.uploadId);
    expect(job?.itens[0]?.chave.startsWith(`events/${dados.a.eventoId}/`)).toBe(true);
    expect(job?.itens[0]?.chave.endsWith("/full")).toBe(true);
  });

  it("conta de A não cria job no evento de B", async () => {
    const job = await criarJobExport(app, dados.a.contaId, dados.b.eventoId);
    expect(job).toBeNull();
  });

  it("foto removida some do recorte — a mesma coluna do álbum", async () => {
    await admin.query("UPDATE uploads SET state = 'removed' WHERE id = $1", [dados.a.uploadId]);
    try {
      const job = await criarJobExport(app, dados.a.contaId, dados.a.eventoId);
      expect(job?.estado).toBe("vazio");
      expect(job?.fotos).toBe(0);
    } finally {
      await admin.query("UPDATE uploads SET state = 'published' WHERE id = $1", [dados.a.uploadId]);
    }
  });

  it("sem contexto de evento o job não vaza", async () => {
    await criarJobExport(app, dados.a.contaId, dados.a.eventoId);
    const cliente = await app.connect();
    try {
      const { rows } = await cliente.query<{ n: number }>("SELECT count(*)::int AS n FROM export_jobs");
      expect(rows[0]?.n).toBe(0);
    } finally {
      cliente.release();
    }
  });

  it("o job mais recente é o deste evento", async () => {
    const criado = await criarJobExport(app, dados.a.contaId, dados.a.eventoId);
    const lido = await jobExportMaisRecente(app, dados.a.contaId, dados.a.eventoId);
    expect(lido?.id).toBe(criado?.id);

    const deB = await comEvento(app, dados.a.eventoId, async (c) => {
      const { rows } = await c.query("SELECT count(*)::int AS n FROM export_jobs WHERE event_id = $1", [
        dados.b.eventoId,
      ]);
      return rows[0]?.n as number;
    });
    expect(deB).toBe(0);
  });
});

describe("o step-up do export é de uso único", () => {
  it("emite, consome, e a segunda vez recusa", async () => {
    const { token } = await emitirStepUp(admin, SEGREDO, dados.a.contaId, daqui(VALIDADE_STEP_UP_MINUTOS));
    await consumirStepUp(admin, SEGREDO, token, dados.a.contaId, new Date());
    await expect(
      consumirStepUp(admin, SEGREDO, token, dados.a.contaId, new Date()),
    ).rejects.toBeInstanceOf(ErroMagicLinkInvalido);
  });

  it("token da conta A não autentica a conta B", async () => {
    const { token } = await emitirStepUp(admin, SEGREDO, dados.a.contaId, daqui(15));
    await expect(
      consumirStepUp(admin, SEGREDO, token, dados.b.contaId, new Date()),
    ).rejects.toMatchObject({ motivo: "desconhecido" });
  });

  it("guarda o hash, nunca o token", async () => {
    const { token } = await emitirStepUp(admin, SEGREDO, dados.a.contaId, daqui(15));
    const { rows } = await admin.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM host_step_up WHERE encode(token_hash, 'hex') = $1",
      [token],
    );
    expect(rows[0]?.n).toBe("0");
  });
});
