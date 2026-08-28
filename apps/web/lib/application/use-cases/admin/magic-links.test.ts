/**
 * Testes dos Use Cases: Magic Links (Autenticação)
 * 
 * Step-up authentication e sessão de anfitrião.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  issueMagicLink,
  type IssueMagicLinkInput,
  type IssueMagicLinkOutput,
} from "./issue-magic-link";
import {
  consumeMagicLink,
  type ConsumeMagicLinkInput,
  type ConsumeMagicLinkResult,
} from "./consume-magic-link";
import type { Pool } from "pg";

// Mocks usando vi.hoisted
const {
  mockEmitirMagicLink,
  mockRecordProductEvent,
  mockConsumirMagicLink,
  mockSendHostEmail,
  VALIDADE_MAGIC_LINK_MINUTOS,
  VALIDADE_HOST_SESSAO_HORAS,
  ErroMagicLinkInvalido,
} = vi.hoisted(() => {
  class ErroMagicLinkInvalidoMock extends Error {
    motivo: string;
    constructor(motivo: string) {
      super(`Magic link inválido: ${motivo}`);
      this.name = "ErroMagicLinkInvalido";
      this.motivo = motivo;
    }
  }

  return {
    mockEmitirMagicLink: vi.fn(),
    mockRecordProductEvent: vi.fn(),
    mockConsumirMagicLink: vi.fn(),
    mockSendHostEmail: vi.fn(),
    VALIDADE_MAGIC_LINK_MINUTOS: 15,
    VALIDADE_HOST_SESSAO_HORAS: 48,
    ErroMagicLinkInvalido: ErroMagicLinkInvalidoMock,
  };
});

// Configuração de mocks
vi.mock("@albora/db", () => ({
  emitirMagicLink: mockEmitirMagicLink,
  recordProductEvent: mockRecordProductEvent,
  consumirMagicLink: mockConsumirMagicLink,
  ErroMagicLinkInvalido,
  VALIDADE_MAGIC_LINK_MINUTOS,
  VALIDADE_HOST_SESSAO_HORAS,
}));

vi.mock("@/lib/email", () => ({
  sendHostEmail: mockSendHostEmail,
}));

// Helper para criar mock de Pool
function createMockPool(): Pool {
  return {} as Pool;
}

describe("Magic Links", () => {
  let pool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    pool = createMockPool();
    mockSendHostEmail.mockResolvedValue(undefined);
  });

  describe("issueMagicLink", () => {
    const createIssueInput = (overrides?: Partial<IssueMagicLinkInput>): IssueMagicLinkInput => ({
      sessionSecret: "secret-123",
      email: "host@example.com",
      next: null,
      requestOrigin: "https://app.albora.app",
      isDev: false,
      ...overrides,
    });

    it("deve emitir magic link para novo usuário", async () => {
      mockEmitirMagicLink.mockResolvedValue({
        token: "magic-token-123",
        isNewAccount: true,
      });

      const input = createIssueInput();
      const result = await issueMagicLink(input, pool);

      expect(result).toEqual({ enviado: true });

      // Verificar que expiresAt foi calculado corretamente (15 min)
      expect(mockEmitirMagicLink).toHaveBeenCalledWith(
        pool,
        "secret-123",
        "host@example.com",
        expect.any(Date),
      );

      const expiresAt = mockEmitirMagicLink.mock.calls[0][3];
      const now = Date.now();
      const expectedExpiry = now + 15 * 60 * 1000;
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000);
    });

    it("deve registrar evento de conta criada para novo usuário", async () => {
      mockEmitirMagicLink.mockResolvedValue({
        token: "magic-token-123",
        isNewAccount: true,
      });

      const input = createIssueInput();
      await issueMagicLink(input, pool);

      expect(mockRecordProductEvent).toHaveBeenCalledWith(pool, "account_created");
    });

    it("não deve registrar evento para usuário existente", async () => {
      mockEmitirMagicLink.mockResolvedValue({
        token: "magic-token-456",
        isNewAccount: false,
      });

      const input = createIssueInput();
      await issueMagicLink(input, pool);

      expect(mockRecordProductEvent).not.toHaveBeenCalled();
    });

    it("deve enviar e-mail com link correto", async () => {
      mockEmitirMagicLink.mockResolvedValue({
        token: "magic-token-789",
        isNewAccount: false,
      });

      const input = createIssueInput({
        requestOrigin: "https://app.albora.app",
        next: null,
      });
      await issueMagicLink(input, pool);

      expect(mockSendHostEmail).toHaveBeenCalledWith({
        to: "host@example.com",
        subject: "Seu link para entrar na Albora",
        text: expect.stringContaining("https://app.albora.app/admin/sign-in?m=magic-token-789"),
      });
    });

    it("deve incluir parâmetro next quando fornecido", async () => {
      mockEmitirMagicLink.mockResolvedValue({
        token: "magic-token-abc",
        isNewAccount: false,
      });

      const input = createIssueInput({
        requestOrigin: "https://app.albora.app",
        next: "/events/evt-123/dashboard",
      });
      await issueMagicLink(input, pool);

      expect(mockSendHostEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining(
            "https://app.albora.app/admin/sign-in?m=magic-token-abc&next=%2Fevents%2Fevt-123%2Fdashboard",
          ),
        }),
      );
    });

    it("deve retornar link em modo dev", async () => {
      mockEmitirMagicLink.mockResolvedValue({
        token: "dev-token-123",
        isNewAccount: false,
      });

      const input = createIssueInput({
        isDev: true,
        requestOrigin: "http://localhost:3000",
      });
      const result = await issueMagicLink(input, pool);

      expect(result).toEqual({
        enviado: true,
        link: "http://localhost:3000/admin/sign-in?m=dev-token-123",
      });
    });

    it("não deve retornar link em modo produção", async () => {
      mockEmitirMagicLink.mockResolvedValue({
        token: "prod-token-123",
        isNewAccount: false,
      });

      const input = createIssueInput({ isDev: false });
      const result = await issueMagicLink(input, pool);

      expect(result).toEqual({ enviado: true });
      expect(result).not.toHaveProperty("link");
    });

    it("deve codificar corretamente URL com caracteres especiais no next", async () => {
      mockEmitirMagicLink.mockResolvedValue({
        token: "token-xyz",
        isNewAccount: false,
      });

      const input = createIssueInput({
        next: "/events?filter=active&sort=desc",
      });
      await issueMagicLink(input, pool);

      expect(mockSendHostEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("&next=%2Fevents%3Ffilter%3Dactive%26sort%3Ddesc"),
        }),
      );
    });
  });

  describe("consumeMagicLink", () => {
    const createConsumeInput = (
      overrides?: Partial<ConsumeMagicLinkInput>,
    ): ConsumeMagicLinkInput => ({
      sessionSecret: "secret-123",
      token: "magic-token-456",
      ...overrides,
    });

    it("deve consumir magic link válido e criar sessão", async () => {
      mockConsumirMagicLink.mockResolvedValue({
        token: "session-token-abc",
        accountId: "acc-123",
      });

      const input = createConsumeInput();
      const result = await consumeMagicLink(input, pool);

      expect(result).toEqual({
        ok: true,
        token: "session-token-abc",
        accountId: "acc-123",
        validadeHoras: 48,
      });

      // Verificar que expiresAt foi calculado corretamente (48h)
      expect(mockConsumirMagicLink).toHaveBeenCalledWith(
        pool,
        "secret-123",
        "magic-token-456",
        expect.any(Date),
        expect.any(Date),
      );

      const expiresAt = mockConsumirMagicLink.mock.calls[0][3];
      const now = Date.now();
      const expectedExpiry = now + 48 * 3600 * 1000;
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000);
    });

    it("deve rejeitar magic link expirado", async () => {
      mockConsumirMagicLink.mockRejectedValue(new ErroMagicLinkInvalido("expirado"));

      const input = createConsumeInput();
      const result = await consumeMagicLink(input, pool);

      expect(result).toEqual({
        ok: false,
        code: "admin.link_invalido",
        message: "Link inválido ou expirado",
      });
    });

    it("deve rejeitar magic link já usado", async () => {
      mockConsumirMagicLink.mockRejectedValue(new ErroMagicLinkInvalido("ja_usado"));

      const input = createConsumeInput();
      const result = await consumeMagicLink(input, pool);

      expect(result).toEqual({
        ok: false,
        code: "admin.link_invalido",
        message: "Link inválido ou expirado",
      });
    });

    it("deve rejeitar magic link inexistente", async () => {
      mockConsumirMagicLink.mockRejectedValue(new ErroMagicLinkInvalido("nao_encontrado"));

      const input = createConsumeInput();
      const result = await consumeMagicLink(input, pool);

      expect(result).toEqual({
        ok: false,
        code: "admin.link_invalido",
        message: "Link inválido ou expirado",
      });
    });

    it("deve propagar outros erros não relacionados a magic link", async () => {
      mockConsumirMagicLink.mockRejectedValue(new Error("Database error"));

      const input = createConsumeInput();

      await expect(consumeMagicLink(input, pool)).rejects.toThrow("Database error");
    });

    it("deve usar timestamp correto ao consumir", async () => {
      const beforeCall = Date.now();

      mockConsumirMagicLink.mockResolvedValue({
        token: "session-token",
        accountId: "acc-456",
      });

      const input = createConsumeInput();
      await consumeMagicLink(input, pool);

      const afterCall = Date.now();
      const consumedAt = mockConsumirMagicLink.mock.calls[0][4];

      expect(consumedAt.getTime()).toBeGreaterThanOrEqual(beforeCall);
      expect(consumedAt.getTime()).toBeLessThanOrEqual(afterCall);
    });
  });

  describe("Fluxo completo: issue → consume", () => {
    it("deve completar fluxo de autenticação com sucesso", async () => {
      // 1. Issue magic link
      mockEmitirMagicLink.mockResolvedValue({
        token: "magic-abc",
        isNewAccount: true,
      });

      const issueInput = {
        sessionSecret: "secret-xyz",
        email: "new-host@example.com",
        next: "/dashboard",
        requestOrigin: "https://app.albora.app",
        isDev: false,
      };

      const issueResult = await issueMagicLink(issueInput, pool);

      expect(issueResult.enviado).toBe(true);
      expect(mockRecordProductEvent).toHaveBeenCalledWith(pool, "account_created");
      expect(mockSendHostEmail).toHaveBeenCalled();

      // 2. Consume magic link
      mockConsumirMagicLink.mockResolvedValue({
        token: "session-xyz",
        accountId: "acc-new",
      });

      const consumeInput = {
        sessionSecret: "secret-xyz",
        token: "magic-abc",
      };

      const consumeResult = await consumeMagicLink(consumeInput, pool);

      expect(consumeResult).toEqual({
        ok: true,
        token: "session-xyz",
        accountId: "acc-new",
        validadeHoras: 48,
      });
    });

    it("deve falhar se tentar consumir duas vezes", async () => {
      // 1. Issue
      mockEmitirMagicLink.mockResolvedValue({
        token: "magic-reuse",
        isNewAccount: false,
      });

      await issueMagicLink(
        {
          sessionSecret: "secret-test",
          email: "host@example.com",
          next: null,
          requestOrigin: "https://app.albora.app",
          isDev: false,
        },
        pool,
      );

      // 2. First consume (sucesso)
      mockConsumirMagicLink.mockResolvedValueOnce({
        token: "session-first",
        accountId: "acc-789",
      });

      const consumeInput = {
        sessionSecret: "secret-test",
        token: "magic-reuse",
      };

      const firstResult = await consumeMagicLink(consumeInput, pool);
      expect(firstResult.ok).toBe(true);

      // 3. Second consume (deve falhar)
      mockConsumirMagicLink.mockRejectedValueOnce(new ErroMagicLinkInvalido("ja_usado"));

      const secondResult = await consumeMagicLink(consumeInput, pool);
      expect(secondResult).toEqual({
        ok: false,
        code: "admin.link_invalido",
        message: "Link inválido ou expirado",
      });
    });
  });
});
