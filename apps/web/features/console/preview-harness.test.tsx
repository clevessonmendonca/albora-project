import React from "react";
import fs from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { it, vi } from "vitest";
import type { Actor } from "@albora/core";

vi.mock("next/navigation", () => ({
  usePathname: () => "/console",
  useRouter: () => ({ push: () => {} }),
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("@/features/console/actions", () => ({ signOutAction: () => {}, searchConsoleAction: async () => [] }));

import { ConsoleShell } from "./components/server/console-shell";
import { ConsolePeriodo } from "./components/client/console-periodo";
import {
  CabecalhoDaVisaoGeral,
  EventosAoVivo,
  FaixaDeMetricas,
  FilaDeAtencao,
  FunilComercial,
  PainelH1,
} from "./components/server/overview-sections";
import { funilComercial, maiorPerdaComercial } from "@albora/core";

const actor: Actor = {
  staffUserId: "clevesson",
  roles: ["owner"],
  sessionId: "s",
  requestId: "r",
  reauthenticatedAt: null,
};

const PENDENCIAS = [
  { id: "1", severidade: "critico" as const, titulo: "2 tickets estouraram o SLA", detalhe: "o mais antigo venceu há 6h20 · assessoria Bela Vista", modulo: "Suporte", href: "/console/support" },
  { id: "2", severidade: "critico" as const, titulo: "1 pedido LGPD vencido — prazo legal", detalhe: "exclusão de dados · venceu há 14h", modulo: "LGPD", href: "/console/lgpd" },
  { id: "3", severidade: "atencao" as const, titulo: "3 job(s) de retenção falhado(s)", detalhe: "nenhuma exclusão do dia 365 entre eles", modulo: "Retenção", href: "/console/retention" },
  { id: "4", severidade: "atencao" as const, titulo: "1 assinatura de fornecedor em atraso", detalhe: "cobrança não confirmada pelo provedor", modulo: "Assinaturas", href: "/console/subscriptions" },
];

const SERIE = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-08-${String(i + 1).padStart(2, "0")}`,
  rate: 0.3 + Math.sin(i / 4) * 0.07 + i * 0.004,
}));

const FUNIL = funilComercial({
  account_created: 1240, event_created: 890, qr_downloaded: 812, checkout_started: 640, checkout_paid: 512,
});

const AO_VIVO = [
  { id: "a", title: "Ana & João", h1: 0.44, totalFotos: 247 },
  { id: "b", title: "15 anos Duda", h1: 0.51, totalFotos: 388 },
  { id: "c", title: "Marina & Rafa", h1: 0.38, totalFotos: 156 },
  { id: "d", title: "Formatura Med", h1: 0.29, totalFotos: 92 },
  { id: "e", title: "Bodas Léa", h1: 0.62, totalFotos: 431 },
] as never[];

/**
 * Harness de conferência visual, não teste: renderiza os componentes reais
 * com dados de exemplo e escreve o HTML que `tools/preview/montar.mjs`
 * combina com o CSS compilado de verdade.
 *
 * Fica atrás de `PREVIEW=1` porque não afirma nada — CI verde com ele ligado
 * não significa que a tela está certa, e teste que não pode falhar é ruído
 * na suíte.
 */
it.skipIf(!process.env["PREVIEW"])("gera preview", async () => {
  const corpo = renderToStaticMarkup(
    <ConsoleShell actor={actor} periodo={<ConsolePeriodo />} counts={{ "/console/support": { count: 2, critico: true }, "/console/lgpd": { count: 1, critico: true }, "/console/retention": { count: 3 } }}>
      <CabecalhoDaVisaoGeral janela="Nos últimos 30 dias" pendencias={PENDENCIAS.length} criticas={2} />
      <FilaDeAtencao itens={PENDENCIAS} />
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(18rem,22rem)_1fr]">
        <PainelH1 atual={0.44} serie={SERIE} />
        <div className="flex flex-col gap-4">
          <FaixaDeMetricas
            metricas={[
              { rotulo: "Receita recorrente", valor: "R$ 18.400", nota: "38 assinatura(s) ativa(s)" },
              { rotulo: "Churn estimado", valor: "≈ 3", nota: "última atualização do registro" },
              { rotulo: "Eventos ativos", valor: "127", nota: "+6% vs. período anterior" },
              { rotulo: "Convidados no período", valor: "18.320", nota: "+11% vs. período anterior" },
            ]}
          />
          <FunilComercial degraus={FUNIL} perda={maiorPerdaComercial(FUNIL)} />
        </div>
      </div>
      <EventosAoVivo eventos={AO_VIVO} />
    </ConsoleShell>,
  );

  fs.mkdirSync("/tmp/albora-preview", { recursive: true });
  fs.writeFileSync("/tmp/albora-preview/body.html", corpo);
  console.log("PREVIEW_BYTES", corpo.length);
}, 120_000);
