import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  conectarDrive,
  conexaoDrive,
  marcarDriveExpirado,
  refreshTokenDoEvento,
  revogarDrive,
} from "./drive-connections";
import { VaultDeTokenDrive } from "./drive-token-vault";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

const vault = new VaultDeTokenDrive({ versao: 1, chave: Buffer.alloc(32, 7) });

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

describe("conectarDrive / conexaoDrive", () => {
  it("grava a conexão e o refresh token nunca fica em claro na linha", async () => {
    const conexao = await conectarDrive(app, vault, {
      eventId: dados.a.eventoId,
      accountId: dados.a.contaId,
      driveFolderId: "folder-a",
      driveAccountEmail: "casal-a@exemplo.test",
      refreshToken: "1//refresh-token-do-casal-a",
    });

    expect(conexao.status).toBe("conectado");
    expect(conexao.driveFolderId).toBe("folder-a");

    const { rows } = await admin.query<{ refresh_ciphertext: Buffer }>(
      "SELECT refresh_ciphertext FROM drive_connections WHERE event_id = $1",
      [dados.a.eventoId],
    );
    expect(rows[0]!.refresh_ciphertext.toString("utf8")).not.toContain("refresh-token-do-casal-a");
  });

  it("reconectar substitui a linha (UPSERT), nunca acumula", async () => {
    await conectarDrive(app, vault, {
      eventId: dados.a.eventoId,
      accountId: dados.a.contaId,
      driveFolderId: "folder-original",
      driveAccountEmail: null,
      refreshToken: "token-original",
    });
    await conectarDrive(app, vault, {
      eventId: dados.a.eventoId,
      accountId: dados.a.contaId,
      driveFolderId: "folder-nova",
      driveAccountEmail: "novo@exemplo.test",
      refreshToken: "token-novo",
    });

    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM drive_connections WHERE event_id = $1",
      [dados.a.eventoId],
    );
    expect(rows[0]!.n).toBe(1);

    const conexao = await conexaoDrive(app, dados.a.eventoId);
    expect(conexao?.driveFolderId).toBe("folder-nova");
    expect(await refreshTokenDoEvento(app, vault, dados.a.eventoId)).toBe("token-novo");
  });

  it("evento sem conexão devolve null, nunca a de outro evento", async () => {
    expect(await conexaoDrive(app, dados.b.eventoId)).toBeNull();
  });
});

describe("refreshTokenDoEvento", () => {
  it("abre o refresh token selado — round-trip via o vault", async () => {
    await conectarDrive(app, vault, {
      eventId: dados.b.eventoId,
      accountId: dados.b.contaId,
      driveFolderId: "folder-b",
      driveAccountEmail: "casal-b@exemplo.test",
      refreshToken: "refresh-token-b-de-verdade",
    });

    expect(await refreshTokenDoEvento(app, vault, dados.b.eventoId)).toBe("refresh-token-b-de-verdade");
  });

  it("conexão expirada ou revogada não devolve token para uso", async () => {
    await conectarDrive(app, vault, {
      eventId: dados.b.eventoId,
      accountId: dados.b.contaId,
      driveFolderId: "folder-b",
      driveAccountEmail: null,
      refreshToken: "refresh-token-b",
    });
    await marcarDriveExpirado(app, dados.b.eventoId);
    expect(await refreshTokenDoEvento(app, vault, dados.b.eventoId)).toBeNull();

    const conexao = await conexaoDrive(app, dados.b.eventoId);
    expect(conexao?.status).toBe("expirado");
  });
});

describe("revogarDrive", () => {
  it("marca revogado e preserva revoked_at — histórico fica, token não serve mais", async () => {
    await conectarDrive(app, vault, {
      eventId: dados.a.eventoId,
      accountId: dados.a.contaId,
      driveFolderId: "folder-a",
      driveAccountEmail: null,
      refreshToken: "refresh-a",
    });
    await revogarDrive(app, dados.a.eventoId);

    const conexao = await conexaoDrive(app, dados.a.eventoId);
    expect(conexao?.status).toBe("revogado");
    expect(conexao?.revokedAt).not.toBeNull();
    expect(await refreshTokenDoEvento(app, vault, dados.a.eventoId)).toBeNull();
  });
});
