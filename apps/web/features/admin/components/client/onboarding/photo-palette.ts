/** Paleta extraída da capa (design-system-v3 §2) — canvas no cliente, determinístico e offline.
 *  Espelha `paletteFromPhoto` do protótipo: reamostra a foto pequena, agrupa por bucket de cor,
 *  descarta quase-preto/quase-branco e cinzas, e devolve até 5 dominantes bem separadas, cada uma
 *  escurecida 18% para virar cor de destaque legível. Falha fechado: erro de CORS ou de canvas
 *  devolve `[]`, e o chamador fica nas sugestões. Nunca sobe nada — roda só no navegador. */
export function paletteFromImage(src: string): Promise<string[]> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve([]);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const n = 40;
        const canvas = document.createElement("canvas");
        canvas.width = n;
        canvas.height = n;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve([]);
        ctx.drawImage(img, 0, 0, n, n);
        const data = ctx.getImageData(0, 0, n, n).data;

        const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]!;
          const g = data[i + 1]!;
          const b = data[i + 2]!;
          const mx = Math.max(r, g, b);
          const mn = Math.min(r, g, b);
          if (mx < 40 || mn > 225) continue; // quase-preto / quase-branco não é cor de marca
          if (mx - mn < 18) continue; // cinza: sem temperatura
          const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
          const acc = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
          acc.n += 1;
          acc.r += r;
          acc.g += g;
          acc.b += b;
          buckets.set(key, acc);
        }

        const ordenados = [...buckets.values()]
          .map((o) => ({ n: o.n, c: [o.r / o.n, o.g / o.n, o.b / o.n] as [number, number, number] }))
          .sort((a, b) => b.n - a.n);

        const saida: string[] = [];
        const usados: [number, number, number][] = [];
        for (const { c } of ordenados) {
          if (saida.length >= 5) break;
          const perto = usados.some(
            (u) => Math.abs(u[0] - c[0]) + Math.abs(u[1] - c[1]) + Math.abs(u[2] - c[2]) < 70,
          );
          if (perto) continue;
          saida.push(escurecer(c, 0.18));
          usados.push(c);
        }
        resolve(saida);
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = src;
  });
}

function escurecer([r, g, b]: [number, number, number], t: number): string {
  const canal = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * (1 - t))))
      .toString(16)
      .toUpperCase()
      .padStart(2, "0");
  return `#${canal(r)}${canal(g)}${canal(b)}`;
}
