import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const directory = dirname(fileURLToPath(import.meta.url));
const pagePath = resolve(directory, "preview.html");
const outputDirectory = resolve(directory, "cards");

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });

await page.goto(pathToFileURL(pagePath).href, { waitUntil: "networkidle" });

for (const index of ["01", "02", "03", "04", "05", "06"]) {
  await page.locator(`#slide-${index}`).screenshot({ path: resolve(outputDirectory, `${index}.png`) });
}

await browser.close();
