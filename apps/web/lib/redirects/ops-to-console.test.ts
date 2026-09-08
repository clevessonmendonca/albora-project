import { describe, expect, it } from "vitest";
import { OPS_TO_CONSOLE_REDIRECTS } from "./ops-to-console";

describe("OPS_TO_CONSOLE_REDIRECTS", () => {
  it("tem as seis rotas de página do /ops antigo, e nenhuma outra", () => {
    expect(OPS_TO_CONSOLE_REDIRECTS).toHaveLength(6);
  });

  it("redireciona pra o equivalente direto em /console", () => {
    const porOrigem = Object.fromEntries(OPS_TO_CONSOLE_REDIRECTS.map((r) => [r.source, r]));
    expect(porOrigem["/ops"]?.destination).toBe("/console");
    expect(porOrigem["/ops/insights"]?.destination).toBe("/console");
    expect(porOrigem["/ops/support"]?.destination).toBe("/console/support");
    expect(porOrigem["/ops/events"]?.destination).toBe("/console/events");
  });

  it("rotas por slug (sem equivalente em /console, que navega por id) vão pra lista de eventos, não pra uma tela inventada", () => {
    const porOrigem = Object.fromEntries(OPS_TO_CONSOLE_REDIRECTS.map((r) => [r.source, r]));
    expect(porOrigem["/ops/e/:slug"]?.destination).toBe("/console/events");
    expect(porOrigem["/ops/e/:slug/painel"]?.destination).toBe("/console/events");
  });

  it("todas são permanentes — bookmark antigo aprende o caminho novo, não fica preso num redirect temporário", () => {
    for (const r of OPS_TO_CONSOLE_REDIRECTS) expect(r.permanent).toBe(true);
  });

  it("nenhuma origem repete a de /api/ops/retencao ou /api/ops/analytics-snapshots — esses são cron de produção, não telas de /ops", () => {
    const origens = OPS_TO_CONSOLE_REDIRECTS.map((r) => r.source);
    expect(origens).not.toContain("/api/ops/retencao");
    expect(origens).not.toContain("/api/ops/analytics-snapshots");
    expect(origens).not.toContain("/api/ops/support");
  });
});
