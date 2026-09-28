import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { arquivos, cli, linhas } from "./util.mjs";

/**
 * Guard servidor-no-cliente.
 *
 * Um módulo alcançável a partir de um arquivo `"use client"` não pode importar
 * `next/headers` nem `server-only`. O bundler resolve o grafo inteiro, não só o
 * arquivo de entrada: basta um import a três saltos de distância para o build
 * de produção falhar.
 *
 * Existe porque foi assim que a `stable` quebrou (PR #92): `admin-shell.tsx`
 * ganhou `next/headers` para ler o cookie de tema, e ele era importado por 36
 * componentes `"use client"`. Typecheck, lint e testes passaram — só `next
 * build` reprova, e tarde.
 */

const SERVER_ONLY = ["next/headers", "server-only"];
const WEB = "apps/web";
const EXTENSOES = [".ts", ".tsx", ".js", ".jsx"];

function resolverModulo(raiz, origem, especificador) {
  let base;
  if (especificador.startsWith("@/")) base = resolve(raiz, WEB, especificador.slice(2));
  else if (especificador.startsWith(".")) base = resolve(dirname(origem), especificador);
  else return null;

  for (const e of EXTENSOES) {
    if (existsSync(base + e)) return base + e;
  }
  for (const e of EXTENSOES) {
    if (existsSync(resolve(base, "index" + e))) return resolve(base, "index" + e);
  }
  return existsSync(base) && EXTENSOES.some((e) => base.endsWith(e)) ? base : null;
}

function importsDe(caminho) {
  const texto = readFileSync(caminho, "utf8");
  const achados = [];
  for (const m of texto.matchAll(/(?:^|\n)\s*(?:import|export)[^;\n]*?from\s*["']([^"']+)["']/g)) {
    achados.push(m[1]);
  }
  for (const m of texto.matchAll(/(?:^|\n)\s*import\s*["']([^"']+)["']/g)) {
    achados.push(m[1]);
  }
  return achados;
}

function diretiva(caminho, qual) {
  for (const linha of linhas(caminho).slice(0, 5)) {
    if (new RegExp(`^\\s*["']use ${qual}["']`).test(linha)) return true;
  }
  return false;
}

const ehCliente = (c) => diretiva(c, "client");

/**
 * `"use server"` é fronteira de RPC: o cliente recebe um stub, nunca o corpo.
 * A travessia para aqui — seguir em frente acusaria todo `next/headers` legítimo
 * de server action, e guard que grita em código correto ensina o time a ignorar o CI.
 */
const ehFronteira = (c) => diretiva(c, "server");

export function verificar(raiz) {
  const violacoes = [];

  for (const entrada of arquivos(resolve(raiz, WEB), [".ts", ".tsx"])) {
    if (!ehCliente(entrada)) continue;

    const visitados = new Set([entrada]);
    const fila = [{ caminho: entrada, trilha: [] }];

    while (fila.length > 0) {
      const { caminho, trilha } = fila.shift();

      for (const especificador of importsDe(caminho)) {
        if (SERVER_ONLY.includes(especificador)) {
          const rota = [relative(raiz, entrada), ...trilha.map((t) => relative(raiz, t))];
          violacoes.push({
            arquivo: relative(raiz, caminho),
            linha: 1,
            trecho: `import … from "${especificador}"`,
            motivo:
              `alcançado a partir de "use client" por ${rota.join(" → ")}` +
              ` → ${relative(raiz, caminho)}; o build de produção reprova.`,
          });
          continue;
        }

        const alvo = resolverModulo(raiz, caminho, especificador);
        if (!alvo || visitados.has(alvo)) continue;
        visitados.add(alvo);
        if (ehFronteira(alvo)) continue;
        fila.push({ caminho: alvo, trilha: [...trilha, caminho] });
      }
    }
  }

  return violacoes;
}

if (import.meta.url === `file://${process.argv[1]}`) cli("servidor-no-cliente", verificar);
