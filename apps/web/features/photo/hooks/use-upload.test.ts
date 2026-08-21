import { describe, expect, it } from "vitest";
import {
  mensagemCotaVideo,
  resolverAcaoFoco,
  type CotaVideo,
} from "./use-upload";

describe("resolverAcaoFoco — dreno ao retornar à aba/PWA", () => {
  it("drena quando a aba fica visível e há conexão", () => {
    expect(resolverAcaoFoco(true, true)).toBe("drenar");
  });

  it("apenas atualiza contagens quando visível mas offline", () => {
    expect(resolverAcaoFoco(true, false)).toBe("atualizar");
  });

  it("ignora quando a aba não está visível, independente da conexão", () => {
    expect(resolverAcaoFoco(false, true)).toBe("ignorar");
    expect(resolverAcaoFoco(false, false)).toBe("ignorar");
  });
});

describe("mensagemCotaVideo — avisos de cota de vídeo", () => {
  const cota = (limite: number | null, enviados: number): CotaVideo => ({
    limite,
    enviados,
  });

  it("sem limite não produz mensagem", () => {
    expect(mensagemCotaVideo(cota(null, 99))).toBeNull();
  });

  it("cota esgotada informa que fotos continuam", () => {
    const msg = mensagemCotaVideo(cota(1, 1));
    expect(msg).toMatch(/Você já usou seu vídeo/);
    expect(msg).toMatch(/Fotos continuam ilimitadas/);
  });

  it("plano com limite único avisa antes de chegar a zero", () => {
    const msg = mensagemCotaVideo(cota(1, 0));
    expect(msg).toMatch(/1 vídeo por convidado/);
  });

  it("plano com múltiplos vídeos informa o limite", () => {
    const msg = mensagemCotaVideo(cota(3, 0));
    expect(msg).toMatch(/3 vídeos/);
  });
});
