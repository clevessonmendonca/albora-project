import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { verificar as isolamento } from "./isolamento.mjs";
import { verificar as tokens } from "./tokens.mjs";
import { verificar as dominio } from "./dominio.mjs";
import { verificar as packs } from "./packs.mjs";
import { verificar as sessao } from "./sessao.mjs";
import { verificar as features } from "./features.mjs";
import { verificar as apiRoutes } from "./api-routes.mjs";
import { verificar as nomenclatura } from "./nomenclatura.mjs";

/**
 * O auto-teste de cada guard.
 *
 * Guard sem auto-teste pode parar de verificar e continuar verde — e verde é
 * exatamente como ele parece quando funciona. Por isso cada um roda duas
 * vezes: contra uma fixture que viola de mentira, onde precisa reprovar, e
 * contra o código real, onde precisa passar.
 */

const aqui = dirname(fileURLToPath(import.meta.url));
const raizReal = join(aqui, "..", "..");
const fixture = (nome) => join(aqui, "fixtures", nome);

const GUARDS = [
  ["isolamento", isolamento],
  ["tokens", tokens],
  ["dominio", dominio],
  ["packs", packs],
  ["sessao", sessao],
  ["features", features],
  ["api-routes", apiRoutes],
  ["nomenclatura", nomenclatura],
];

describe.each(GUARDS)("guard %s", (nome, verificar) => {
  it("reprova a fixture violadora", () => {
    const violacoes = verificar(fixture(nome));
    expect(violacoes.length).toBeGreaterThan(0);
  });

  it("aponta arquivo, linha e motivo em cada violação", () => {
    for (const v of verificar(fixture(nome))) {
      expect(v.arquivo).toBeTruthy();
      expect(v.linha).toBeGreaterThan(0);
      expect(v.motivo).toBeTruthy();
    }
  });

  it("passa contra o código real do repositório", () => {
    expect(verificar(raizReal)).toEqual([]);
  });
});

describe("cobertura das fixtures", () => {
  it("a fixture de tokens pega as cinco formas de burlar", () => {
    const motivos = tokens(fixture("tokens")).map((v) => v.motivo);
    expect(motivos.some((m) => m.includes("hex"))).toBe(true);
    expect(motivos.some((m) => m.includes("arbitrária"))).toBe(true);
    expect(motivos.some((m) => m.includes("Tailwind"))).toBe(true);
    expect(motivos.some((m) => m.includes("raio literal"))).toBe(true);
    expect(motivos.some((m) => m.includes("curva literal"))).toBe(true);
  });

  it("o guard de tokens varre apps/web/lib e apps/web/features", () => {
    const violacoes = tokens(fixture("tokens")).filter((v) =>
      v.arquivo.startsWith("apps/web/lib/") || v.arquivo.startsWith("apps/web/features/"),
    );
    expect(violacoes.length).toBeGreaterThan(0);
  });

  it("o guard de tokens NÃO reprova círculo, zero, gradiente nem token", () => {
    // Sem isto, a correção do raio e da curva vira ruído que alguém desliga —
    // e guard desligado é pior que guard ausente, porque parece que existe.
    //
    // Por conteúdo e não por número de linha: fixture cresce, e um teste
    // ancorado em posição passa a reprovar o que não devia sem ninguém mexer
    // na regra.
    const reprovadas = tokens(fixture("tokens")).map((v) => v.trecho);

    for (const forma of ["var(--", "50%", "linear-gradient", "borderRadius: 0"]) {
      expect(
        reprovadas.filter((c) => c.includes(forma)),
        `reprovou a forma correta: ${forma}`,
      ).toEqual([]);
    }
  });

  it("a fixture de isolamento pega SET de sessão e lock de sessão", () => {
    const motivos = isolamento(fixture("isolamento")).map((v) => v.motivo);
    expect(motivos.some((m) => m.includes("SET LOCAL"))).toBe(true);
    expect(motivos.some((m) => m.includes("is_local"))).toBe(true);
    expect(motivos.some((m) => m.includes("xact"))).toBe(true);
  });

  it("a fixture de isolamento NÃO reprova UPDATE...SET nem as formas corretas", () => {
    const linhasRuins = isolamento(fixture("isolamento")).map((v) => v.linha);
    // As três primeiras linhas violam; as três últimas são as formas certas.
    expect(Math.max(...linhasRuins)).toBeLessThanOrEqual(3);
  });

  it("a fixture de sessão pega token em log, token em querystring e PII", () => {
    const motivos = sessao(fixture("sessao")).map((v) => v.motivo);
    expect(motivos.some((m) => m.includes("log"))).toBe(true);
    expect(motivos.some((m) => m.includes("querystring"))).toBe(true);
    expect(motivos.some((m) => m.includes("PII"))).toBe(true);
  });

  it("a fixture de sessão NÃO reprova log de id de sessão", () => {
    const linhas = sessao(fixture("sessao")).map((v) => v.linha);
    // As violações estão nas três primeiras linhas do corpo; o log seguro,
    // no fim do arquivo, precisa passar.
    expect(Math.max(...linhas)).toBeLessThanOrEqual(4);
  });

  it("a fixture de packs pega import invertido e string de domínio", () => {
    const motivos = packs(fixture("packs")).map((v) => v.motivo);
    expect(motivos.some((m) => m.includes("pack → core"))).toBe(true);
    expect(motivos.some((m) => m.includes("vocabulário"))).toBe(true);
  });

  it("o guard de packs pega copy de domínio na rota, e não o identificador do pack", () => {
    // A landing é a maior superfície de copy de domínio do produto e mora em
    // `apps/web/app`, fora de `packages`. Sem isto o guard tem a regra certa e
    // o alvo errado.
    const naRota = packs(fixture("packs")).filter((v) => v.arquivo.includes("apps/web/app"));

    expect(naRota.map((v) => v.trecho.trim())).toEqual([
      "return <h1>O álbum do seu casamento</h1>;",
    ]);
  });

  it("a fixture de api-routes reprova rota sem sessão", () => {
    const motivos = apiRoutes(fixture("api-routes")).map((v) => v.motivo);
    expect(motivos.some((m) => m.includes("resolução de sessão"))).toBe(true);
  });

  it("rotas EN alias (reexport) passam no guard de api-routes", () => {
    expect(
      apiRoutes(raizReal).filter((v) => v.arquivo === "apps/web/app/api/comments/route.ts"),
    ).toEqual([]);
    expect(
      apiRoutes(raizReal).filter(
        (v) => v.arquivo === "apps/web/app/api/admin/events/[eventId]/guests/route.ts",
      ),
    ).toEqual([]);
  });
});
