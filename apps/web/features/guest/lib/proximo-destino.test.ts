import { describe, expect, it } from "vitest";
import { destinoSeguroDoConvidado } from "./proximo-destino";

describe("destinoSeguroDoConvidado", () => {
  it("aceita um caminho dentro do mesmo evento", () => {
    expect(destinoSeguroDoConvidado("festa", "/e/festa/feed")).toBe("/e/festa/feed");
    expect(destinoSeguroDoConvidado("festa", "/e/festa/g/abc")).toBe("/e/festa/g/abc");
  });

  it("recusa outro evento, outro host e escapes", () => {
    expect(destinoSeguroDoConvidado("festa", "/e/outra/feed")).toBeNull();
    expect(destinoSeguroDoConvidado("festa", "//evil.com")).toBeNull();
    expect(destinoSeguroDoConvidado("festa", "https://evil.com")).toBeNull();
    expect(destinoSeguroDoConvidado("festa", "/e/festa//evil.com")).toBeNull();
    expect(destinoSeguroDoConvidado("festa", "/e/festa/..%2f")).toBeNull();
    expect(destinoSeguroDoConvidado("festa", "/e/festa/../../admin")).toBeNull();
    expect(destinoSeguroDoConvidado("festa", "/e/festa/\\x")).toBeNull();
    expect(destinoSeguroDoConvidado("festa", null)).toBeNull();
    expect(destinoSeguroDoConvidado("festa", "/e/festa/")).toBeNull();
  });
});
