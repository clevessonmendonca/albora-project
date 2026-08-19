/**
 * O refresh token do Drive do casal nunca vive em texto puro (CLAUDE.md §5,
 * spec drive-export §2). Esta é só a interface — sem I/O concreto, sem
 * `node:crypto`, porque `@albora/core` é a camada que roda sem rede e sem
 * segredo de runtime. A implementação (AES-256-GCM, chave de
 * `DRIVE_TOKEN_ENC_KEY`) mora em `@albora/db`, ao lado de `token.ts`, que já
 * é onde este pacote guarda o que depende de segredo.
 */

export type SealedToken = {
  /** base64 */
  ciphertext: string;
  /** base64, 12 bytes decodificados (GCM) */
  iv: string;
  /** base64, 16 bytes decodificados (tag de autenticação GCM) */
  tag: string;
  /** Permite rotação sem re-selar tudo de uma vez — lazy, no próximo refresh. */
  keyVersion: number;
};

export interface DriveTokenVault {
  seal(plaintext: string): Promise<SealedToken>;
  open(sealed: SealedToken): Promise<string>;
}
