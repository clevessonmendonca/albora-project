/**
 * Testes: Admin Challenges Use Cases
 * 
 * Cobertura:
 * - listChallengesUseCase: lista missões do evento
 * - updatePackMissions: atualiza missões do pack
 * - updateCustomMissions: atualiza missões customizadas
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { listChallengesUseCase } from "./list-challenges";
import { updatePackMissions, updateCustomMissions } from "./update-challenges";
import type { Pool, PoolClient } from "pg";

// Mocks usando vi.hoisted
const {
  mockWithEvent,
  mockListChallenges,
  mockSubstituirDesafios,
  mockSubstituirMissoesCustom,
} = vi.hoisted(() => ({
  mockWithEvent: vi.fn(),
  mockListChallenges: vi.fn(),
  mockSubstituirDesafios: vi.fn(),
  mockSubstituirMissoesCustom: vi.fn(),
}));

vi.mock("@albora/db", () => ({
  withEvent: mockWithEvent,
  listChallenges: mockListChallenges,
  substituirDesafios: mockSubstituirDesafios,
  substituirMissoesCustom: mockSubstituirMissoesCustom,
}));

describe("listChallengesUseCase", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    packId: "wedding",
    ...overrides,
  });

  it("deve listar challenges do pack", async () => {
    const challengesMock = [
      {
        id: "chal-1",
        chaveTitulo: "missao.noivos",
        tituloCustom: null,
        emoji: "💑",
        ordem: 1,
      },
      {
        id: "chal-2",
        chaveTitulo: "missao.brinde",
        tituloCustom: null,
        emoji: "🥂",
        ordem: 2,
      },
    ];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockListChallenges.mockResolvedValue(challengesMock);

    const input = createInput();
    const result = await listChallengesUseCase(input, mockPool);

    expect(result.packId).toBe("wedding");
    expect(result.challenges).toHaveLength(2);
    expect(result.challenges[0]).toEqual({
      id: "chal-1",
      titleKey: "missao.noivos",
      customTitle: null,
      emoji: "💑",
      position: 1,
    });

    expect(mockWithEvent).toHaveBeenCalledWith(mockPool, "evt-123", expect.any(Function));
    expect(mockListChallenges).toHaveBeenCalledWith(expect.anything(), "evt-123", null);
  });

  it("deve listar challenges customizadas", async () => {
    const challengesMock = [
      {
        id: "chal-custom-1",
        chaveTitulo: null,
        tituloCustom: "Foto com os Padrinhos",
        emoji: "👨‍👨‍👦",
        ordem: 1,
      },
    ];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockListChallenges.mockResolvedValue(challengesMock);

    const input = createInput();
    const result = await listChallengesUseCase(input, mockPool);

    expect(result.challenges[0]).toEqual({
      id: "chal-custom-1",
      titleKey: null,
      customTitle: "Foto com os Padrinhos",
      emoji: "👨‍👨‍👦",
      position: 1,
    });
  });

  it("deve retornar array vazio quando não há challenges", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockListChallenges.mockResolvedValue([]);

    const input = createInput();
    const result = await listChallengesUseCase(input, mockPool);

    expect(result.challenges).toEqual([]);
  });

  it("deve serializar desafios mistos (pack + custom)", async () => {
    const challengesMock = [
      {
        id: "chal-1",
        chaveTitulo: "missao.noivos",
        tituloCustom: null,
        emoji: "💑",
        ordem: 1,
      },
      {
        id: "chal-custom-1",
        chaveTitulo: null,
        tituloCustom: "Custom",
        emoji: null,
        ordem: 2,
      },
    ];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockListChallenges.mockResolvedValue(challengesMock);

    const input = createInput();
    const result = await listChallengesUseCase(input, mockPool);

    expect(result.challenges).toHaveLength(2);
    expect(result.challenges[0]!.titleKey).toBe("missao.noivos");
    expect(result.challenges[1]!.customTitle).toBe("Custom");
  });
});

describe("updatePackMissions", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    packId: "wedding",
    titleKeys: ["missao.noivos", "missao.brinde"],
    ...overrides,
  });

  it("deve atualizar missões do pack com sucesso", async () => {
    const challengesAtualizados = [
      {
        id: "chal-1",
        chaveTitulo: "missao.noivos",
        tituloCustom: null,
        emoji: "💑",
        ordem: 1,
      },
      {
        id: "chal-2",
        chaveTitulo: "missao.brinde",
        tituloCustom: null,
        emoji: "🥂",
        ordem: 2,
      },
    ];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockSubstituirDesafios.mockResolvedValue(undefined);
    mockListChallenges.mockResolvedValue(challengesAtualizados);

    const input = createInput();
    const result = await updatePackMissions(input, mockPool);

    expect(result.packId).toBe("wedding");
    expect(result.challenges).toHaveLength(2);
    expect(result.challenges[0]!.titleKey).toBe("missao.noivos");

    expect(mockSubstituirDesafios).toHaveBeenCalledWith(
      expect.anything(),
      "evt-123",
      ["missao.noivos", "missao.brinde"],
    );
    expect(mockListChallenges).toHaveBeenCalled();
  });

  it("deve substituir missões anteriores", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockSubstituirDesafios.mockResolvedValue(undefined);
    mockListChallenges.mockResolvedValue([
      {
        id: "chal-new",
        chaveTitulo: "missao.nova",
        tituloCustom: null,
        emoji: "🎉",
        ordem: 1,
      },
    ]);

    const input = createInput({ titleKeys: ["missao.nova"] });
    const result = await updatePackMissions(input, mockPool);

    expect(result.challenges).toHaveLength(1);
    expect(result.challenges[0]!.titleKey).toBe("missao.nova");
  });

  it("deve aceitar lista vazia de missões", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockSubstituirDesafios.mockResolvedValue(undefined);
    mockListChallenges.mockResolvedValue([]);

    const input = createInput({ titleKeys: [] });
    const result = await updatePackMissions(input, mockPool);

    expect(result.challenges).toEqual([]);
    expect(mockSubstituirDesafios).toHaveBeenCalledWith(
      expect.anything(),
      "evt-123",
      [],
    );
  });
});

describe("updateCustomMissions", () => {
  let mockPool: Pool;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool = {} as Pool;
  });

  const createInput = (overrides = {}) => ({
    eventId: "evt-123",
    packId: "wedding",
    customMissions: [
      { titulo: "Missão 1", posicao: 1, emoji: "📷" },
      { titulo: "Missão 2", posicao: 2, emoji: null },
    ],
    ...overrides,
  });

  it("deve atualizar missões customizadas com sucesso", async () => {
    const challengesAtualizados = [
      {
        id: "chal-custom-1",
        chaveTitulo: null,
        tituloCustom: "Missão 1",
        emoji: "📷",
        ordem: 1,
      },
      {
        id: "chal-custom-2",
        chaveTitulo: null,
        tituloCustom: "Missão 2",
        emoji: null,
        ordem: 2,
      },
    ];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockSubstituirMissoesCustom.mockResolvedValue(undefined);
    mockListChallenges.mockResolvedValue(challengesAtualizados);

    const input = createInput();
    const result = await updateCustomMissions(input, mockPool);

    expect(result.packId).toBe("wedding");
    expect(result.challenges).toHaveLength(2);
    expect(result.challenges[0]!.customTitle).toBe("Missão 1");
    expect(result.challenges[0]!.emoji).toBe("📷");

    expect(mockSubstituirMissoesCustom).toHaveBeenCalledWith(
      expect.anything(),
      "evt-123",
      [
        { titulo: "Missão 1", posicao: 1, emoji: "📷" },
        { titulo: "Missão 2", posicao: 2, emoji: null },
      ],
    );
  });

  it("deve atualizar missão existente com id", async () => {
    const challengeAtualizado = [
      {
        id: "chal-existing",
        chaveTitulo: null,
        tituloCustom: "Missão Atualizada",
        emoji: "✨",
        ordem: 1,
      },
    ];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockSubstituirMissoesCustom.mockResolvedValue(undefined);
    mockListChallenges.mockResolvedValue(challengeAtualizado);

    const input = createInput({
      customMissions: [
        { id: "chal-existing", titulo: "Missão Atualizada", posicao: 1, emoji: "✨" },
      ],
    });
    const result = await updateCustomMissions(input, mockPool);

    expect(result.challenges[0]!.id).toBe("chal-existing");
    expect(result.challenges[0]!.customTitle).toBe("Missão Atualizada");
  });

  it("deve criar missões sem emoji", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockSubstituirMissoesCustom.mockResolvedValue(undefined);
    mockListChallenges.mockResolvedValue([
      {
        id: "chal-1",
        chaveTitulo: null,
        tituloCustom: "Sem Emoji",
        emoji: null,
        ordem: 1,
      },
    ]);

    const input = createInput({
      customMissions: [{ titulo: "Sem Emoji", posicao: 1 }],
    });
    const result = await updateCustomMissions(input, mockPool);

    expect(result.challenges[0]!.emoji).toBeNull();
  });

  it("deve aceitar lista vazia de missões customizadas", async () => {
    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockSubstituirMissoesCustom.mockResolvedValue(undefined);
    mockListChallenges.mockResolvedValue([]);

    const input = createInput({ customMissions: [] });
    const result = await updateCustomMissions(input, mockPool);

    expect(result.challenges).toEqual([]);
  });

  it("deve preservar ordem das missões", async () => {
    const challengesOrdenados = [
      {
        id: "chal-3",
        chaveTitulo: null,
        tituloCustom: "Terceira",
        emoji: null,
        ordem: 3,
      },
      {
        id: "chal-1",
        chaveTitulo: null,
        tituloCustom: "Primeira",
        emoji: null,
        ordem: 1,
      },
      {
        id: "chal-2",
        chaveTitulo: null,
        tituloCustom: "Segunda",
        emoji: null,
        ordem: 2,
      },
    ];

    mockWithEvent.mockImplementation(async (_pool, _eventId, callback) =>
      callback({} as PoolClient),
    );
    mockSubstituirMissoesCustom.mockResolvedValue(undefined);
    mockListChallenges.mockResolvedValue(challengesOrdenados);

    const input = createInput({
      customMissions: [
        { titulo: "Terceira", posicao: 3 },
        { titulo: "Primeira", posicao: 1 },
        { titulo: "Segunda", posicao: 2 },
      ],
    });
    const result = await updateCustomMissions(input, mockPool);

    expect(result.challenges[0]!.position).toBe(3);
    expect(result.challenges[1]!.position).toBe(1);
    expect(result.challenges[2]!.position).toBe(2);
  });
});
