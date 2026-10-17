import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiModule from "@/lib/api";

const ACCOUNT_ID = "22222222-2222-2222-2222-222222222222";
const EVENT_ID = "11111111-1111-1111-1111-111111111111";

const { requireConfig, requireHostSession } = vi.hoisted(() => ({
  requireConfig: vi.fn(() => null),
  requireHostSession: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, requireConfig, requireHostSession };
});

const { atualizarConfigDoEvento } = vi.hoisted(() => ({ atualizarConfigDoEvento: vi.fn() }));
vi.mock("@albora/db", () => ({ atualizarConfigDoEvento, buscarEventoDoHost: vi.fn(async () => ({})) }));
vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));

const { consume } = vi.hoisted(() => ({ consume: vi.fn() }));
vi.mock("@/lib/rate-limit-store", () => ({ consume }));

const { PATCH } = await import("./route");

function patch(identityTokens: unknown) {
  return PATCH(
    new Request(`https://exemplo.test/api/admin/events/${EVENT_ID}/config`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identityTokens }),
    }),
    { params: Promise.resolve({ eventId: EVENT_ID }) },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  requireConfig.mockReturnValue(null);
  requireHostSession.mockResolvedValue({ host: { accountId: ACCOUNT_ID, email: "admin@exemplo.test" } });
  consume.mockReturnValue({ allowed: true, resetInSeconds: 0 });
  atualizarConfigDoEvento.mockResolvedValue(true);
});

describe("PATCH config, enquadramento da capa", () => {
  it("recusa foco fora de 25, 50 e 75", async () => {
    const r = await patch({ capaFoco: 33 });
    expect(r.status).toBe(422);
    expect(atualizarConfigDoEvento).not.toHaveBeenCalled();
  });

  it("aceita um foco válido", async () => {
    const r = await patch({ capaFoco: 75 });
    expect(r.status).toBe(200);
    expect(atualizarConfigDoEvento).toHaveBeenCalledOnce();
  });
});
