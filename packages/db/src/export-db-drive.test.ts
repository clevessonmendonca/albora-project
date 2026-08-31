import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  criarJobExportDrive,
  finalizarExportDrive,
  jobExportPorId,
  marcarItemDriveEnviado,
} from "./export-db";
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

describe("criarJobExportDrive", () => {
  it("nasce enviando, destino drive, mode full, e published_snapshot = fotos", async () => {
    const job = await criarJobExportDrive(app, dados.a.contaId, dados.a.eventoId, "folder-x");
    expect(job).not.toBeNull();
    expect(job?.estado).toBe("enviando");
    expect(job?.modo).toBe("full");
    expect(job?.destino).toBe("drive");
    expect(job?.driveFolderId).toBe("folder-x");
    expect(job?.publishedSnapshot).toBe(job?.fotos);
    expect(job?.bytesTotal).toBeGreaterThan(0);
    expect(job?.bytesEnviados).toBe(0);
  });

  it("acervo vazio nasce 'vazio', não 'enviando'", async () => {
    // evento B tem 1 foto publicada no seed; removê-la temporariamente.
    await admin.query("UPDATE uploads SET state = 'removed' WHERE id = $1", [dados.b.uploadId]);
    try {
      const job = await criarJobExportDrive(app, dados.b.contaId, dados.b.eventoId, "folder-y");
      expect(job?.estado).toBe("vazio");
      expect(job?.fotos).toBe(0);
    } finally {
      await admin.query("UPDATE uploads SET state = 'published' WHERE id = $1", [dados.b.uploadId]);
    }
  });

  it("conta de A não cria job de Drive no evento de B", async () => {
    const job = await criarJobExportDrive(app, dados.a.contaId, dados.b.eventoId, "folder-z");
    expect(job).toBeNull();
  });
});

describe("marcarItemDriveEnviado / finalizarExportDrive", () => {
  it("marca o item, soma bytes_uploaded, e idempotente contra retomada", async () => {
    const job = await criarJobExportDrive(app, dados.a.contaId, dados.a.eventoId, "folder-progresso");
    const item = job!.itens[0]!;

    await marcarItemDriveEnviado(app, dados.a.eventoId, job!.id, item.id, "drive-file-1");
    let atual = await jobExportPorId(app, dados.a.contaId, dados.a.eventoId, job!.id);
    expect(atual?.itens[0]?.driveFileId).toBe("drive-file-1");
    expect(atual?.bytesEnviados).toBe(item.bytes);

    // Retomada: marcar de novo o mesmo item não soma bytes duas vezes.
    await marcarItemDriveEnviado(app, dados.a.eventoId, job!.id, item.id, "drive-file-1-repeticao");
    atual = await jobExportPorId(app, dados.a.contaId, dados.a.eventoId, job!.id);
    expect(atual?.bytesEnviados).toBe(item.bytes);
    expect(atual?.itens[0]?.driveFileId).toBe("drive-file-1"); // não sobrescreve

    await finalizarExportDrive(app, dados.a.eventoId, job!.id, "pronto");
    atual = await jobExportPorId(app, dados.a.contaId, dados.a.eventoId, job!.id);
    expect(atual?.estado).toBe("pronto");
    expect(atual?.prontoEm).not.toBeNull();
  });

  it("job que fica sem itens pendentes por falha de quota fecha como 'parcial'", async () => {
    const job = await criarJobExportDrive(app, dados.a.contaId, dados.a.eventoId, "folder-parcial");
    await finalizarExportDrive(app, dados.a.eventoId, job!.id, "parcial");
    const atual = await jobExportPorId(app, dados.a.contaId, dados.a.eventoId, job!.id);
    expect(atual?.estado).toBe("parcial");
  });
});
