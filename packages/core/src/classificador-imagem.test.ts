import { describe, expect, it } from "vitest";
import {
  classificarImagem,
  provedorDeImagemDoAmbiente,
  provedorHeuristico,
  type ProvedorDeClassificadorDeImagem,
} from "./classificador-imagem";

function jpegMinimo(): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  return bytes;
}

describe("provedorHeuristico", () => {
  it("JPEG reconhecido fica limpo", async () => {
    await expect(provedorHeuristico.classificar({ bytes: jpegMinimo(), mime: "image/jpeg" })).resolves.toBe(
      "limpo",
    );
  });

  it("bytes ilegíveis são silêncio, não limpeza", async () => {
    await expect(
      provedorHeuristico.classificar({ bytes: new Uint8Array(32), mime: "image/jpeg" }),
    ).resolves.toBe("sem-resposta");
  });

  it("thumb vazia é silêncio", async () => {
    await expect(
      provedorHeuristico.classificar({ bytes: new Uint8Array(4), mime: "image/jpeg" }),
    ).resolves.toBe("sem-resposta");
  });
});

describe("classificarImagem falha fechado", () => {
  it("provedor que joga vira sem-resposta", async () => {
    const falha: ProvedorDeClassificadorDeImagem = {
      async classificar() {
        throw new Error("rede");
      },
    };
    await expect(classificarImagem({ bytes: jpegMinimo(), mime: "image/jpeg" }, falha)).resolves.toBe(
      "sem-resposta",
    );
  });

  it("provedor que não responde a tempo vira sem-resposta", async () => {
    const mudo: ProvedorDeClassificadorDeImagem = {
      classificar: () => new Promise(() => {}),
    };
    await expect(
      classificarImagem({ bytes: jpegMinimo(), mime: "image/jpeg" }, mudo, 20),
    ).resolves.toBe("sem-resposta");
  });
});

describe("provedorDeImagemDoAmbiente", () => {
  it("sem env usa o heurístico — caminho de produção explícito", async () => {
    const provedor = provedorDeImagemDoAmbiente({});
    await expect(provedor.classificar({ bytes: jpegMinimo(), mime: "image/jpeg" })).resolves.toBe("limpo");
  });

  it("silencio sempre segura", async () => {
    const provedor = provedorDeImagemDoAmbiente({ CLASSIFICADOR_IMAGEM_PROVEDOR: "silencio" });
    await expect(provedor.classificar({ bytes: jpegMinimo(), mime: "image/jpeg" })).resolves.toBe(
      "sem-resposta",
    );
  });

  it("stub só entra com env, e o gate cobre o erro", async () => {
    const suspeito = provedorDeImagemDoAmbiente({
      CLASSIFICADOR_IMAGEM_PROVEDOR: "stub",
      CLASSIFICADOR_IMAGEM_STUB: "suspeito",
    });
    await expect(suspeito.classificar({ bytes: jpegMinimo(), mime: "image/jpeg" })).resolves.toBe(
      "suspeito",
    );

    const erro = provedorDeImagemDoAmbiente({
      CLASSIFICADOR_IMAGEM_PROVEDOR: "stub",
      CLASSIFICADOR_IMAGEM_STUB: "erro",
    });
    await expect(classificarImagem({ bytes: jpegMinimo(), mime: "image/jpeg" }, erro)).resolves.toBe(
      "sem-resposta",
    );
  });
});
