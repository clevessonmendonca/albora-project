import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { DriveTokenVault, SealedToken } from "@albora/core";

/**
 * Implementação concreta do vault (spec drive-export §2). AES-256-GCM porque
 * é autenticado: uma alteração no ciphertext (bit flip, truncamento) estoura
 * na abertura em vez de devolver lixo que passaria como refresh token válido
 * até o Google recusar.
 *
 * `keyVersion` permite rotação sem downtime: uma linha selada com a chave
 * antiga continua abrindo até o próximo refresh, que já resela com a chave
 * atual. Não é reencriptação em massa — é lazy, no caminho que já toca o
 * token.
 *
 * Nunca loga a chave, o plaintext, nem o ciphertext — só `keyVersion` em
 * mensagens de erro, que é seguro por design (não é segredo).
 */

const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12;
const TAMANHO_CHAVE = 32;

export type ChaveVersionada = { versao: number; chave: Buffer };

export class VaultDeTokenDrive implements DriveTokenVault {
  private readonly chaves: ReadonlyMap<number, Buffer>;

  constructor(
    private readonly chaveAtual: ChaveVersionada,
    chavesAntigas: readonly ChaveVersionada[] = [],
  ) {
    const todas = [chaveAtual, ...chavesAntigas];
    for (const c of todas) {
      if (c.chave.length !== TAMANHO_CHAVE) {
        throw new ErroChaveDoVaultInvalida(c.versao);
      }
    }
    this.chaves = new Map(todas.map((c) => [c.versao, c.chave]));
  }

  async seal(plaintext: string): Promise<SealedToken> {
    const iv = randomBytes(TAMANHO_IV);
    const cipher = createCipheriv(ALGORITMO, this.chaveAtual.chave, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      keyVersion: this.chaveAtual.versao,
    };
  }

  async open(sealed: SealedToken): Promise<string> {
    const chave = this.chaves.get(sealed.keyVersion);
    if (!chave) throw new ErroChaveDeVersaoDesconhecida(sealed.keyVersion);

    try {
      const decipher = createDecipheriv(ALGORITMO, chave, Buffer.from(sealed.iv, "base64"));
      decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(sealed.ciphertext, "base64")),
        decipher.final(),
      ]);
      return plaintext.toString("utf8");
    } catch (causa) {
      throw new ErroTokenNaoAbre(sealed.keyVersion, causa);
    }
  }
}

export class ErroChaveDoVaultInvalida extends Error {
  readonly code = "drive.vault_chave_invalida";
  constructor(readonly versao: number) {
    super(`chave da versão ${versao} não tem ${TAMANHO_CHAVE} bytes (AES-256)`);
  }
}

export class ErroChaveDeVersaoDesconhecida extends Error {
  readonly code = "drive.vault_versao_desconhecida";
  constructor(readonly versao: number) {
    super(`nenhuma chave disponível para key_version=${versao}`);
  }
}

export class ErroTokenNaoAbre extends Error {
  readonly code = "drive.vault_abrir_falhou";
  constructor(
    readonly versao: number,
    causa: unknown,
  ) {
    super(`token selado (versão ${versao}) não abriu — chave errada ou dado corrompido`, { cause: causa });
  }
}
