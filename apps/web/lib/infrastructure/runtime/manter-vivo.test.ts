import { after } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { manterVivo } from "./manter-vivo";

vi.mock("next/server", () => ({ after: vi.fn() }));

describe("manterVivo", () => {
  beforeEach(() => {
    vi.mocked(after).mockReset();
  });

  it("registra a promessa no after e a devolve", async () => {
    const trabalho = Promise.resolve(42);

    expect(manterVivo(trabalho)).toBe(trabalho);
    expect(after).toHaveBeenCalledWith(trabalho);
    await expect(trabalho).resolves.toBe(42);
  });

  it("fora de um request o after lança e a promessa segue sem erro", async () => {
    vi.mocked(after).mockImplementation(() => {
      throw new Error("after was called outside a request scope");
    });

    await expect(manterVivo(Promise.resolve("ok"))).resolves.toBe("ok");
  });
});
