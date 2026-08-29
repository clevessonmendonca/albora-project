/**
 * Contract Tests: Guestbook Audio Schemas → Guestbook Audio Use Cases
 */

import { describe, it, expect } from "vitest";
import { presignGuestbookAudioSchema, confirmGuestbookAudioSchema } from "./guestbook-audio-schemas";

describe("Guestbook Audio Schemas Contracts", () => {
  describe("presignGuestbookAudioSchema", () => {
    it("deve validar mime, bytes e duração", () => {
      const input = { mime: "audio/webm", bytes: 500000, duracaoSegundos: 60 };
      const validated = presignGuestbookAudioSchema.parse(input);
      expect(validated.mime).toBe("audio/webm");
      expect(validated.bytes).toBe(500000);
      expect(validated.duracaoSegundos).toBe(60);
    });

    it("deve rejeitar bytes zero", () => {
      const input = { mime: "audio/webm", bytes: 0, duracaoSegundos: 60 };
      expect(() => presignGuestbookAudioSchema.parse(input)).toThrow(/Tamanho inválido/i);
    });

    it("deve rejeitar duração zero", () => {
      const input = { mime: "audio/webm", bytes: 500000, duracaoSegundos: 0 };
      expect(() => presignGuestbookAudioSchema.parse(input)).toThrow(/Duração inválida/i);
    });
  });

  describe("confirmGuestbookAudioSchema", () => {
    it("deve validar com aceite true", () => {
      const input = {
        chave: "events/evt_123/audio.webm",
        mime: "audio/webm",
        duracaoSegundos: 60,
        aceite: true,
      };
      const validated = confirmGuestbookAudioSchema.parse(input);
      expect(validated.aceite).toBe(true);
    });

    it("deve rejeitar aceite false", () => {
      const input = {
        chave: "events/evt_123/audio.webm",
        mime: "audio/webm",
        duracaoSegundos: 60,
        aceite: false,
      };
      expect(() => confirmGuestbookAudioSchema.parse(input)).toThrow(/Confirme que a gravação é da sua voz/i);
    });

    it("deve rejeitar sem aceite", () => {
      const input = {
        chave: "events/evt_123/audio.webm",
        mime: "audio/webm",
        duracaoSegundos: 60,
      };
      expect(() => confirmGuestbookAudioSchema.parse(input)).toThrow();
    });
  });
});
