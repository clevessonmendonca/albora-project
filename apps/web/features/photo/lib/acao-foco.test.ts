import { describe, expect, it } from "vitest";
import { resolverAcaoFoco } from "./acao-foco";

describe("resolverAcaoFoco — dreno ao retornar à aba/PWA", () => {
  it("drena quando a aba fica visível e há conexão", () => {
    expect(resolverAcaoFoco(true, true)).toBe("drenar");
  });

  it("apenas atualiza contagens quando visível mas offline", () => {
    expect(resolverAcaoFoco(true, false)).toBe("atualizar");
  });

  it("ignora quando a aba não está visível, independente da conexão", () => {
    expect(resolverAcaoFoco(false, true)).toBe("ignorar");
    expect(resolverAcaoFoco(false, false)).toBe("ignorar");
  });
});
