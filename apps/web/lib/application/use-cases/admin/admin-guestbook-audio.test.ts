/**
 * Testes: Admin Guestbook Audio Use Cases
 * 
 * Cobertura:
 * - presignGuestbookAudioUpload: gera presigned URL para áudio
 * - confirmGuestbookAudioUpload: confirma e valida áudio
 * - deleteGuestbookAudio: remove áudio do guestbook
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { presignGuestbookAudioUpload } from "./presign-guestbook-audio";
import { confirmGuestbookAudioUpload } from "./confirm-guestbook-audio";
import { deleteGuestbookAudio } from "./delete-guestbook-audio";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const {
  mockDurationForUpload,
  mockNormalizeGuestbookAudioMime,
  mockValidateGuestbookAudioDeclaration,
  mockValidateGuestbookAudioConsent,
  mockValidateGuestbookAudioContent,
  mockIsGuestbookAudioKey,
  mockDeriveGuestbookAudioKey,
  mockAssinarPut,
  mockInspecionarObjeto,
  mockWithEvent,
  mockEventGuestbook,
  mockUpdateGuestbookAudio,
  mockSignGuestbookAudio,
  VALIDADE_PRESIGN_SEGUNDOS,
} = vi.hoisted(() => ({
  mockDurationForUpload: vi.fn(),
  mockNormalizeGuestbookAudioMime: vi.fn(),
  mockValidateGuestbookAudioDeclaration: vi.fn(),
  mockValidateGuestbookAudioConsent: vi.fn(),
  mockValidateGuestbookAudioContent: vi.fn(),
  mockIsGuestbookAudioKey: vi.fn(),
  mockDeriveGuestbookAudioKey: vi.fn(),
  mockAssinarPut: vi.fn(),
  mockInspecionarObjeto: vi.fn(),
  mockWithEvent: vi.fn(),
  mockEventGuestbook: vi.fn(),
  mockUpdateGuestbookAudio: vi.fn(),
  mockSignGuestbookAudio: vi.fn(),
  VALIDADE_PRESIGN_SEGUNDOS: 900,
}));

vi.mock("@albora/core", () => ({
  durationForUpload: mockDurationForUpload,
  normalizeGuestbookAudioMime: mockNormalizeGuestbookAudioMime,
  validateGuestbookAudioDeclaration: mockValidateGuestbookAudioDeclaration,
  validateGuestbookAudioConsent: mockValidateGuestbookAudioConsent,
  validateGuestbookAudioContent: mockValidateGuestbookAudioContent,
  isGuestbookAudioKey: mockIsGuestbookAudioKey,
  deriveGuestbookAudioKey: mockDeriveGuestbookAudioKey,
  VALIDADE_PRESIGN_SEGUNDOS,
}));

vi.mock("@/lib/r2", () => ({
  assinarPut: mockAssinarPut,
  inspecionarObjeto: mockInspecionarObjeto,
}));

vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  eventGuestbook: mockEventGuestbook,
  updateGuestbookAudio: mockUpdateGuestbookAudio,
}));

vi.mock("@/lib/infrastructure/api/handlers/guestbook-audio-url", () => ({
  signGuestbookAudio: mockSignGuestbookAudio,
}));

describe("presignGuestbookAudioUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    accountId: "acc-456",
    mime: "audio/mp4",
    bytes: 50000,
    duracaoSegundos: 15,
    ...overrides,
  });

  it("deve gerar presigned URL para áudio válido", async () => {
    mockDurationForUpload.mockReturnValue(15);
    mockNormalizeGuestbookAudioMime.mockReturnValue("audio/mp4");
    mockValidateGuestbookAudioDeclaration.mockReturnValue(null);
    mockDeriveGuestbookAudioKey.mockReturnValue("events/evt-123/guestbook/audio-123.m4a");
    mockAssinarPut.mockResolvedValue("https://r2.example.com/presigned-put");

    const input = createInput();
    const result = await presignGuestbookAudioUpload(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.chave).toBe("events/evt-123/guestbook/audio-123.m4a");
      expect(result.put).toBe("https://r2.example.com/presigned-put");
    }
  });

  it("deve rejeitar áudio vazio", async () => {
    mockDurationForUpload.mockReturnValue(null);

    const input = createInput({ duracaoSegundos: 0 });
    const result = await presignGuestbookAudioUpload(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("recado.audio_vazio");
    }
  });

  it("deve rejeitar formato não suportado", async () => {
    mockDurationForUpload.mockReturnValue(15);
    mockNormalizeGuestbookAudioMime.mockReturnValue(null);
    mockValidateGuestbookAudioDeclaration.mockReturnValue({
      code: "recado.audio_tipo_recusado",
      details: { recebido: "audio/ogg" },
    });

    const input = createInput({ mime: "audio/ogg" });
    const result = await presignGuestbookAudioUpload(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("recado.audio_tipo_recusado");
    }
  });

  it("deve rejeitar áudio grande demais", async () => {
    mockDurationForUpload.mockReturnValue(30);
    mockNormalizeGuestbookAudioMime.mockReturnValue("audio/mp4");
    mockValidateGuestbookAudioDeclaration.mockReturnValue({
      code: "recado.audio_grande_demais",
      details: { limite_bytes: 5000000 },
    });

    const input = createInput({ bytes: 6000000, duracaoSegundos: 30 });
    const result = await presignGuestbookAudioUpload(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("recado.audio_grande_demais");
    }
  });
});

describe("confirmGuestbookAudioUpload", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    accountId: "acc-456",
    chave: "events/evt-123/guestbook/audio-123.m4a",
    mime: "audio/mp4",
    duracaoSegundos: 15,
    aceite: true,
    ...overrides,
  });

  it("deve confirmar áudio com sucesso", async () => {
    mockValidateGuestbookAudioConsent.mockReturnValue(null);
    mockIsGuestbookAudioKey.mockReturnValue(true);
    mockNormalizeGuestbookAudioMime.mockReturnValue("audio/mp4");
    mockDurationForUpload.mockReturnValue(15);
    mockInspecionarObjeto.mockResolvedValue({
      bytes: 50000,
      inicio: Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
    });
    mockValidateGuestbookAudioDeclaration.mockReturnValue(null);
    mockValidateGuestbookAudioContent.mockReturnValue(null);
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockEventGuestbook.mockResolvedValue({ id: "gb-1" });
    mockUpdateGuestbookAudio.mockResolvedValue({
      id: "gb-1",
      audio: { chave: "events/evt-123/guestbook/audio-123.m4a", duracaoSegundos: 15 },
    });
    mockSignGuestbookAudio.mockResolvedValue({ url: "https://r2.example.com/signed-audio" });

    const input = createInput();
    const result = await confirmGuestbookAudioUpload(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.recado.id).toBe("gb-1");
      expect(result.recado.audio!.url).toBe("https://r2.example.com/signed-audio");
    }
  });

  it("deve rejeitar quando aceite não foi dado", async () => {
    mockValidateGuestbookAudioConsent.mockReturnValue({
      code: "recado.aceite_recusado",
    });

    const input = createInput({ aceite: false });
    const result = await confirmGuestbookAudioUpload(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("recado.aceite_recusado");
    }
  });

  it("deve rejeitar chave inválida", async () => {
    mockValidateGuestbookAudioConsent.mockReturnValue(null);
    mockIsGuestbookAudioKey.mockReturnValue(false);

    const input = createInput({ chave: "invalid/path.m4a" });
    const result = await confirmGuestbookAudioUpload(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("recado.chave_do_cliente");
    }
  });

  it("deve rejeitar quando objeto ausente", async () => {
    mockValidateGuestbookAudioConsent.mockReturnValue(null);
    mockIsGuestbookAudioKey.mockReturnValue(true);
    mockNormalizeGuestbookAudioMime.mockReturnValue("audio/mp4");
    mockDurationForUpload.mockReturnValue(15);
    mockInspecionarObjeto.mockResolvedValue(null);

    const input = createInput();
    const result = await confirmGuestbookAudioUpload(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("recado.audio_ausente");
    }
  });

  it("deve rejeitar conteúdo inválido", async () => {
    mockValidateGuestbookAudioConsent.mockReturnValue(null);
    mockIsGuestbookAudioKey.mockReturnValue(true);
    mockNormalizeGuestbookAudioMime.mockReturnValue("audio/mp4");
    mockDurationForUpload.mockReturnValue(15);
    mockInspecionarObjeto.mockResolvedValue({
      bytes: 50000,
      inicio: Buffer.from([0xff, 0xff, 0xff, 0xff]),
    });
    mockValidateGuestbookAudioDeclaration.mockReturnValue(null);
    mockValidateGuestbookAudioContent.mockReturnValue({
      code: "recado.audio_conteudo_recusado",
      details: {},
    });

    const input = createInput();
    const result = await confirmGuestbookAudioUpload(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("recado.audio_conteudo_recusado");
    }
  });

  it("deve rejeitar quando guestbook não existe", async () => {
    mockValidateGuestbookAudioConsent.mockReturnValue(null);
    mockIsGuestbookAudioKey.mockReturnValue(true);
    mockNormalizeGuestbookAudioMime.mockReturnValue("audio/mp4");
    mockDurationForUpload.mockReturnValue(15);
    mockInspecionarObjeto.mockResolvedValue({
      bytes: 50000,
      inicio: Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]),
    });
    mockValidateGuestbookAudioDeclaration.mockReturnValue(null);
    mockValidateGuestbookAudioContent.mockReturnValue(null);
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockEventGuestbook.mockResolvedValue(null);

    const input = createInput();
    const result = await confirmGuestbookAudioUpload(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("recado.inexistente");
    }
  });
});

describe("deleteGuestbookAudio", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    accountId: "acc-456",
    ...overrides,
  });

  it("deve deletar áudio com sucesso", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockUpdateGuestbookAudio.mockResolvedValue({
      id: "gb-1",
      audio: null,
    });

    const input = createInput();
    const result = await deleteGuestbookAudio(input, mockPool);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.recado.id).toBe("gb-1");
      expect(result.recado.audio).toBeNull();
    }
  });

  it("deve rejeitar quando guestbook não existe", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, fn) => fn(null));
    mockUpdateGuestbookAudio.mockResolvedValue(null);

    const input = createInput();
    const result = await deleteGuestbookAudio(input, mockPool);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("recado.inexistente");
    }
  });
});
