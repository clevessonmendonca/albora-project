/**
 * Aspecto a partir do par persistido no confirm.
 *
 * Sem par, a tela decide o fallback (4:5 no feed; o telão mede no cliente).
 * Inventar 1080×1920 aqui faria vídeo deitado parecer em pé.
 */
export function persistedSize(
  largura: number | undefined,
  altura: number | undefined,
): { largura: number; altura: number } | null {
  if (typeof largura !== "number" || typeof altura !== "number") return null;
  if (!Number.isFinite(largura) || !Number.isFinite(altura) || largura < 1 || altura < 1) {
    return null;
  }
  return { largura, altura };
}

export function cssAspectRatio(
  largura: number | undefined,
  altura: number | undefined,
): string | undefined {
  const size = persistedSize(largura, altura);
  return size ? `${size.largura} / ${size.altura}` : undefined;
}
