import { describe, expect, it, afterEach } from "vitest";
import QRCode from "qrcode";
import { origemPublica, qrSvg } from "./qr-svg";

describe("qrSvg", () => {
  it("mantém a zona de silêncio nos dois lados", () => {
    const conteudo = "https://albora.app/e/festa-demo?via=qr";
    const modulos = QRCode.create(conteudo, { errorCorrectionLevel: "H" }).modules.size;

    expect(qrSvg(conteudo).lado).toBe(modulos + 8);
  });

  it("produz path não vazio e dentro do viewBox", () => {
    const { lado, path } = qrSvg("https://albora.app/e/festa-demo?via=qr");

    expect(path.length).toBeGreaterThan(0);
    expect(path.startsWith("M")).toBe(true);

    // Nenhuma coordenada pode passar do lado — módulo fora do viewBox some no leitor.
    for (const [, x, y] of path.matchAll(/M(\d+) (\d+)/g)) {
      expect(Number(x)).toBeLessThan(lado);
      expect(Number(y)).toBeLessThan(lado);
    }
  });

  it("conteúdo diferente gera código diferente", () => {
    expect(qrSvg("https://albora.app/e/a?via=qr").path).not.toBe(
      qrSvg("https://albora.app/e/b?via=qr").path,
    );
  });
});

describe("origemPublica", () => {
  const original = process.env.APP_ROOT_DOMAIN;
  afterEach(() => {
    if (original === undefined) delete process.env.APP_ROOT_DOMAIN;
    else process.env.APP_ROOT_DOMAIN = original;
  });

  it("sem domínio configurado devolve null em vez de chutar", () => {
    // Chutar aqui produziria um QR que leva ao lugar errado — a falha mais cara
    // da categoria, e justamente a que este QR existe para desmentir.
    process.env.APP_ROOT_DOMAIN = "";
    expect(origemPublica()).toBeNull();

    delete process.env.APP_ROOT_DOMAIN;
    expect(origemPublica()).toBeNull();
  });

  it("localhost sai em http; domínio real sai em https", () => {
    process.env.APP_ROOT_DOMAIN = "localhost:3000";
    expect(origemPublica()).toBe("http://localhost:3000");

    process.env.APP_ROOT_DOMAIN = "albora.app";
    expect(origemPublica()).toBe("https://albora.app");
  });

  it("ignora barra sobrando no fim", () => {
    process.env.APP_ROOT_DOMAIN = "albora.app/";
    expect(origemPublica()).toBe("https://albora.app");
  });
});
