import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { issueDeliveryToken, ErroTokenDeEntrega } from "@albora/db";
import { openGuestGallery } from "./open-gallery";

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

const signGet = async (key: string, ttl: number) => `https://signed/${key}?ttl=${ttl}`;

async function emitirToken(eventoId: string, sessaoId: string): Promise<string> {
  const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const { token } = await issueDeliveryToken(app, SEGREDO, eventoId, sessaoId, expiraEm);
  return token;
}

async function novoUpload(
  eventoId: string,
  sessaoId: string,
  chave: string,
  state: string = "published",
): Promise<string> {
  const { rows } = await admin.query(
    `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state)
     VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 800000, $4) RETURNING id`,
    [eventoId, sessaoId, chave, state],
  );
  return rows[0].id as string;
}

describe("openGuestGallery", () => {
  it("token válido lista fotos publicadas da sessão com URLs presigned de full e thumb", async () => {
    const eventoId = dados.a.eventoId;
    const sessaoId = dados.a.sessaoId;
    const chave = `events/${eventoId}/2026/09/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/full`;
    await novoUpload(eventoId, sessaoId, chave);

    const token = await emitirToken(eventoId, sessaoId);

    const resultado = await openGuestGallery({ pool: app, segredo: SEGREDO, signGet }, token);

    expect(resultado.eventId).toBe(eventoId);
    const foto = resultado.fotos.find((f) => f.url.includes(chave));
    expect(foto).toBeDefined();
    expect(foto!.url).toBe(`https://signed/${chave}?ttl=3600`);
    expect(foto!.thumbUrl).toBe(`https://signed/events/${eventoId}/2026/09/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/thumb?ttl=3600`);
    expect(foto!.mime).toBe("image/jpeg");
  });

  it("foto não-publicada é excluída via signableKeys", async () => {
    const eventoId = dados.a.eventoId;
    const sessaoId = dados.a.sessaoId;
    const chave = `events/${eventoId}/2026/09/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/full`;
    // "pending" (não "removed"): precisa chegar em signableKeys — que só
    // libera state='published' — para o teste provar que é ELE que exclui.
    // "removed" já cai fora antes, em listarMinhasDoEvento (`state <>
    // 'removed'`), e passaria mesmo sem o filtro de signableKeys.
    await novoUpload(eventoId, sessaoId, chave, "pending");

    const token = await emitirToken(eventoId, sessaoId);

    const resultado = await openGuestGallery({ pool: app, segredo: SEGREDO, signGet }, token);

    expect(resultado.fotos.some((f) => f.url.includes(chave))).toBe(false);
  });

  it("evento em panic: galeria vem vazia", async () => {
    const eventoId = dados.b.eventoId;
    const sessaoId = dados.b.sessaoId;
    const chave = `events/${eventoId}/2026/09/cccccccc-cccc-cccc-cccc-cccccccccccc/full`;
    await novoUpload(eventoId, sessaoId, chave);
    await admin.query("UPDATE events SET panic = true WHERE id = $1", [eventoId]);

    const token = await emitirToken(eventoId, sessaoId);

    const resultado = await openGuestGallery({ pool: app, segredo: SEGREDO, signGet }, token);

    expect(resultado.fotos).toEqual([]);

    await admin.query("UPDATE events SET panic = false WHERE id = $1", [eventoId]);
  });

  it("token expirado/inválido lança ErroTokenDeEntrega", async () => {
    await expect(
      openGuestGallery({ pool: app, segredo: SEGREDO, signGet }, "token-que-nao-existe"),
    ).rejects.toThrow(ErroTokenDeEntrega);
  });
});
