/** Rasteriza o SVG do QR (fundo transparente) em PNG, no cliente, sem dependência extra. */
export async function svgToPngBlob(svgString: string, size = 1024): Promise<Blob> {
  const svgUrl = URL.createObjectURL(new Blob([svgString], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await loadSvgImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Este navegador não suporta exportar PNG.");
    ctx.drawImage(img, 0, 0, size, size);
    return await canvasToPngBlob(canvas);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function loadSvgImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não carregou o QR para exportar."));
    img.src = src;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não gerou o PNG."));
    }, "image/png");
  });
}
