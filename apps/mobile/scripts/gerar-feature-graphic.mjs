import { mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * Feature graphic 1024×500 para Google Play (task 017).
 * Artefato em `store/` — versionado opcionalmente; script regenera.
 */

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..");
const store = join(raiz, "store");
const svgPath = join(raiz, "..", "..", "brand", "icones", "icone-app-512.svg");

mkdirSync(store, { recursive: true });

const W = 1024;
const H = 500;
const svg = readFileSync(svgPath);
const iconBuf = await sharp(svg).resize(280, 280).png().toBuffer();

const out = join(store, "feature-graphic.png");
await sharp({
  create: {
    width: W,
    height: H,
    channels: 4,
    background: { r: 12, g: 10, b: 9, alpha: 1 },
  },
})
  .composite([{ input: iconBuf, gravity: "center" }])
  .png()
  .toFile(out);

console.log(`  feature-graphic.png  ${(statSync(out).size / 1024).toFixed(1)} kB`);
