#!/usr/bin/env node
/**
 * Smoke pós-deploy — verifica que o host responde nas rotas críticas.
 *
 * Uso:
 *   node tools/deploy/smoke.mjs https://stable.albora.app
 *
 * Não cria sessão nem upload; só HTTP GET/HEAD nas superfícies públicas.
 */

const alvo = (process.argv[2] ?? process.env.ALVO ?? "").replace(/\/+$/, "");

if (!alvo) {
  console.error("uso: node tools/deploy/smoke.mjs <https://host>");
  process.exit(1);
}

/** @type {{ path: string; expect: number; label: string }[]} */
const rotas = [
  { path: "/", expect: 200, label: "landing" },
  { path: "/admin/sign-in", expect: 200, label: "admin login" },
  { path: "/wall-display", expect: 200, label: "telão" },
];

let falhas = 0;

for (const { path, expect, label } of rotas) {
  const url = `${alvo}${path}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (res.status !== expect) {
      console.error(`✗ ${label}  ${url}  → ${res.status} (esperado ${expect})`);
      falhas += 1;
    } else {
      console.log(`✓ ${label}  ${res.status}`);
    }
  } catch (err) {
    console.error(`✗ ${label}  ${url}  → ${err instanceof Error ? err.message : err}`);
    falhas += 1;
  }
}

if (falhas > 0) {
  process.exit(1);
}

console.log("\nSmoke OK — convidado e upload exigem teste manual ou arnês de carga.");
