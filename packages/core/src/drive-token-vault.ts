/** Interface sem I/O; implementação (AES-256-GCM) fica em @albora/db ao lado de token.ts. */
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
