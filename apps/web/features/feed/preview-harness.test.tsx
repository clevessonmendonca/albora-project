import React from "react";
import fs from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/e/festa-demo/feed",
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(""),
}));

const SAIDA = process.env.PREVIEW_DIR ?? "/tmp/albora-preview";

it.runIf(process.env.PREVIEW === "1")("escreve os fragmentos do feed e da faixa", async () => {
  const { Post } = await import("./components/client/post");
  const { CartaoProximaMissao } = await import("./components/ui/cartao-proxima-missao");
  const { marcaVars } = await import("../guest/lib/event-vars");
  const { VejaOAlboraAcontecer } = await import(
    "../admin/components/client/home/veja-o-albora-acontecer"
  );
  const { adminVars } = await import("../admin/components/server/admin-shell");

  const vars = Object.entries(marcaVars("dark") as Record<string, string>)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");

  const feed = renderToStaticMarkup(
    <div className="mx-auto max-w-md p-5">
      <CartaoProximaMissao
        rotulo="Próxima missão"
        missao={{ id: "m", title: "Uma foto com a turma", emoji: null, href: "#" }}
      />
      <Post
        uploadId="p1"
        interacao="completo"
        url="/onboarding/photo-01.webp"
        autor="Bia"
        legenda={null}
        lugar="Salão"
        momento="A recepção"
        criadaEm="2026-10-12T21:30:00.000Z"
      />
    </div>,
  );

  fs.mkdirSync(SAIDA, { recursive: true });
  fs.writeFileSync(
    `${SAIDA}/body-feed-momento-missao.html`,
    `<style>#guest-root { ${vars} min-height: 100dvh; }</style><div class="guest-tema superficie-de-acao" id="guest-root">${feed}</div>`,
  );

  const avars = Object.entries(adminVars()).map(([k, v]) => `${k}:${v}`).join(";");
  fs.writeFileSync(
    `${SAIDA}/body-home-faixa.html`,
    `<style>:root{${avars}}</style><main class="mx-auto min-h-dvh max-w-[90rem] bg-bg p-4 font-corpo text-ink sm:p-8">${renderToStaticMarkup(<VejaOAlboraAcontecer />)}</main>`,
  );
});
