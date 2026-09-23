import { describe, expect, it } from "vitest";
import { DESTINOS, destinoAtivo } from "./navegacao";

const base = "/admin/e/abc";

describe("destinos do evento", () => {
  it("são seis, na ordem da jornada", () => {
    expect(DESTINOS.map((d) => d.id)).toEqual([
      "inicio",
      "fotos",
      "convidados",
      "experiencia",
      "compartilhar",
      "ajustes",
    ]);
  });

  it("nenhum destino declara a mesma rota que outro", () => {
    const rotas = DESTINOS.flatMap((d) => [d.suffix, ...d.absorve]);

    expect(new Set(rotas).size).toBe(rotas.length);
  });
});

describe("destino ativo", () => {
  it("a raiz do evento é o Início", () => {
    expect(destinoAtivo(base, base)).toBe("inicio");
    expect(destinoAtivo(`${base}/`, base)).toBe("inicio");
  });

  it("rota absorvida marca o destino que vai absorvê-la", () => {
    expect(destinoAtivo(`${base}/pre-event`, base)).toBe("inicio");
    expect(destinoAtivo(`${base}/moderation`, base)).toBe("fotos");
    expect(destinoAtivo(`${base}/insights`, base)).toBe("convidados");
    expect(destinoAtivo(`${base}/missions`, base)).toBe("experiencia");
    expect(destinoAtivo(`${base}/guestbook`, base)).toBe("experiencia");
  });

  it("rota própria marca o próprio destino", () => {
    expect(destinoAtivo(`${base}/album`, base)).toBe("fotos");
    expect(destinoAtivo(`${base}/guests`, base)).toBe("convidados");
    expect(destinoAtivo(`${base}/identity`, base)).toBe("experiencia");
    expect(destinoAtivo(`${base}/qrcode`, base)).toBe("compartilhar");
    expect(destinoAtivo(`${base}/consent`, base)).toBe("ajustes");
  });

  it("sub-rota mais funda continua marcando o destino", () => {
    expect(destinoAtivo(`${base}/album/123`, base)).toBe("fotos");
  });

  it("rota desconhecida não marca nada, em vez de marcar o Início por engano", () => {
    expect(destinoAtivo(`${base}/relatorio-secreto`, base)).toBeNull();
  });

  it("evento vizinho de prefixo parecido não marca nada", () => {
    expect(destinoAtivo("/admin/e/abcdef/album", base)).toBeNull();
  });

  it("fora do evento não marca nada", () => {
    expect(destinoAtivo("/admin", base)).toBeNull();
  });
});
