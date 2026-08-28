import { describe, expect, it } from "vitest";
import { readThemePreference } from "./theme-preference";

describe("readThemePreference", () => {
  it("aceita 'light'", () => {
    expect(readThemePreference("light")).toBe("light");
  });

  it("aceita 'dark'", () => {
    expect(readThemePreference("dark")).toBe("dark");
  });

  it("rejeita undefined", () => {
    expect(readThemePreference(undefined)).toBeNull();
  });

  it("rejeita string vazia", () => {
    expect(readThemePreference("")).toBeNull();
  });

  it("rejeita valor fora do conjunto fechado", () => {
    expect(readThemePreference("xpto")).toBeNull();
  });

  it("rejeita alias em português — o conjunto é fechado a 'light'/'dark'", () => {
    expect(readThemePreference("escuro")).toBeNull();
  });
});
