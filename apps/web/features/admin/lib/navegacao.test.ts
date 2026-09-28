import { describe, expect, it } from "vitest";
import {
  DESTINOS,
  DESTINOS_MOBILE,
  destinoAtivo,
  destinosDoGrupo,
  destinosVisiveis,
  GRUPOS,
  gruposVisiveis,
  hrefDoDestino,
} from "./navegacao";

const base = "/admin/e/abc";

describe("destinos do evento", () => {
  it("são onze, na ordem do protótipo", () => {
    expect(DESTINOS.map((d) => d.id)).toEqual([
      "inicio",
      "convidados",
      "album",
      "telao",
      "missoes",
      "insights",
      "comunidade",
      "inspiracao",
      "identidade",
      "convite",
      "configuracoes",
    ]);
  });

  it("os três grupos cobrem todos os destinos, sem sobra", () => {
    const agrupados = GRUPOS.flatMap((g) => destinosDoGrupo(g.id));

    expect(agrupados).toHaveLength(DESTINOS.length);
    expect(new Set(agrupados.map((d) => d.id)).size).toBe(DESTINOS.length);
  });

  it("nenhum destino declara a mesma rota que outro", () => {
    const rotas = DESTINOS.flatMap((d) => [d.suffix, ...d.absorve]);

    expect(new Set(rotas).size).toBe(rotas.length);
  });

  it("a barra inferior leva quatro destinos que existem", () => {
    expect(DESTINOS_MOBILE).toHaveLength(4);
    for (const id of DESTINOS_MOBILE) {
      expect(DESTINOS.some((d) => d.id === id)).toBe(true);
    }
  });
});

describe("destino ativo", () => {
  it("a raiz do evento é o Início", () => {
    expect(destinoAtivo(base, base)).toBe("inicio");
    expect(destinoAtivo(`${base}/`, base)).toBe("inicio");
  });

  it("rota absorvida marca o destino que a absorveu", () => {
    expect(destinoAtivo(`${base}/pre-event`, base)).toBe("inicio");
    expect(destinoAtivo(`${base}/moderation`, base)).toBe("album");
    expect(destinoAtivo(`${base}/guestbook`, base)).toBe("missoes");
    expect(destinoAtivo(`${base}/experiencia`, base)).toBe("missoes");
    expect(destinoAtivo(`${base}/consent`, base)).toBe("configuracoes");
  });

  it("destino de conta marca de dentro de um evento — o feed é o mesmo em qualquer um", () => {
    expect(destinoAtivo("/admin/comunidade", base)).toBe("comunidade");
    expect(destinoAtivo("/admin/inspiracao", base)).toBe("inspiracao");
    expect(destinoAtivo("/admin/comunidade/abc-123", base)).toBe("comunidade");
  });

  it("rota própria marca o próprio destino", () => {
    expect(destinoAtivo(`${base}/guests`, base)).toBe("convidados");
    expect(destinoAtivo(`${base}/album`, base)).toBe("album");
    expect(destinoAtivo(`${base}/telao`, base)).toBe("telao");
    expect(destinoAtivo(`${base}/missions`, base)).toBe("missoes");
    expect(destinoAtivo(`${base}/insights`, base)).toBe("insights");
    expect(destinoAtivo(`${base}/identity`, base)).toBe("identidade");
    expect(destinoAtivo(`${base}/qrcode`, base)).toBe("convite");
    expect(destinoAtivo(`${base}/ajustes`, base)).toBe("configuracoes");
  });

  it("sub-rota mais funda continua marcando o destino", () => {
    expect(destinoAtivo(`${base}/album/123`, base)).toBe("album");
  });

  it("rota desconhecida não marca nada, em vez de marcar o Início por engano", () => {
    expect(destinoAtivo(`${base}/relatorio-secreto`, base)).toBeNull();
  });

  it("evento vizinho de prefixo parecido não marca nada", () => {
    expect(destinoAtivo("/admin/e/abcdef/album", base)).toBeNull();
  });

  it("fora do evento não marca nada", () => {
    expect(destinoAtivo("/admin", base)).toBeNull();
    expect(destinoAtivo("/admin/billing", base)).toBeNull();
  });
});

describe("escopo do destino", () => {
  it("Comunidade e Inspiração são da conta; o resto é do evento", () => {
    const daConta = DESTINOS.filter((d) => d.escopo === "conta").map((d) => d.id);

    expect(daConta).toEqual(["comunidade", "inspiracao"]);
  });

  it("destino de conta ignora a raiz do evento no href", () => {
    const comunidade = DESTINOS.find((d) => d.id === "comunidade")!;
    const album = DESTINOS.find((d) => d.id === "album")!;

    expect(hrefDoDestino(comunidade, base)).toBe("/admin/comunidade");
    expect(hrefDoDestino(album, base)).toBe(`${base}/album`);
  });

  it("sem evento escolhido, a sidebar mostra só o que é da conta", () => {
    expect(gruposVisiveis(false).map((g) => g.id)).toEqual(["descobrir"]);
    expect(destinosVisiveis("evento", false)).toHaveLength(0);
    expect(destinosVisiveis("descobrir", false).map((d) => d.id)).toEqual([
      "comunidade",
      "inspiracao",
    ]);
  });

  it("com evento escolhido, mostra os três grupos inteiros", () => {
    expect(gruposVisiveis(true)).toHaveLength(3);
    expect(destinosVisiveis("evento", true)).toHaveLength(6);
  });
});
