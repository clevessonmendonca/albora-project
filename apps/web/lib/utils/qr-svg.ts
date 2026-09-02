import QRCode from "qrcode";

const SILENCIO_MODULOS = 4;

export type QrSvg = {
  lado: number;
  path: string;
};

export function qrSvg(conteudo: string): QrSvg {
  const qr = QRCode.create(conteudo, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const dados = qr.modules.data;

  const partes: string[] = [];

  for (let linha = 0; linha < n; linha++) {
    let inicio = -1;

    for (let coluna = 0; coluna <= n; coluna++) {
      const escuro = coluna < n && dados[linha * n + coluna] === 1;

      if (escuro && inicio === -1) inicio = coluna;

      if (!escuro && inicio !== -1) {
        const x = inicio + SILENCIO_MODULOS;
        const y = linha + SILENCIO_MODULOS;
        partes.push(`M${x} ${y}h${coluna - inicio}v1h-${coluna - inicio}z`);
        inicio = -1;
      }
    }
  }

  return { lado: n + SILENCIO_MODULOS * 2, path: partes.join("") };
}

export function origemPublica(): string | null {
  const host = (process.env.APP_ROOT_DOMAIN ?? "").trim().replace(/\/+$/, "");
  if (host === "") return null;

  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return `${local ? "http" : "https"}://${host}`;
}
