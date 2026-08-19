import { describe, expect, it, vi } from "vitest";
import { ErroDriveApi, type DriveClient } from "./drive-client";
import { driveFolderUrl, executarExportDrive } from "./drive-export";

function itens(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `item-${i}`,
    chave: `events/e/2026/08/foto/${i}`,
    mime: "image/jpeg",
    bytes: 1000,
  }));
}

function driveClientFake(overrides: Partial<DriveClient> = {}): DriveClient {
  return {
    exchangeCode: vi.fn(),
    refreshAccessToken: vi.fn(),
    createFolder: vi.fn(),
    getAbout: vi.fn(),
    revoke: vi.fn(),
    uploadFile: vi.fn(async (_at, _folder, _nome, _mime, _bytes) => ({ fileId: "file-x" })),
    ...overrides,
  };
}

describe("executarExportDrive", () => {
  it("sobe todos os itens em série e fecha 'pronto'", async () => {
    const marcados: [string, string][] = [];
    const client = driveClientFake();
    const r = await executarExportDrive(
      { itens: itens(3), driveFolderId: "folder-1" },
      client,
      "at",
      async () => new Uint8Array([1, 2, 3]),
      async (itemId, fileId) => void marcados.push([itemId, fileId]),
    );

    expect(r).toEqual({ estado: "pronto", enviadas: 3, total: 3, quotaEsgotada: false });
    expect(client.uploadFile).toHaveBeenCalledTimes(3);
    expect(marcados).toHaveLength(3);
  });

  it("nunca sobe em paralelo — uma chamada de upload por vez, em ordem", async () => {
    const ordem: number[] = [];
    const client = driveClientFake({
      uploadFile: vi.fn(async (_at, _f, nome) => {
        ordem.push(Number(nome.match(/\d+/)?.[0]));
        return { fileId: "x" };
      }),
    });

    await executarExportDrive(
      { itens: itens(5), driveFolderId: "f" },
      client,
      "at",
      async () => new Uint8Array([1]),
      async () => {},
    );

    expect(ordem).toEqual([0, 1, 2, 3, 4]);
  });

  it("item já com uploadedAt não é reenviado — retomada não reenvia bytes já aceitos", async () => {
    const jaEnviado = { ...itens(1)[0]!, uploadedAt: "2026-01-01T00:00:00Z", driveFileId: "ja-existe" };
    const client = driveClientFake();

    const r = await executarExportDrive(
      { itens: [jaEnviado, ...itens(2)], driveFolderId: "f" },
      client,
      "at",
      async () => new Uint8Array([1]),
      async () => {},
    );

    expect(client.uploadFile).toHaveBeenCalledTimes(2);
    expect(r).toEqual({ estado: "pronto", enviadas: 3, total: 3, quotaEsgotada: false });
  });

  it("item ilegível (leitura falha) não trava o laço — segue para o próximo, fecha 'parcial'", async () => {
    const client = driveClientFake();
    let chamada = 0;
    const r = await executarExportDrive(
      { itens: itens(3), driveFolderId: "f" },
      client,
      "at",
      async () => {
        chamada += 1;
        if (chamada === 2) return null;
        return new Uint8Array([1]);
      },
      async () => {},
    );

    expect(r.estado).toBe("parcial");
    expect(r.enviadas).toBe(2);
    expect(r.total).toBe(3);
  });

  it("quota esgotada no meio do lote para de enfileirar e preserva o progresso já feito", async () => {
    const marcados: string[] = [];
    let chamada = 0;
    const client = driveClientFake({
      uploadFile: vi.fn(async () => {
        chamada += 1;
        if (chamada === 2) throw new ErroDriveApi("storageQuotaExceeded", 403);
        return { fileId: `f-${chamada}` };
      }),
    });

    const r = await executarExportDrive(
      { itens: itens(5), driveFolderId: "f" },
      client,
      "at",
      async () => new Uint8Array([1]),
      async (itemId, fileId) => void marcados.push(`${itemId}:${fileId}`),
    );

    expect(r).toEqual({ estado: "parcial", enviadas: 1, total: 5, quotaEsgotada: true });
    expect(marcados).toHaveLength(1);
    // Não tenta mais nada depois do 403 de quota — nem os itens 3, 4, 5.
    expect(client.uploadFile).toHaveBeenCalledTimes(2);
  });

  it("erro do Drive que não é quota segue para o próximo item, sem parar o lote", async () => {
    const client = driveClientFake({
      uploadFile: vi.fn(async (_at, _f, nome) => {
        if (nome.includes("item-1")) throw new ErroDriveApi("insufficientPermissions", 403);
        return { fileId: "ok" };
      }),
    });

    const r = await executarExportDrive(
      { itens: itens(3), driveFolderId: "f" },
      client,
      "at",
      async () => new Uint8Array([1]),
      async () => {},
    );

    expect(r).toEqual({ estado: "parcial", enviadas: 2, total: 3, quotaEsgotada: false });
  });

  it("sem drive_folder_id estoura — nunca sobe pra pasta nenhuma", async () => {
    const client = driveClientFake();
    await expect(
      executarExportDrive({ itens: itens(1), driveFolderId: null }, client, "at", async () => new Uint8Array([1]), async () => {}),
    ).rejects.toThrow();
  });

  it("acervo vazio fecha 'pronto' com zero enviadas", async () => {
    const client = driveClientFake();
    const r = await executarExportDrive(
      { itens: [], driveFolderId: "f" },
      client,
      "at",
      async () => new Uint8Array([1]),
      async () => {},
    );
    expect(r).toEqual({ estado: "pronto", enviadas: 0, total: 0, quotaEsgotada: false });
  });
});

describe("driveFolderUrl", () => {
  it("monta o link público da pasta", () => {
    expect(driveFolderUrl("abc123")).toBe("https://drive.google.com/drive/folders/abc123");
  });
});
