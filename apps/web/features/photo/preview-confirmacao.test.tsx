import React from "react";
import fs from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/e/festa-demo/photo",
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(""),
}));

const SAIDA = process.env.PREVIEW_DIR ?? "/tmp/albora-preview";

it.runIf(process.env.PREVIEW === "1")("escreve a confirmação da 1ª foto", async () => {
  const { SuccessStep } = await import("./components/steps/success-step");
  const { marcaVars } = await import("../guest/lib/event-vars");
  const vars = Object.entries(marcaVars("dark") as Record<string, string>)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
  const corpo = renderToStaticMarkup(
    <div style={{ padding: "2rem 1rem", maxWidth: "28rem", margin: "0 auto" }}>
      <SuccessStep uploadId="u" onRestart={() => {}} onViewFeed={() => {}} showPwaInstall onInstallPwa={() => {}} eventId="e" />
    </div>,
  );
  fs.mkdirSync(SAIDA, { recursive: true });
  fs.writeFileSync(
    `${SAIDA}/body-confirmacao.html`,
    `<style>#guest-root { ${vars} min-height: 100dvh; }</style><div class="guest-tema superficie-de-acao" id="guest-root">${corpo}</div>`,
  );
});
