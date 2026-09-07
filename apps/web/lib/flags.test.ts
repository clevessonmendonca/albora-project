import { afterEach, describe, expect, it } from "vitest";
import { delayedAuthEnabled } from "./flags";

describe("delayedAuthEnabled", () => {
  const original = process.env.NEXT_PUBLIC_DELAYED_AUTH;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_DELAYED_AUTH;
    else process.env.NEXT_PUBLIC_DELAYED_AUTH = original;
  });

  it("off por padrão — o caminho atual (login-antes) é o fallback", () => {
    delete process.env.NEXT_PUBLIC_DELAYED_AUTH;
    expect(delayedAuthEnabled()).toBe(false);
  });

  it("qualquer valor diferente de '1' fica off — ligar é decisão explícita", () => {
    process.env.NEXT_PUBLIC_DELAYED_AUTH = "true";
    expect(delayedAuthEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_DELAYED_AUTH = "0";
    expect(delayedAuthEnabled()).toBe(false);
  });

  it("liga só com '1'", () => {
    process.env.NEXT_PUBLIC_DELAYED_AUTH = "1";
    expect(delayedAuthEnabled()).toBe(true);
  });
});
