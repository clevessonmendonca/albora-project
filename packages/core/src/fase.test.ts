import { describe, expect, it } from "vitest";
import { faseDoEvento } from "./fase";

const em = (iso: string) => new Date(iso);

const janela = {
  comecaEm: em("2026-06-01T22:00:00Z"),
  terminaEm: em("2026-06-02T04:00:00Z"),
};

describe("fase do evento", () => {
  it("rascunho ignora o calendário", () => {
    const evento = { ...janela, status: "draft" as const };

    expect(faseDoEvento(evento, em("2026-05-01T00:00:00Z"))).toBe("rascunho");
    expect(faseDoEvento(evento, em("2026-06-02T00:00:00Z"))).toBe("rascunho");
    expect(faseDoEvento(evento, em("2027-01-01T00:00:00Z"))).toBe("rascunho");
  });

  it("encerrado à mão vence a janela que ainda não acabou", () => {
    const evento = { ...janela, status: "ended" as const };

    expect(faseDoEvento(evento, em("2026-06-02T00:00:00Z"))).toBe("depois");
  });

  it("antes do começo", () => {
    const evento = { ...janela, status: "active" as const };

    expect(faseDoEvento(evento, em("2026-06-01T21:59:59Z"))).toBe("antes");
  });

  it("no instante exato do começo já está durante", () => {
    const evento = { ...janela, status: "active" as const };

    expect(faseDoEvento(evento, em("2026-06-01T22:00:00Z"))).toBe("durante");
  });

  it("no instante exato do fim ainda está durante", () => {
    const evento = { ...janela, status: "active" as const };

    expect(faseDoEvento(evento, em("2026-06-02T04:00:00Z"))).toBe("durante");
  });

  it("passado o fim, depois", () => {
    const evento = { ...janela, status: "active" as const };

    expect(faseDoEvento(evento, em("2026-06-02T04:00:01Z"))).toBe("depois");
  });
});
