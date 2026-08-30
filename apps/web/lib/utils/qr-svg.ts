import QRCode from "qrcode";

/** Zona de silêncio do padrão QR — sem ela o leitor não acha o código encostado no fundo. */
const SILENCIO_MODULOS = 4;

export type QrSvg = {
  /** `viewBox` já com a zona de silêncio somada. */
  lado: number;
  /** Path único com todos os módulos escuros — um nó de DOM em vez de centenas de rects. */
  path: string;
};

/**
 * QR como path de SVG, gerado no servidor.
 *
 * Nível H de correção: é o mesmo das peças impressas, e é o que sobrevive a tela
 * suja, foto tremida e leitor barato — que é a condição real de quem escaneia.
 */
export function qrSvg(conteudo: string): QrSvg {
  const qr = QRCode.create(conteudo, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const dados = qr.modules.data;

  const partes: string[] = [];

  for (let linha = 0; linha < n; linha++) {
    let inicio = -1;

    // Fecha a corrida no índice n também, senão módulo escuro na borda direita fica de fora.
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

/**
 * Origem pública absoluta, ou `null` quando não dá para montar com certeza.
 *
 * `null` é resposta legítima e o chamador deve degradar para um link tocável: QR
 * apontando para o lugar errado é a falha mais cara da categoria — some depois de
 * impresso, e aqui minaria exatamente a promessa que ele existe para provar.
 */
export function origemPublica(): string | null {
  const host = (process.env.APP_ROOT_DOMAIN ?? "").trim().replace(/\/+$/, "");
  if (host === "") return null;

  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return `${local ? "http" : "https"}://${host}`;
}
