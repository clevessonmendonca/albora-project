import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const IGNORAR = new Set(["node_modules", "dist", ".next", ".open-next", ".git", ".wrangler"]);

export function arquivos(raiz, extensoes = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".sql"]) {
  const achados = [];

  function andar(dir) {
    let entradas;
    try {
      entradas = readdirSync(dir);
    } catch {
      return;
    }
    for (const nome of entradas) {
      if (IGNORAR.has(nome)) continue;
      const caminho = join(dir, nome);
      const st = statSync(caminho);
      if (st.isDirectory()) andar(caminho);
      else if (extensoes.some((e) => nome.endsWith(e))) achados.push(caminho);
    }
  }

  andar(raiz);
  return achados;
}

export function linhas(caminho) {
  return readFileSync(caminho, "utf8").split("\n");
}

/**
 * Linhas com comentário removido, preservando a numeração.
 *
 * Precisa acompanhar bloco `/* *\/` entre linhas: sem isso o miolo de um
 * comentário de bloco é lido como código, e o guard reprova a própria
 * documentação que explica a regra. Falso positivo em guard é pior que guard
 * ausente — ele ensina o time a afrouxar a regra.
 */
export function linhasDeCodigo(caminho) {
  let dentroDeBloco = false;

  return linhas(caminho).map((linha) => {
    let saida = "";
    let i = 0;

    while (i < linha.length) {
      if (dentroDeBloco) {
        const fim = linha.indexOf("*/", i);
        if (fim === -1) return saida;
        dentroDeBloco = false;
        i = fim + 2;
        continue;
      }
      const abre = linha.indexOf("/*", i);
      const linhaUnica = linha.indexOf("//", i);

      if (linhaUnica !== -1 && (abre === -1 || linhaUnica < abre)) {
        return saida + linha.slice(i, linhaUnica);
      }
      if (abre === -1) return saida + linha.slice(i);

      saida += linha.slice(i, abre);
      dentroDeBloco = true;
      i = abre + 2;
    }

    return saida;
  });
}

/**
 * Uma violação carrega arquivo, linha e o trecho — sem isso o guard vira
 * "reprovou, se vira", e o próximo a mexer afrouxa a regra em vez de corrigir.
 */
export function violacao(raiz, caminho, numero, trecho, motivo) {
  return { arquivo: relative(raiz, caminho), linha: numero + 1, trecho: trecho.trim().slice(0, 100), motivo };
}

export function relatar(nome, violacoes) {
  if (violacoes.length === 0) {
    console.log(`✓ guard ${nome}`);
    return 0;
  }
  console.error(`✗ guard ${nome} — ${violacoes.length} violação(ões)\n`);
  for (const v of violacoes) {
    console.error(`  ${v.arquivo}:${v.linha}`);
    console.error(`    ${v.trecho}`);
    console.error(`    ↳ ${v.motivo}\n`);
  }
  return 1;
}

/** Roda o guard como CLI quando o arquivo é o entrypoint. */
export function cli(nome, verificar) {
  const alvo = process.argv[2] ?? process.cwd();
  process.exit(relatar(nome, verificar(alvo)));
}
