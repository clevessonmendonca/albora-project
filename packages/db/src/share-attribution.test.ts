import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { recordProductEvent } from "./analytics";
import { comEvento } from "./event";
import { criarEvento } from "./events";
import { contarSharesDoEvento } from "./funnel-aggregate";
import { registrarEventoDoFunil } from "./funnel-events";
import {
  eventoDoRef,
  mintarRefDeCompartilhamento,
  refDoEvento,
  resumoAtribuicaoViral,
} from "./share-attribution";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let app: pg.Pool;
let agregador: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  agregador = pools.agregador;
  dados = await semear(admin);
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end(), agregador?.end()]);
});

const daquiA = (horas: number) => new Date(Date.now() + horas * 3600_000);

/** Evento sem `criarEvento` — isola o teste de retry-em-colisão de `mintarRefDeCompartilhamento` do mint automático que `criarEvento` já faz. */
async function eventoNu(slug: string, packId: string, accountId: string): Promise<string> {
  const { rows } = await admin.query<{ id: string }>(
    `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status)
     VALUES ($1, $2, $3, now(), now() + interval '6 hours', 'active') RETURNING id`,
    [accountId, packId, slug],
  );
  return rows[0]!.id;
}

describe("criarEvento mint o ref_token na mesma transação do slug", () => {
  it("todo evento novo nasce com um ref_token opaco e único", async () => {
    const { eventoId } = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: daquiA(-1),
      terminaEm: daquiA(6),
    });

    const { rows } = await admin.query<{ ref_token: string }>(
      "SELECT ref_token FROM event_share_refs WHERE event_id = $1",
      [eventoId],
    );
    expect(rows[0]?.ref_token).toBeTruthy();
    expect(rows[0]!.ref_token).not.toBe(eventoId);
  });

  it("dois eventos nunca recebem o mesmo ref_token", async () => {
    const um = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: daquiA(-1),
      terminaEm: daquiA(6),
    });
    const dois = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: daquiA(-1),
      terminaEm: daquiA(6),
    });

    const { rows } = await admin.query<{ event_id: string; ref_token: string }>(
      "SELECT event_id, ref_token FROM event_share_refs WHERE event_id = ANY($1)",
      [[um.eventoId, dois.eventoId]],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]!.ref_token).not.toBe(rows[1]!.ref_token);
  });

  it("reaposta na colisão de ref_token entre eventos diferentes, sem estourar", async () => {
    const eventoX = await eventoNu("evento-x-ref", "pack-um", dados.a.contaId);
    const eventoY = await eventoNu("evento-y-ref", "pack-um", dados.a.contaId);

    // rand=0 fixa o alfabeto no primeiro caractere — "aaaa…a" (24×).
    await comEvento(app, eventoX, (c) => mintarRefDeCompartilhamento(c, eventoX, () => 0));

    let tentativas = 0;
    const randQueVaria = () => {
      tentativas += 1;
      // Primeira tentativa gera o mesmo "aaaa…a" de eventoX — colide no `ref_token` (não no `event_id`, que já é outro); o retry só termina quando o rand varia.
      return tentativas === 1 ? 0 : Math.random();
    };

    await comEvento(app, eventoY, (c) => mintarRefDeCompartilhamento(c, eventoY, randQueVaria));

    expect(tentativas).toBeGreaterThan(1);
    const { rows } = await admin.query<{ event_id: string; ref_token: string }>(
      "SELECT event_id, ref_token FROM event_share_refs WHERE event_id = ANY($1)",
      [[eventoX, eventoY]],
    );
    const tokens = rows.map((r) => r.ref_token);
    expect(new Set(tokens).size).toBe(2);
  });
});

