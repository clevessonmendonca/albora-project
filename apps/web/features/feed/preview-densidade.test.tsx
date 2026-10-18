import React from "react";
import fs from "node:fs";
import { render, cleanup } from "@testing-library/react";
import { it, vi, afterEach } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push() {}, refresh() {} }),
  usePathname: () => "/e/festa",
}));
vi.mock("@/lib/media", async (orig) => ({
  ...((await orig()) as object),
  mediaUrls: async (keys: string[]) => {
    const m = new Map();
    keys.forEach((k, i) => m.set(k, { url: `/onboarding/photo-0${(i % 8) + 1}.webp`, expiraEm: Date.now() + 3600000 }));
    return m;
  },
}));
const w = window as unknown as Record<string, unknown>;
w.matchMedia ??= (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
w.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
w.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
Element.prototype.scrollIntoView ??= function () {};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const SAIDA = process.env.PREVIEW_DIR ?? "/tmp/albora-preview";
const agora = Date.now();
const itens = Array.from({ length: 9 }, (_, i) => ({
  id: String(i),
  chaveThumb: `k${i}`,
  chaveFull: `f${i}`,
  mime: "image/webp",
  autor: ["Mariana", "Lucas", "Bia"][i % 3],
  legenda: i % 2 ? "Que noite" : null,
  lugar: null,
  criadaEm: new Date(agora - i * 900000).toISOString(),
  largura: 900,
  altura: i % 2 ? 1200 : 900,
  reacoes: i,
  minhaReacao: null,
  minha: i === 0,
  sessaoAutor: "s" + i,
}));

for (const modo of ["completo", "espelho"] as const)
  it.runIf(process.env.PREVIEW === "1")("feed " + modo, async () => {
    const { marcaVars } = await import("../guest/lib/event-vars");
    const vars = Object.entries(marcaVars("dark") as Record<string, string>)
      .map(([k, v]) => `${k}: ${v};`)
      .join(" ");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ itens, proximoCursor: null, interacao: modo }))),
    );
    const { FeedPage } = await import("./components/client/feed-page");
    const r = render(
      <FeedPage
        slug="festa"
        eventTitle="Ana & João"
        missions={[]}
        copy={{ missionTitle: "Missão" }}
        cameraPath="/e/festa/photo"
        hostMessageLabel="Recado dos noivos"
        anfitriaoPlural="noivos"
        eventoId="e"
        sessaoId="s"
      />,
    );
    await new Promise((res) => setTimeout(res, 800));
    fs.mkdirSync(SAIDA, { recursive: true });
    fs.writeFileSync(
      `${SAIDA}/body-feed-${modo}.html`,
      `<style>#guest-root { ${vars} min-height: 100dvh; }</style><div class="guest-tema superficie-de-acao" id="guest-root">${r.container.innerHTML}</div>`,
    );
  }, 30000);
