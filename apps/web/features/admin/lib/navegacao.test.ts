import { describe, expect, it } from "vitest";
import { DESTINOS, destinoAtivo, GRUPOS_DE_DESTINO, destinoDe } from "./navegacao";

const base = "/admin/e/abc";

/** As 12 rotas que existem hoje em app/admin/e/[eventId]/. Toda uma delas tem de marcar algum destino — hoje 8 não marcam nada. */
const ROTAS_DO_EVENTO = [
  "",
  "/ao-vivo",
  "/album",
  "/consent",
  "/evento",
  "/guestbook",
  "/guests",
  "/identity",
  "/insights",
  "/missions",
  "/moderation",
  "/pre-event",
  "/qrcode",
];

describe("destinos do painel", () => {
  it("nenhum destino divide rota com outro", () => {
    const rotas = DESTINOS.flatMap((d) => [d.suffix, ...d.absorve]);

    expect(new Set(rotas).size).toBe(rotas.length);
  });

  it("toda rota do evento marca algum destino", () => {
    const orfas = ROTAS_DO_EVENTO.filter((r) => destinoAtivo(`${base}${r}`, base) === null);

    expect(orfas).toEqual([]);
  });
});

describe("destino ativo", () => {
  it("a raiz do evento é o Início", () => {
    expect(destinoAtivo(base, base)).toBe("inicio");
    expect(destinoAtivo(`${base}/`, base)).toBe("inicio");
  });

  it("rota absorvida marca o destino que a contém", () => {
    expect(destinoAtivo(`${base}/moderation`, base)).toBe("fotos");
    expect(destinoAtivo(`${base}/insights`, base)).toBe("convidados");
    expect(destinoAtivo(`${base}/missions`, base)).toBe("experiencia");
    expect(destinoAtivo(`${base}/guestbook`, base)).toBe("experiencia");
    expect(destinoAtivo(`${base}/team`, base)).toBe("ajustes");
    expect(destinoAtivo(`${base}/consent`, base)).toBe("ajustes");
    expect(destinoAtivo(`${base}/pre-event`, base)).toBe("inicio");
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

/**
 * O rail passa a agrupar os destinos, como o protótipo do painel do casal:
 * "Seu evento" reúne o que se olha durante a festa, "Personalização" o que se
 * decide antes. Seis itens soltos numa coluna não dizem qual é qual.
 *
 * A bottom-bar continua plana — no celular não há altura para rótulo de grupo,
 * e ali a lista curta já é legível.
 */
describe("os destinos vêm agrupados para o rail", () => {
  it("todo destino pertence a exatamente um grupo", () => {
    const noGrupo = GRUPOS_DE_DESTINO.flatMap((g) => g.destinos);
    expect(noGrupo.length).toBe(DESTINOS.length);
    expect(new Set(noGrupo).size).toBe(DESTINOS.length);
    for (const d of DESTINOS) expect(noGrupo).toContain(d.id);
  });

  it("cada grupo tem rótulo e ao menos um destino", () => {
    for (const g of GRUPOS_DE_DESTINO) {
      expect(g.rotulo.trim().length).toBeGreaterThan(0);
      expect(g.destinos.length).toBeGreaterThan(0);
    }
  });

  it("o primeiro grupo abre com Início — é onde o anfitrião cai", () => {
    expect(GRUPOS_DE_DESTINO[0]!.destinos[0]).toBe("inicio");
  });

  it("destinoDe encontra o destino pelo id", () => {
    expect(destinoDe("fotos")?.rotulo).toBe("Fotos");
    expect(destinoDe("inicio")?.suffix).toBe("");
  });
});
