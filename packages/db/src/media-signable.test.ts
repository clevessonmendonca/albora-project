import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signableKeys } from "./media-signable";
import { prepararBanco } from "./testes/banco";
import { comEvento } from "./event";

let admin: pg.Pool;
let app: pg.Pool;
let eventoA: string;
let eventoB: string;
let sessaoId: string;
const FULL_KEY_A = `events/PLACEHOLDER/2026/01/ffffffff-ffff-ffff-ffff-ffffffffffff/full`;
const THUMB_KEY_A = `events/PLACEHOLDER/2026/01/ffffffff-ffff-ffff-ffff-ffffffffffff/thumb`;

async function semearDados(adm: pg.Pool) {
  const { rows: conta } = await adm.query(
    "INSERT INTO accounts (email) VALUES ($1) RETURNING id",
    ["signable-test@exemplo.test"],
  );
  const contaId = conta[0].id as string;
  await adm.query("INSERT INTO packs (id) VALUES ('signable-pack') ON CONFLICT DO NOTHING");

  const criar = async (slug: string) => {
    const { rows: e } = await adm.query(
      `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status)
       VALUES ($1, 'signable-pack', $2, now(), now() + interval '6 hours', 'active') RETURNING id`,
      [contaId, slug],
    );
    const id = e[0].id as string;
    await adm.query("INSERT INTO event_slugs (slug, event_id) VALUES ($1, $2)", [slug, id]);
    const { rows: s } = await adm.query(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'tester', 'v1', now()) RETURNING id`,
      [id],
    );
    return { eventoId: id, sessaoId: s[0].id as string };
  };

  const a = await criar("sig-evento-a");
  const b = await criar("sig-evento-b");
  return { a, b };
}

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;

  const dados = await semearDados(admin);
  eventoA = dados.a.eventoId;
  eventoB = dados.b.eventoId;
  sessaoId = dados.a.sessaoId;

  const fullA = FULL_KEY_A.replace("PLACEHOLDER", eventoA);
  const fullB = FULL_KEY_A.replace("PLACEHOLDER", eventoB);

  await admin.query(
    `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes)
     VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 800000)`,
    [eventoA, sessaoId, fullA],
  );
  await admin.query(
    `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes)
     VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 800000)`,
    [eventoB, sessaoId.replace(sessaoId, sessaoId), fullB],
  );
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

function fullKey(eventoId: string) {
  return FULL_KEY_A.replace("PLACEHOLDER", eventoId);
}
function thumbKey(eventoId: string) {
  return THUMB_KEY_A.replace("PLACEHOLDER", eventoId);
}

describe("signableKeys — integração real", () => {
  it("upload publicado é signable", async () => {
    const result = await comEvento(app, eventoA, (c) =>
      signableKeys(c, eventoA, [fullKey(eventoA)]),
    );
    expect(result.has(fullKey(eventoA))).toBe(true);
  });

  it("chave /thumb de upload publicado é signable", async () => {
    const result = await comEvento(app, eventoA, (c) =>
      signableKeys(c, eventoA, [thumbKey(eventoA)]),
    );
    expect(result.has(thumbKey(eventoA))).toBe(true);
  });

  it("upload removido não é signable", async () => {
    const uid = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
    const removedKey = `events/${eventoA}/2026/02/${uid}/full`;
    await admin.query(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 800000, 'removed')`,
      [eventoA, sessaoId, removedKey],
    );

    const result = await comEvento(app, eventoA, (c) =>
      signableKeys(c, eventoA, [removedKey]),
    );
    expect(result.has(removedKey)).toBe(false);
  });

  it("chave sem upload correspondente não é signable", async () => {
    const uid = "99999999-9999-9999-9999-999999999999";
    const orphanKey = `events/${eventoA}/2026/03/${uid}/full`;

    const result = await comEvento(app, eventoA, (c) =>
      signableKeys(c, eventoA, [orphanKey]),
    );
    expect(result.has(orphanKey)).toBe(false);
  });

  it("evento em pânico: nenhuma chave é signable", async () => {
    await admin.query("UPDATE events SET panic = true WHERE id = $1", [eventoB]);

    try {
      const result = await comEvento(app, eventoB, (c) =>
        signableKeys(c, eventoB, [fullKey(eventoB)]),
      );
      expect(result.size).toBe(0);
    } finally {
      await admin.query("UPDATE events SET panic = false WHERE id = $1", [eventoB]);
    }
  });

  it("lote vazio retorna set vazio sem tocar no banco", async () => {
    const result = await comEvento(app, eventoA, (c) => signableKeys(c, eventoA, []));
    expect(result.size).toBe(0);
  });

  it("RLS: chave do evento B não aparece em signableKeys do evento A", async () => {
    const result = await comEvento(app, eventoA, (c) =>
      signableKeys(c, eventoA, [fullKey(eventoB)]),
    );
    expect(result.has(fullKey(eventoB))).toBe(false);
  });

  it("lote misto: só retorna as chaves signable", async () => {
    const uid = "cccccccc-cccc-cccc-cccc-cccccccccccc";
    const removedKey = `events/${eventoA}/2026/04/${uid}/full`;
    await admin.query(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 800000, 'removed')`,
      [eventoA, sessaoId, removedKey],
    );

    const result = await comEvento(app, eventoA, (c) =>
      signableKeys(c, eventoA, [fullKey(eventoA), removedKey]),
    );
    expect(result.has(fullKey(eventoA))).toBe(true);
    expect(result.has(removedKey)).toBe(false);
  });
});
