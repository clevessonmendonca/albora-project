import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ErroChaveDeVersaoDesconhecida,
  ErroChaveDoVaultInvalida,
  ErroTokenNaoAbre,
  VaultDeTokenDrive,
} from "./drive-token-vault";

const chave = (seed: number) => {
  const b = Buffer.alloc(32, 0);
  b.writeUInt32BE(seed, 0);
  return b;
};

describe("VaultDeTokenDrive", () => {
  it("seal → open faz round-trip do refresh token", async () => {
    const vault = new VaultDeTokenDrive({ versao: 1, chave: chave(1) });
    const plaintext = "1//09-refresh-token-de-verdade-do-google";

    const sealed = await vault.seal(plaintext);
    expect(sealed.keyVersion).toBe(1);
    expect(sealed.ciphertext).not.toContain(plaintext);

    const reaberto = await vault.open(sealed);
    expect(reaberto).toBe(plaintext);
  });

  it("nunca guarda o plaintext em nenhum campo do selo", async () => {
    const vault = new VaultDeTokenDrive({ versao: 1, chave: chave(1) });
    const plaintext = "segredo-nao-pode-vazar";
    const sealed = await vault.seal(plaintext);

    for (const campo of [sealed.ciphertext, sealed.iv, sealed.tag]) {
      expect(campo).not.toContain(plaintext);
    }
  });

  it("duas chamadas de seal para o mesmo plaintext produzem ciphertexts diferentes (IV aleatório)", async () => {
    const vault = new VaultDeTokenDrive({ versao: 1, chave: chave(1) });
    const a = await vault.seal("mesmo-texto");
    const b = await vault.seal("mesmo-texto");
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });

  it("abrir com a chave errada rejeita — GCM detecta e não devolve lixo como token válido", async () => {
    const vaultA = new VaultDeTokenDrive({ versao: 1, chave: chave(1) });
    const vaultB = new VaultDeTokenDrive({ versao: 1, chave: chave(2) });

    const sealed = await vaultA.seal("token-do-casal-a");
    await expect(vaultB.open(sealed)).rejects.toBeInstanceOf(ErroTokenNaoAbre);
  });

  it("tag adulterada (ciphertext truncado/alterado) rejeita, nunca devolve texto parcial", async () => {
    const vault = new VaultDeTokenDrive({ versao: 1, chave: chave(1) });
    const sealed = await vault.seal("token-intacto");
    const corrompido = { ...sealed, ciphertext: Buffer.from("lixo-nao-relacionado").toString("base64") };
    await expect(vault.open(corrompido)).rejects.toBeInstanceOf(ErroTokenNaoAbre);
  });

  it("key_version desconhecida é recusada antes de tentar decifrar", async () => {
    const vault = new VaultDeTokenDrive({ versao: 2, chave: chave(2) });
    const sealed = { ciphertext: "x", iv: "eA==", tag: "eA==", keyVersion: 99 };
    await expect(vault.open(sealed)).rejects.toBeInstanceOf(ErroChaveDeVersaoDesconhecida);
  });

  it("rotação: chave antiga continua abrindo linhas antigas, novas selam com a atual", async () => {
    const vaultV1 = new VaultDeTokenDrive({ versao: 1, chave: chave(1) });
    const seladoComV1 = await vaultV1.seal("refresh-token-antigo");

    const vaultV2 = new VaultDeTokenDrive({ versao: 2, chave: chave(2) }, [{ versao: 1, chave: chave(1) }]);

    // Linha antiga (key_version=1) ainda abre sob o vault que já rotacionou.
    expect(await vaultV2.open(seladoComV1)).toBe("refresh-token-antigo");

    // Selo novo já nasce na versão atual.
    const seladoComV2 = await vaultV2.seal("refresh-token-novo");
    expect(seladoComV2.keyVersion).toBe(2);
    expect(await vaultV2.open(seladoComV2)).toBe("refresh-token-novo");
  });

  it("construir com chave que não tem 32 bytes falha alto, nunca trunca/preenche silenciosamente", () => {
    expect(() => new VaultDeTokenDrive({ versao: 1, chave: Buffer.alloc(16) })).toThrow(
      ErroChaveDoVaultInvalida,
    );
  });

  it("construir com chave antiga inválida também falha alto — a validação cobre todo o conjunto", () => {
    expect(
      () =>
        new VaultDeTokenDrive({ versao: 2, chave: chave(2) }, [{ versao: 1, chave: Buffer.alloc(8) }]),
    ).toThrow(ErroChaveDoVaultInvalida);
  });

  it("round-trip com chave gerada de verdade (randomBytes), não só fixture determinístico", async () => {
    const vault = new VaultDeTokenDrive({ versao: 1, chave: randomBytes(32) });
    const plaintext = "1//refresh-token-aleatorio";
    const sealed = await vault.seal(plaintext);
    expect(await vault.open(sealed)).toBe(plaintext);
  });
});
