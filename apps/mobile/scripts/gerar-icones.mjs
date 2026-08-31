import { mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * Rasteriza o ícone canônico de brand/ para PNGs do Expo.
 * Artefato de build — rode antes de `eas build` (hook eas-build-pre-install).
 */

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..");
const assets = join(raiz, "assets");
const svgPath = join(raiz, "..", "..", "brand", "icones", "icone-app-512.svg");

mkdirSync(assets, { recursive: true });

const svg = readFileSync(svgPath);

const iconPath = join(assets, "icon.png");
const adaptivePath = join(assets, "adaptive-icon.png");
const splashPath = join(assets, "splash-icon.png");

await sharp(svg).resize(1024, 1024).png().toFile(iconPath);
await sharp(svg).resize(1024, 1024).png().toFile(adaptivePath);

const splashW = 1284;
const splashH = 2778;
const iconBuf = await sharp(svg).resize(420, 420).png().toBuffer();
await sharp({
  create: {
    width: splashW,
    height: splashH,
    channels: 4,
    background: { r: 12, g: 10, b: 9, alpha: 1 },
  },
})
  .composite([{ input: iconBuf, gravity: "center" }])
  .png()
  .toFile(splashPath);

for (const p of [iconPath, adaptivePath, splashPath]) {
  console.log(`  ${p.split("/").pop()}  ${(statSync(p).size / 1024).toFixed(1)} kB`);
}
