/** Captura os fragments do harness com fontes e imagens reais, sem banco ou servidor. */
/* global document, innerWidth -- callbacks de page.evaluate rodam no navegador. */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const repo = path.resolve(import.meta.dirname, "../..");
const output = process.env.PREVIEW_DIR ?? "/tmp/albora-preview";
const publicDir = path.join(repo, "apps/web/public");
const targets = process.argv.slice(2);
if (!targets.length) throw new Error("Informe as páginas geradas, como criacao-tipo.html.");
const mime = { ".html": "text/html", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage();
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://albora-preview.local") return route.abort();
    const isPage = url.pathname.startsWith("/preview/");
    const root = isPage ? output : publicDir;
    const relative = decodeURIComponent(isPage ? url.pathname.slice(9) : url.pathname.slice(1));
    const file = path.resolve(root, relative);
    if (!file.startsWith(path.resolve(root) + path.sep)) return route.abort();
    try {
      await route.fulfill({ body: await fs.readFile(file), contentType: mime[path.extname(file)] ?? "application/octet-stream" });
    } catch {
      await route.fulfill({ status: 404, body: "Arquivo ausente" });
    }
  });
  for (const target of targets) {
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`http://albora-preview.local/preview/${encodeURIComponent(path.basename(target))}`);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(async () => {
        await Promise.all([...document.images].map(async (img) => {
          img.loading = "eager";
          try { await img.decode(); } catch { /* O relatório abaixo identifica a imagem ausente. */ }
        }));
      });
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        brokenImages: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).length,
      }));
      const screenshot = path.join(output, `${path.basename(target, ".html")}-${width}.png`);
      await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled" });
      console.log(JSON.stringify({ target, width, ...metrics, screenshot }));
    }
  }
} finally {
  await browser.close();
}
