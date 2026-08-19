import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ErroSemAcessoAoFornecedor,
  eventosDoFornecedor,
  roleForAccountOnVendor,
} from "./vendor-portal";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let app: pg.Pool;
let agregador: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

let vendorXId: string;
let vendorYId: string;
let adminAccountId: string;
let staffAccountId: string;
let outsiderAccountId: string;
let eventoXId: string;
let eventoYId: string;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  agregador = pools.agregador;
  dados = await semear(admin);

  const conta = async (email: string) => {
    const { rows } = await admin.query<{ id: string }>(
      "INSERT INTO accounts (email) VALUES ($1) RETURNING id",
      [email],
    );
    return rows[0]!.id;
  };
  adminAccountId = await conta("fornecedor-admin@exemplo.test");
  staffAccountId = await conta("fornecedor-staff@exemplo.test");
  outsiderAccountId = await conta("fora-do-fornecedor@exemplo.test");

  const vendor = async (name: string) => {
    const { rows } = await admin.query<{ id: string }>(
      "INSERT INTO vendors (name) VALUES ($1) RETURNING id",
      [name],
    );
    return rows[0]!.id;
  };
  vendorXId = await vendor("Buffet X");
  vendorYId = await vendor("Buffet Y");

  await admin.query(
    `INSERT INTO vendor_members (vendor_id, account_id, role) VALUES
       ($1, $2, 'admin'),
       ($1, $3, 'staff')`,
    [vendorXId, adminAccountId, staffAccountId],
  );

  const evento = async (slug: string, vendorId: string, accountId: string) => {
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO events (account_id, vendor_id, pack_id, slug, starts_at, ends_at)
       VALUES ($1, $2, 'pack-um', $3, now(), now() + interval '4 hours')
       RETURNING id`,
      [accountId, vendorId, slug],
    );
    return rows[0]!.id;
  };
  eventoXId = await evento("evento-do-vendor-x", vendorXId, dados.a.contaId);
  eventoYId = await evento("evento-do-vendor-y", vendorYId, dados.b.contaId);
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end(), agregador?.end()]);
});

describe("roleForAccountOnVendor", () => {
  it("admin do fornecedor", async () => {
    expect(await roleForAccountOnVendor(app, adminAccountId, vendorXId)).toBe("admin");
  });

  it("staff do fornecedor", async () => {
    expect(await roleForAccountOnVendor(app, staffAccountId, vendorXId)).toBe("staff");
  });

  it("conta sem vínculo devolve null", async () => {
    expect(await roleForAccountOnVendor(app, outsiderAccountId, vendorXId)).toBeNull();
  });

  it("membro de um fornecedor não é membro do outro", async () => {
    expect(await roleForAccountOnVendor(app, adminAccountId, vendorYId)).toBeNull();
  });
});

describe("eventosDoFornecedor — duas portas, nunca uma", () => {
  it("membro (admin) vê só os eventos do próprio vendor_id", async () => {
    const registros: { motivo: string; em: Date }[] = [];
    const eventos = await eventosDoFornecedor(app, agregador, adminAccountId, vendorXId, (r) =>
      registros.push(r),
    );

    expect(eventos.map((e) => e.id)).toEqual([eventoXId]);
    expect(eventos.some((e) => e.id === eventoYId)).toBe(false);
    expect(registros).toHaveLength(1);
    expect(registros[0]?.motivo).toBe(`vendor_dashboard:${vendorXId}`);
  });

  it("membro (staff) também passa a primeira porta", async () => {
    const eventos = await eventosDoFornecedor(app, agregador, staffAccountId, vendorXId, () => {});
    expect(eventos.map((e) => e.id)).toEqual([eventoXId]);
  });

  it("conta sem vínculo é recusada ANTES de qualquer agregação — nada é auditado", async () => {
    const registros: { motivo: string; em: Date }[] = [];
    await expect(
      eventosDoFornecedor(app, agregador, outsiderAccountId, vendorXId, (r) => registros.push(r)),
    ).rejects.toBeInstanceOf(ErroSemAcessoAoFornecedor);
    expect(registros).toHaveLength(0);
  });

  it("membro de X pedindo o vendorId de Y é recusado na primeira porta", async () => {
    const registros: { motivo: string; em: Date }[] = [];
    await expect(
      eventosDoFornecedor(app, agregador, adminAccountId, vendorYId, (r) => registros.push(r)),
    ).rejects.toBeInstanceOf(ErroSemAcessoAoFornecedor);
    expect(registros).toHaveLength(0);
  });

  it("vendorId que não é uuid é recusado antes de tocar o banco", async () => {
    await expect(
      eventosDoFornecedor(app, agregador, adminAccountId, "nao-e-um-uuid", () => {}),
    ).rejects.toBeInstanceOf(ErroSemAcessoAoFornecedor);
  });

  it("o resumo do evento carrega os campos do painel, sem vazar dado de outro fornecedor", async () => {
    const [resumo] = await eventosDoFornecedor(app, agregador, adminAccountId, vendorXId, () => {});
    expect(resumo).toMatchObject({
      id: eventoXId,
      slug: "evento-do-vendor-x",
      packId: "pack-um",
      isDemo: false,
    });
  });
});
