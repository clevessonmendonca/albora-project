export type RedirecionamentoPermanente = { source: string; destination: string; permanent: true };

/**
 * Onda D, T1 — `/ops` (só-leitura, sem mutação) fica redirecionado pro
 * `/console` equivalente. Redirect aqui, NUNCA remoção de arquivo: os
 * `page.tsx` de `apps/web/app/ops/**` continuam no repositório até a T2,
 * que só pode removê-los DEPOIS da migration 0064 derrubar
 * `ops_ticket_lista` — senão um deploy intermediário fica com rota morta
 * (redirecionada, nunca mais alcançável) e policy viva ao mesmo tempo, sem
 * ordem de dependência entre os dois. O redirect roda em `next.config.ts`,
 * ANTES de qualquer `page.tsx` ser resolvido — os seis destinos abaixo já
 * ficam inalcançáveis a partir desta task, mesmo com os arquivos ainda ali.
 *
 * `/ops/e/:slug` e `/ops/e/:slug/painel` não têm equivalente por slug em
 * `/console` (que navega por `id` — ver
 * `apps/web/app/console/(shell)/events/[id]/page.tsx`). Em vez de inventar
 * uma tela ou uma resolução de slug→id só para o redirect, os dois vão
 * para a lista `/console/events` — a mais próxima que existe de verdade.
 * Achado de reconhecimento da Onda D, registrado no plano.
 *
 * `/api/ops/retencao` e `/api/ops/analytics-snapshots` NÃO entram aqui —
 * são endpoints de cron de produção (`.github/workflows/retention-cron.yml`
 * chama o primeiro todo dia às 4h), sem relação com `platform_operators`
 * nem com as telas de `/ops`. O prefixo de caminho é coincidência.
 */
export const OPS_TO_CONSOLE_REDIRECTS: RedirecionamentoPermanente[] = [
  { source: "/ops", destination: "/console", permanent: true },
  { source: "/ops/insights", destination: "/console", permanent: true },
  { source: "/ops/support", destination: "/console/support", permanent: true },
  { source: "/ops/events", destination: "/console/events", permanent: true },
  { source: "/ops/e/:slug", destination: "/console/events", permanent: true },
  { source: "/ops/e/:slug/painel", destination: "/console/events", permanent: true },
];
