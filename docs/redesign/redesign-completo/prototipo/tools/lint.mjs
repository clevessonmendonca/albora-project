// Lint determinístico do protótipo: espaçamento fora da escala, tamanhos de fonte fora do sistema, hex, cromo com --ev, durações fora dos tokens.
// Uso: node tools/lint.mjs [arquivo.js ...]  (sem argumentos: todos os módulos). Saída: contagem por regra e por arquivo; --verbose lista as ocorrências.
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const verbose = process.argv.includes('--verbose');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const files = args.length ? args : fs.readdirSync(dir).filter((f) => /^(host-.*|guest|wall|vendor|console)\.js$/.test(f));
const SCALE = new Set([0, 1, 2, 3, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64]);
const FS_OK = new Set([12, 14, 16, 18, 22]); // + tokens var(--fs-*) e clamp()
const rules = [
  { id: 'espaco', re: /\b(margin(?:-(?:top|bottom|left|right|inline|block)[a-z-]*)?|padding(?:-(?:top|bottom|left|right|inline|block)[a-z-]*)?|gap|row-gap|column-gap)\s*:\s*([^;}"'`]+)/g,
    test: (m) => [...m[2].matchAll(/(-?\d+(?:\.\d+)?)px/g)].some((x) => !SCALE.has(Math.abs(+x[1]))), msg: 'espaçamento fora da escala (use var(--space-N))' },
  { id: 'fonte', re: /\bfont-size\s*:\s*([^;}"'`]+)/g, test: (m) => { const v = m[1].trim(); if (/var\(|clamp\(|inherit|em\b|rem\b/.test(v)) return false; const n = parseFloat(v); return !FS_OK.has(n); }, msg: 'font-size fora do sistema (use --fs-*)' },
  { id: 'hex', re: /#[0-9a-fA-F]{3,8}\b(?![0-9a-zA-Z-])/g, test: (m, line) => !/(href|src|id=)|\burl\(|\$\{|#\/|#main|#root|\w#/.test(line.slice(Math.max(0, m.index - 12), m.index + 1)) && !/^#(main|root)/.test(m[0]), msg: 'hex em módulo (use token)' },
  { id: 'ev-cromo', re: /var\(--ev\)/g, test: () => true, msg: 'var(--ev) — só para o que é do evento (capa, monograma, prévia); cromo = --ac' },
  { id: 'duracao', re: /\b(?:transition|animation)[^;}"'`]*?(\d*\.?\d+)(ms|s)\b/g, test: (m) => { const ms = m[2] === 's' ? +m[1] * 1000 : +m[1]; return ![0.01, 120, 200, 320].includes(ms) && ms > 1; }, msg: 'duração fora dos tokens 120/200/320 ms' },
];
let total = 0; const out = {};
for (const f of files) {
  const p = path.isAbsolute(f) ? f : path.join(dir, f); if (!fs.existsSync(p)) continue;
  const lines = fs.readFileSync(p, 'utf8').split('\n'); out[f] = {};
  lines.forEach((line, i) => rules.forEach((r) => { r.re.lastIndex = 0; let m; while ((m = r.re.exec(line))) { if (r.test(m, line)) { out[f][r.id] = (out[f][r.id] || 0) + 1; total++; if (verbose) console.log(`${path.basename(f)}:${i + 1} [${r.id}] ${m[0].slice(0, 90)}`); } } }));
}
console.log(JSON.stringify(out, null, 1)); console.log('total', total);
process.exitCode = total ? 1 : 0;
