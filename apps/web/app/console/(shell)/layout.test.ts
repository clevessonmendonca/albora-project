import { describe, expect, it, vi } from "vitest";

const { redirectMock, resolveActorMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  resolveActorMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/features/console/components/server/console-shell", () => ({
  ConsoleShell: ({ children }: { children: unknown }) => children,
}));

import ConsoleLayout from "./layout";

describe("ConsoleLayout", () => {
  it("sem ator redireciona para /console/login", async () => {
    resolveActorMock.mockResolvedValueOnce(null);
    await ConsoleLayout({ children: null });
    expect(redirectMock).toHaveBeenCalledWith("/console/login");
  });
});
