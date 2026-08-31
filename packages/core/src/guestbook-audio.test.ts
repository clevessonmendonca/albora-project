import { describe, expect, it } from "vitest";
import { TETO_AUDIO_SEGUNDOS } from "./guestbook";
import {
  ACEITE_AUDIO_VERSAO,
  duracaoParaEnvio,
  normalizarMimeAudio,
  TETO_BYTES_AUDIO_RECADO,
  validarAceiteAudio,
  validarConteudoAudio,
  validarDeclaracaoAudio,
} from "./guestbook-audio";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

const WEBM = bytes(0x1a, 0x45, 0xdf, 0xa3);
const OGG = bytes(0x4f, 0x67, 0x67, 0x53);
const MP3 = bytes(0x49, 0x44, 0x33);
const M4A = bytes(0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20);
const WAV = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x00, 0x00, 0x00, 0x00,
]);
const HTML = new Uint8Array([...Buffer.from("<!DOCTYPE html><script>")]);

describe("o portão recusa o que estoura o teto antes de assinar", () => {
  it("aceita webm curto de 20 s", () => {
    expect(validarDeclaracaoAudio("audio/webm", 80_000, 20)).toBeNull();
  });

  it("recusa wav e html pelo tipo", () => {
    expect(validarDeclaracaoAudio("audio/wav", 1000, 10)?.code).toBe("recado.audio_tipo_recusado");
    expect(validarDeclaracaoAudio("text/html", 1000, 10)?.code).toBe("recado.audio_tipo_recusado");
  });

  it("recusa byte a byte acima do teto — upload sem limite para aqui", () => {
    expect(validarDeclaracaoAudio("audio/webm", TETO_BYTES_AUDIO_RECADO + 1, 20)?.code).toBe(
      "recado.audio_grande_demais",
    );
    expect(validarDeclaracaoAudio("audio/webm", 0, 20)?.code).toBe("recado.audio_grande_demais");
  });

  it("recusa duração fora do teto da spec 019", () => {
    expect(validarDeclaracaoAudio("audio/webm", 1000, 0)?.code).toBe("recado.audio_vazio");
    expect(validarDeclaracaoAudio("audio/webm", 1000, TETO_AUDIO_SEGUNDOS + 1)?.code).toBe(
      "recado.audio_longo_demais",
    );
  });
});

describe("magic bytes — o Content-Type do cliente não vale nada", () => {
  it("reconhece os quatro contêineres da lista", () => {
    expect(validarConteudoAudio("audio/webm", WEBM)).toBeNull();
    expect(validarConteudoAudio("audio/ogg", OGG)).toBeNull();
    expect(validarConteudoAudio("audio/mpeg", MP3)).toBeNull();
    expect(validarConteudoAudio("audio/mp4", M4A)).toBeNull();
  });

  it("recusa HTML declarado como webm", () => {
    expect(validarConteudoAudio("audio/webm", HTML)?.code).toBe("recado.audio_conteudo_nao_confere");
  });

  it("recusa WAV mesmo declarado como webm — é o arquivo sem compressão", () => {
    expect(validarConteudoAudio("audio/webm", WAV)?.code).toBe("recado.audio_conteudo_nao_confere");
  });
});

describe("mime do gravador chega com codec", () => {
  it("audio/webm;codecs=opus vira audio/webm", () => {
    expect(normalizarMimeAudio("audio/webm;codecs=opus")).toBe("audio/webm");
  });

  it("m4a e aac do Safari viram audio/mp4", () => {
    expect(normalizarMimeAudio("audio/x-m4a")).toBe("audio/mp4");
    expect(normalizarMimeAudio("audio/aac")).toBe("audio/mp4");
  });
});

describe("duração enviada é inteiro dentro do teto", () => {
  it("meio segundo vira 1; um segundo além do teto não passa", () => {
    expect(duracaoParaEnvio(0.4)).toBe(1);
    expect(duracaoParaEnvio(20.4)).toBe(20);
    expect(duracaoParaEnvio(TETO_AUDIO_SEGUNDOS + 0.4)).toBe(TETO_AUDIO_SEGUNDOS);
    expect(duracaoParaEnvio(TETO_AUDIO_SEGUNDOS + 1.4)).toBeNull();
    expect(duracaoParaEnvio(0)).toBeNull();
  });
});

describe("o aceite é versionado", () => {
  it("só a versão corrente passa", () => {
    expect(validarAceiteAudio(ACEITE_AUDIO_VERSAO)).toBeNull();
    expect(validarAceiteAudio("v0")?.code).toBe("recado.audio_aceite_ausente");
    expect(validarAceiteAudio(true)?.code).toBe("recado.audio_aceite_ausente");
  });
});
