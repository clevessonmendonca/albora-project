import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Auto-teste do pre-push.
 *
 * Existe porque o hook já falhou exatamente assim: rodava typecheck e lint,
 * os dois reprovavam, e ele saía 0. Husky v9 executa shell puro, sem `set -e`,
 * então um comando que falha no meio não aborta — o hook parecia guardar e
 * não guardava nada. Guard sem auto-teste pode parar de verificar e continuar
 * verde, e isto vale para o hook igual vale para os guards.
 *
 * O teste **não** invoca o hook de verdade: o hook roda `pnpm test`, que
 * rodaria este arquivo, que invocaria o hook. A semântica é verificada num
 * script equivalente, e a presença de `set -e` no arquivo real é verificada
 * estaticamente.
 */

const aqui = dirname(fileURLToPath(import.meta.url));
const hook = join(aqui, "..", "..", ".husky", "pre-push");

function rodar(script) {
  const dir = mkdtempSync(join(tmpdir(), "albora-hook-"));
  const caminho = join(dir, "teste.sh");
  writeFileSync(caminho, script);
  try {
    execFileSync("bash", [caminho], { stdio: "pipe" });
    return 0;
  } catch (e) {
    return e.status ?? 1;
  }
}

describe("pre-push aborta no primeiro comando que falha", () => {
  it("sem `set -e`, o script sai 0 mesmo com falha no meio — o bug original", () => {
    expect(rodar("false\ntrue\n")).toBe(0);
  });

  it("com `set -e`, o script reprova", () => {
    expect(rodar("set -e\nfalse\ntrue\n")).not.toBe(0);
  });

  it("o hook real declara `set -e` antes de qualquer verificação", () => {
    const linhas = readFileSync(hook, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));

    expect(linhas[0]).toBe("set -e");
  });

  it("o hook real roda os guards, typecheck, lint e testes", () => {
    const conteudo = readFileSync(hook, "utf8");

    expect(conteudo).toContain("tools/guards/todos.mjs");
    expect(conteudo).toContain("pnpm typecheck");
    expect(conteudo).toContain("pnpm lint");
    expect(conteudo).toContain("pnpm test");
  });
});
