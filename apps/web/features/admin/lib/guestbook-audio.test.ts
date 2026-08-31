import { describe, expect, it } from "vitest";
import { audioDoArquivo, audioDoBlob } from "./guestbook-audio";

describe("anexo e gravacao so entram se o core aceitar", () => {
  it("arquivo webm de 20 s vira pendente", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "recado.webm", { type: "audio/webm" });
    const pendente = audioDoArquivo(file, 20);
    expect(pendente?.mime).toBe("audio/webm");
    expect(pendente?.duracaoSegundos).toBe(20);
    if (pendente) URL.revokeObjectURL(pendente.previewUrl);
  });

  it("wav e duracao longa nao viram pendente", () => {
    const wav = new File([new Uint8Array([1])], "recado.wav", { type: "audio/wav" });
    expect(audioDoArquivo(wav, 20)).toBeNull();
    const webm = new File([new Uint8Array([1])], "recado.webm", { type: "audio/webm" });
    expect(audioDoArquivo(webm, 62)).toBeNull();
  });

  it("blob do gravador com codec no mime entra", () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm;codecs=opus" });
    const pendente = audioDoBlob(blob, "audio/webm;codecs=opus", 12.4);
    expect(pendente?.mime).toBe("audio/webm");
    expect(pendente?.duracaoSegundos).toBe(12);
    if (pendente) URL.revokeObjectURL(pendente.previewUrl);
  });
});
