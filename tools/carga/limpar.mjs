/**
 * Apaga o que uma execução criou — as linhas e os objetos, nesta ordem.
 *
 * Só apaga o que está no JSON da execução. Nunca varre o evento: o evento de
 * teste tem dado semeado que ninguém quer perder, e uma limpeza que apaga por
 * prefixo é a mesma ferramenta que apagaria um casamento inteiro se alguém
 * digitasse o id errado.
 *
 *   node tools/carga/limpar.mjs tools/carga/execucoes/<arquivo>.json
 */

import { readFileSync } from "node:fs";
import { abrir, apagarExecucao, urlDoBanco } from "./banco.mjs";
import { apagarObjeto, credenciaisDoAmbiente, objetoExiste } from "./r2.mjs";
import { ehLocal, guardarAlvo } from "./config.mjs";

async function principal() {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error("uso: node tools/carga/limpar.mjs <execucao.json>");
    process.exit(2);
  }

  const execucao = JSON.parse(readFileSync(caminho, "utf8"));
  const { alvo, evento, criados } = execucao;

  // A mesma guarda da execução: apagar em produção por descuido é pior que
  // subir em produção por descuido.
  guardarAlvo(alvo, process.env.CARGA_CONFIRMO_ALVO);

  console.log(`execução  ${caminho}`);
  console.log(`alvo      ${alvo}${ehLocal(alvo) ? " (local)" : ""}`);
  console.log(`evento    ${evento.slug}  ${evento.id}`);
  console.log(
    `criados   ${criados.uploadIds.length} uploads · ${criados.sessaoIds.length} sessões · ${criados.chaves.length} chaves\n`,
  );

  const url = urlDoBanco(process.env);
  if (!url) {
    console.log("banco     PULADO — sem DATABASE_URL no ambiente");
  } else {
    const pool = abrir(url);
    try {
      const r = await apagarExecucao(pool, evento.id, criados);
      console.log(
        `banco     ${r.uploads} uploads · ${r.sessoes} sessões · ${r.tokens} tokens apagados`,
      );
    } finally {
      await pool.end();
    }
  }

  const cred = credenciaisDoAmbiente(process.env);
  if (!cred) {
    console.log("storage   PULADO — sem R2_* no ambiente. Os objetos continuam no bucket.");
    return;
  }

  let apagados = 0;
  let sobraram = 0;
  for (const chave of criados.chaves) {
    for (const variante of ["full", "thumb"]) {
      const r = await apagarObjeto(cred, `${chave}/${variante}`);
      if (r.ok) apagados += 1;
      else sobraram += 1;
    }
  }

  // Prova, não declaração: confere uma amostra em vez de confiar no 204.
  const amostra = criados.chaves.slice(0, 3);
  const teimosos = [];
  for (const chave of amostra) {
    if (await objetoExiste(cred, `${chave}/full`)) teimosos.push(chave);
  }

  console.log(`storage   ${apagados} objetos apagados · ${sobraram} recusados`);
  console.log(
    teimosos.length === 0
      ? `          amostra de ${amostra.length} conferida: sumiram`
      : `          AINDA EXISTEM: ${teimosos.join(", ")}`,
  );

  if (sobraram > 0 || teimosos.length > 0) process.exitCode = 1;
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
