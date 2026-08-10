/**
 * A tag do Background Sync (N6.2).
 *
 * Mora num arquivo próprio porque tem dois donos que nunca se importam: a aba
 * registra, o Service Worker ouve. Duas cópias da string seriam uma drenagem
 * que nunca dispara, sem erro nenhum em lugar nenhum.
 */
export const TAG_DRENAGEM = "albora-drenar-fila";