describe("isolamento entre eventos", () => {
  it("refDoEvento só lê o ref_token do próprio evento, dentro de comEvento", async () => {
    const um = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: daquiA(-1),
      terminaEm: daquiA(6),
    });
    const dois = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: daquiA(-1),
      terminaEm: daquiA(6),
    });

    const refUm = await comEvento(app, um.eventoId, (c) => refDoEvento(c, um.eventoId));
    const refDois = await comEvento(app, dois.eventoId, (c) => refDoEvento(c, dois.eventoId));

    expect(refUm).toBeTruthy();
    expect(refDois).toBeTruthy();
    expect(refUm).not.toBe(refDois);
  });

  it("sob RLS, comEvento de um evento não vê o ref_token de outro", async () => {
    const um = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: daquiA(-1),
      terminaEm: daquiA(6),
    });
    const dois = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: daquiA(-1),
      terminaEm: daquiA(6),
    });

    const cruzado = await comEvento(app, um.eventoId, (c) => refDoEvento(c, dois.eventoId));
    expect(cruzado).toBeNull();
  });

  it("evento semeado direto (sem passar por criarEvento) não tem ref_token", async () => {
    const semRef = await comEvento(app, dados.b.eventoId, (c) => refDoEvento(c, dados.b.eventoId));
    // dados.b nasceu via `semear` (INSERT direto), nunca passou por
    // `criarEvento` — não tem ref_token, e a leitura não inventa um.
    expect(semRef).toBeNull();
  });
});

describe("mintarRefDeCompartilhamento nunca rotaciona", () => {
  it("mintar de novo pro mesmo evento estoura por unicidade de event_id", async () => {
    await comEvento(app, dados.a.eventoId, (c) => mintarRefDeCompartilhamento(c, dados.a.eventoId));

    await expect(
      comEvento(app, dados.a.eventoId, (c) => mintarRefDeCompartilhamento(c, dados.a.eventoId)),
    ).rejects.toThrow();
  });
});

describe("eventoDoRef — só via comAgregacao, cruza evento por desenho", () => {
  it("resolve o event_id a partir do ref_token e audita a chamada", async () => {
    const { eventoId } = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: daquiA(-1),
      terminaEm: daquiA(6),
    });
    const { rows } = await admin.query<{ ref_token: string }>(
      "SELECT ref_token FROM event_share_refs WHERE event_id = $1",
      [eventoId],
    );
    const refToken = rows[0]!.ref_token;

    const auditar = vi.fn();
    const resolvido = await eventoDoRef(agregador, refToken, auditar);

    expect(resolvido).toBe(eventoId);
    expect(auditar).toHaveBeenCalledOnce();
    expect(auditar).toHaveBeenCalledWith(
      expect.objectContaining({ motivo: "reconciliacao_share_ref" }),
    );
  });

  it("ref_token desconhecido resolve null, sem estourar", async () => {
    const resolvido = await eventoDoRef(agregador, "token-que-nao-existe", vi.fn());
    expect(resolvido).toBeNull();
  });
});

describe("contarSharesDoEvento", () => {
  it("conta um `share` por foto, não deduplica", async () => {
    await comEvento(app, dados.a.eventoId, async (c) => {
      await registrarEventoDoFunil(c, { sessaoId: dados.a.sessaoId, name: "share" });
      await registrarEventoDoFunil(c, { sessaoId: dados.a.sessaoId, name: "share" });
      await registrarEventoDoFunil(c, { sessaoId: dados.a.sessaoId, name: "upload_ok" });
    });

    const total = await comEvento(app, dados.a.eventoId, (c) =>
      contarSharesDoEvento(c, dados.a.eventoId),
    );
    expect(total).toBe(2);
  });

  it("não conta share de outro evento", async () => {
    const totalDeB = await comEvento(app, dados.b.eventoId, (c) =>
      contarSharesDoEvento(c, dados.b.eventoId),
    );
    expect(totalDeB).toBe(0);
  });
});

describe("resumoAtribuicaoViral", () => {
  it("conta event_created por ref e resolve o evento de origem", async () => {
    // dois eventos semeados: A (origem) e B (qualquer)
    const refA = await comEvento(app, dados.a.eventoId, (c) => refDoEvento(c, dados.a.eventoId));
    expect(refA).not.toBeNull();

    // três criações atribuídas a A, uma sem atribuição, uma com ref desconhecido
    for (let i = 0; i < 3; i++) await recordProductEvent(admin, "event_created", { originRef: refA });
    await recordProductEvent(admin, "event_created");
    await recordProductEvent(admin, "event_created", { originRef: "x".repeat(24) });

    const auditoria: { motivo: string; em: Date }[] = [];
    const resumo = await resumoAtribuicaoViral(admin, (r) => auditoria.push(r));

    expect(resumo.eventosOriginados).toBe(3);
    expect(resumo.porOrigem).toEqual([{ eventoOrigemId: dados.a.eventoId, criados: 3 }]);
    expect(auditoria.length).toBeGreaterThan(0);
  });
});
