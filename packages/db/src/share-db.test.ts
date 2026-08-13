import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { VERSAO_DO_CONSENTIMENTO_EXTERNO } from "@albora/core";
import { comEvento } from "./event";
import { buscarContextoCompartilhar, registrarConsentimentoExterno } from "./share-db";
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

describe("compartilhar db", () => {
  it("registra consentimento externo na sessão", async () => {
    const ok = await comEvento(app, dados.a.eventoId, (c) =>
      registrarConsentimentoExterno(c, dados.a.sessaoId, true),
    );
    expect(ok).toBe(true);

    const { rows } = await admin.query<{ external_consent_version: string }>(
      "SELECT external_consent_version FROM guest_sessions WHERE id = $1",
      [dados.a.sessaoId],
    );
    expect(rows[0]?.external_consent_version).toBe(VERSAO_DO_CONSENTIMENTO_EXTERNO);
  });

  it("busca contexto só para mídia da própria sessão", async () => {
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state, released_by_host)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 500000, 'published', true)
       RETURNING id`,
      [dados.a.eventoId, dados.a.sessaoId, `events/${dados.a.eventoId}/share/full`],
    );
    const uploadId = rows[0]!.id;

    const ctx = await comEvento(app, dados.a.eventoId, (c) =>
      buscarContextoCompartilhar(c, dados.a.sessaoId, uploadId),
    );

    expect(ctx?.midia.id).toBe(uploadId);
    expect(ctx?.sessao.sessaoId).toBe(dados.a.sessaoId);
    expect(ctx?.evento.slug).toBeTruthy();

    const cruzado = await comEvento(app, dados.b.eventoId, (c) =>
      buscarContextoCompartilhar(c, dados.b.sessaoId, uploadId),
    );
    expect(cruzado).toBeNull();
  });
});
