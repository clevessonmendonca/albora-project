import { dirname, relative, resolve } from "node:path";
import { arquivos, cli, linhasDeCodigo, violacao } from "./util.mjs";

/**
 * Guard de camadas — ADR 0016.
 *
 * `core` é domínio puro: nunca importa `@albora/db`, `@albora/application`
 * nem `next`, e nenhum import relativo escapa de `packages/core/src`. A rota
 * do console fala só com `@albora/application`, nunca direto com `@albora/db`.
 * E comparação de papel de staff (`role === "owner"` etc.) fica confinada a
 * `packages/core/src/authorization` — em qualquer outro lugar, permissão
 * passa por capacidade, não por literal espalhado pelo código.
 *
 * A regra 3 varre só as superfícies que este projeto cria — não o repo
 * inteiro. `role === "owner"` já existe legitimamente fora daqui (ex.:
 * apps/web/features/admin/data/load-event-page.ts, onde `role` é
 * `HostEventRole`, papel do anfitrião no próprio evento, não `StaffRole`) e
 * varrer tudo reprovaria código correto — falso positivo em guard é pior que
 * guard ausente, porque ensina o time a ignorar o CI.
 */

const CORE = "packages/core/src";
const CORE_AUTHORIZATION = `${CORE}/authorization`;
// A borda do console é MAIOR que `app/console`: server actions vivem em
// `features/console` e a sessão em `lib/console`. Cobrir só a rota deixou
// passar um `findStaffById` importado direto do repositório numa server
// action (achado na verificação da Onda C).
//
// `apps/web/lib/console` fica DE FORA: é o adaptador de infraestrutura que o
// próprio ADR 0016 define como "sessão, cookie, adaptação request → Actor", e
// resolver cookie contra `staff_sessions` é exatamente o trabalho dele.
// Forçá-lo pela aplicação faria a camada de aplicação possuir resolução de
// cookie — mistura de responsabilidade, não separação.
const CONSOLE_BORDA = ["apps/web/app/console", "apps/web/features/console"];

// `import type` é apagado na compilação e não cria dependência de runtime —
// a borda pode conhecer a FORMA de uma linha sem poder falar com o banco.
const IMPORT_DE_TIPO_RE = /^\s*import\s+type\s|^\s*export\s+type\s/;

const SUPERFICIES_DE_PAPEL = ["apps/web/app/console", "apps/web/features/console", "apps/web/lib/console", "packages/application", CORE];

const IMPORT_RE = /from\s+["']([^"']+)["']/;
const PAPEL_LITERAL = /\b(role|papel)\s*===\s*["'](owner|support|finance|compliance|engineering)["']/;

export function verificar(raiz) {
  const violacoes = [];

  for (const caminho of arquivos(`${raiz}/${CORE}`, [".ts", ".tsx"])) {
    linhasDeCodigo(caminho).forEach((linha, i) => {
      const m = IMPORT_RE.exec(linha);
      if (!m) return;
      const especificador = m[1];

      if (/^@albora\/db(\/|$)/.test(especificador)) {
        violacoes.push(violacao(raiz, caminho, i, linha, "packages/core importando @albora/db — core é domínio puro, nunca toca persistência"));
      } else if (/^@albora\/application(\/|$)/.test(especificador)) {
        violacoes.push(violacao(raiz, caminho, i, linha, "packages/core importando @albora/application — a dependência é application → core, nunca o contrário"));
      } else if (especificador === "next" || especificador.startsWith("next/")) {
        violacoes.push(violacao(raiz, caminho, i, linha, "packages/core importando next — core não conhece o framework de rota"));
      } else if (especificador.startsWith(".")) {
        const alvo = resolve(dirname(caminho), especificador);
        const raizCore = resolve(raiz, CORE);
        if (relative(raizCore, alvo).startsWith("..")) {
          violacoes.push(violacao(raiz, caminho, i, linha, "import relativo saindo de packages/core/src"));
        }
      }
    });
  }

  for (const borda of CONSOLE_BORDA) {
    for (const caminho of arquivos(`${raiz}/${borda}`, [".ts", ".tsx"])) {
      linhasDeCodigo(caminho).forEach((linha, i) => {
        if (IMPORT_DE_TIPO_RE.test(linha)) return;
        const m = IMPORT_RE.exec(linha);
        if (m && /^@albora\/db(\/|$)/.test(m[1])) {
          violacoes.push(violacao(raiz, caminho, i, linha, `${borda} importando VALOR de @albora/db — a borda fala só com @albora/application (import type é permitido)`));
        }
      });
    }
  }

  const raizAuthorization = resolve(raiz, CORE_AUTHORIZATION);
  for (const superficie of SUPERFICIES_DE_PAPEL) {
    for (const caminho of arquivos(`${raiz}/${superficie}`, [".ts", ".tsx"])) {
      if (resolve(caminho).startsWith(`${raizAuthorization}/`)) continue;
      linhasDeCodigo(caminho).forEach((linha, i) => {
        if (PAPEL_LITERAL.test(linha)) {
          violacoes.push(violacao(raiz, caminho, i, linha, "comparação de papel fora de packages/core/src/authorization — permissão passa por capacidade, não por role ==="));
        }
      });
    }
  }

  return violacoes;
}

if (import.meta.url === `file://${process.argv[1]}`) cli("camadas", verificar);
