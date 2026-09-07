# Ida para produção — design

**Data:** 2026-09-04
**Sub-projeto:** A — Ida para produção (ver [`2026-09-04-paralelismo-contrato.md`](./2026-09-04-paralelismo-contrato.md))
**Branch:** `docs/roadmap-paralelo`, ramificada de `stable` (95b6871)

## 1. O problema

O Albora está funcionalmente completo para o MVP e **nunca rodou fora de localhost**. `docs/architecture.md` §16 lista isso explicitamente na tabela do que ainda não existe: "Produção (Workers + R2 + Neon + Resend) | ADR 0006, roadmap A5 | Roda em localhost" e "Carga 150/20 min contra infra de produção | spec 012 | Ferramenta `pnpm carga` existe; falta a prova".

`docs/product/plano-implementacao-produto.md` §2 confirma que isso é o item de maior prioridade do produto: **N2** (deploy produção) e **N3** (carga 150/20 em infra prod) estão na lista "NOW — Bloqueia o 1º casamento real", ao lado de N1 (prova física de QR), N4 (parecer jurídico) e N5 (procedimento de menores) — nenhum dos quais este sub-projeto resolve.

O que **já existe** e este documento não repete do zero:

- `docs/runbooks/deploy-producao.md` — checklist de deploy N2, com comandos `cf:preview`/`cf:deploy`, tabela de secrets GitHub e ladder de promoção.
- `docs/runbooks/carga-producao.md` — runbook N3 completo: comando, critérios de aprovação, registro em `docs/runbooks/carga-registros/`.
- `.github/workflows/deploy-stable.yml` — dispara `pnpm cf:deploy` para o ambiente `stable`, com confirmação manual (`workflow_dispatch` + `if: inputs.confirm == 'deploy-stable'`) e smoke opcional via `tools/deploy/smoke.mjs`.
- `.github/workflows/carga.yml` — perfil `fumaca` (roda em CI, contra Postgres service + dev local) e perfil `gate` (o portão completo, ~25 min, ainda precisa de alvo remoto real).
- `.github/workflows/backup.yml` — dump semanal de homol; dump de produção sob `workflow_dispatch` com `inputs.alvo == production`, atrás de um GitHub Environment com approval.
- `.github/workflows/security.yml` — `pnpm audit --audit-level=high` em PR, push e cron semanal.
- `apps/web/app/api/health/{route.ts,live/route.ts,ready/route.ts}` — health check já implementado (`ready` sonda o banco via `probeDatabase()`).
- `@sentry/nextjs` já é dependência de `apps/web/package.json`.
- `apps/web/wrangler.jsonc` já declara `observability.enabled: true` e o binding de fila `DRIVE_EXPORT_QUEUE`.

O que este documento resolve é a **lacuna entre esse material e uma promoção real stable → homol → main**: não existe hoje nenhum ambiente nomeado no `wrangler.jsonc` (`env.homol` / `env.prod`), nenhum workflow que deploie homol ou main (só `deploy-stable.yml` existe), as variáveis do gateway de pagamento não estão nos templates de `.env`, e vários runbooks já escritos apontam para arquivos que ainda não foram criados. Este spec organiza a sequência, separa o que um agente pode preparar do que só o dono pode executar, e registra essas lacunas como decisão explícita — não como suposição.

## 2. O que este projeto NÃO é

- **Não é o pipeline de CI.** `.github/workflows/ci.yml`, `vitest.config.*` e os gates de cobertura pertencem ao sub-projeto B ("Gates de CI"), conforme `2026-09-04-paralelismo-contrato.md`. Este documento não propõe mudança em `ci.yml`; qualquer necessidade vira pedido para aquele stream.
- **Não cria migration.** Numeração de migration é serial e reservada por outros streams (Console CEO em 0059–0061, Moderação em 0062–0064, Curadoria em 0065–0069). Se a ida para produção precisar de uma migration (não precisou até aqui), o pedido vai para quem tem a faixa livre (0070+).
- **Não é a publicação em loja de app nem universal links.** `docs/runbooks/publicacao-lojas.md` e `docs/runbooks/universal-links.md` cobrem o app Expo (task 017), que `docs/architecture.md` §16 marca como "Parcial" e fora do caminho crítico do convidado web. É Fase B/C do produto, não bloqueio do 1º casamento.
- **Não é o parecer jurídico nem o procedimento de menores.** N4 (controlador vs. operador LGPD) e N5 (procedimento ADR 0012) têm dono Legal/Fundador, não engenharia — este spec os cita como bloqueio paralelo, não como trabalho próprio.
- **Não é redesign de UI, console CEO, moderação real nem curadoria do livro.** Esses são os outros streams ativos (`merganser`, `ceo-backoffice`, sub-projetos C e D) — superfícies disjuntas, sem sobreposição de arquivo com este.
- **Não é decisão de domínio, registro de marca ou conta em provedor.** Essas são decisões e ações do dono, listadas na seção 4.

> **Correção factual (verificada em 2026-09-04).** Uma versão anterior deste documento afirmava que o deploy "funciona em `stable`". Isso é falso: o workflow `.github/workflows/deploy-stable.yml` existe e está escrito, mas **nunca rodou nenhuma vez** — `gh run list --workflow=deploy-stable.yml` devolve lista vazia. Nenhum artefato deste produto jamais foi publicado em Workers, R2 ou Neon reais. O código de deploy é não testado em execução, e deve ser tratado como tal: a primeira execução é um evento de risco, não uma formalidade.

## 3. Stack de produção alvo

Segundo [ADR 0005](../adr/0005-runtime-stack.md) e [ADR 0006](../adr/0006-hosting-platform.md), ambos `Accepted` e confirmados por spike na task 001:

| Camada | Escolha | Onde no repo | Estado |
|---|---|---|---|
| Runtime + framework | Next.js App Router + TypeScript, build via OpenNext | `apps/web/package.json` (`cf:build`, `cf:deploy` usam `opennextjs-cloudflare`) | **Nunca executado** — `deploy-stable.yml` existe mas `gh run list --workflow=deploy-stable.yml` retorna zero execuções |
| Compute | Cloudflare Workers (sem cold start, cobrado por request) | `apps/web/wrangler.jsonc` (`name: "albora-web"`) | **Sem ambientes nomeados** — ver lacuna abaixo |
| Mídia | Cloudflare R2 (egress zero), binding no Worker | Presign/PUT direto do cliente (§5 de `docs/architecture.md`) | Presente para `stable`; falta bucket homol/prod real |
| Banco | Neon Postgres serverless, **driver em modo transação (WebSocket)** — obrigatório porque `SET LOCAL app.event_id` só existe dentro de transação | `packages/db` | Projeto Neon de produção não verificável pelo agente |
| Fila / cron | Cloudflare Queues + Cron Triggers | `wrangler.jsonc` já declara `queues.producers`/`consumers` para `DRIVE_EXPORT_QUEUE`; retenção D330/D365 roda por `tools/carga`/`retention.mjs` conforme §16 | Fila de export já configurada; falta confirmar Cron Trigger de retenção em prod |
| E-mail | Resend | `RESEND_API_KEY` em `.env.example` | Domínio de envio ainda não verificado (ação do dono) |
| Observabilidade | Cloudflare Workers Observability + Sentry + health checks | `wrangler.jsonc` (`observability.enabled: true`), `@sentry/nextjs`, `apps/web/app/api/health/**` | Ligado no código; falta confirmar DSN real do Sentry em produção |
| Pagamento (fornecedor) | Asaas (checkout `POST /api/billing/checkout`, webhook `PAYMENT_CONFIRMED`/`RECEIVED`) | `apps/web/lib/billing/{provider,config}.ts`, `docs/flows.md` | Roda em stub sem `ASAAS_API_KEY`; **as variáveis `ASAAS_API_KEY`/`ASAAS_WEBHOOK_TOKEN`/`ASAAS_SANDBOX` não existem em nenhum `.env*.example`** — lacuna, ver §6 |
| Export para Drive | Google OAuth (`GOOGLE_CLIENT_ID`/`SECRET`/`REDIRECT_URI`) | `apps/web/lib/drive*.ts`, `tools/jobs/drive-export.mjs` | Código "Feito" por `docs/architecture.md` §16; app Google ainda em modo **Testing** (refresh token expira em 7 dias) — bloqueante citado no próprio §16 |

### Lacuna central: ambientes do Worker

`apps/web/wrangler.jsonc` hoje **não tem nenhum bloco `env`** — só a configuração default usada por `pnpm cf:deploy`/`deploy-stable.yml`. Ao mesmo tempo, `.env.homol.example` e `.env.prod.example` já assumem `wrangler secret put --env homol` / `--env prod` e variáveis não-secretas em `[env.homol.vars]`/`[env.prod.vars]` — só que referenciam um `wrangler.toml`, e o projeto usa `wrangler.jsonc`. Ou seja: **os templates de env já descrevem um formato de ambiente que o `wrangler.jsonc` real ainda não declara.** Fechar essa lacuna (`env.homol`, `env.prod` no `wrangler.jsonc`, com `name`, bucket R2 e binding de fila próprios por ambiente) é o primeiro item de trabalho de agente listado na seção 4.

## 4. Eu preparo / Você executa

| # | Item | Quem | Detalhe |
|---|---|---|---|
| 1 | Blocos `env.homol` e `env.prod` em `apps/web/wrangler.jsonc` (nome do Worker, binding de assets, binding de fila, vars não-secretas) | **Eu preparo** | Hoje só existe config default; sem isso não há como `wrangler secret put --env homol` funcionar como os `.env.*.example` já assumem |
| 2 | `.github/workflows/deploy.yml` (novo) — dispara homol e main, seguindo o padrão de confirmação manual de `deploy-stable.yml` | **Eu preparo** | Arquivo próprio deste sub-projeto por contrato de paralelismo; não toca `ci.yml` |
| 3 | Atualizar `.env.example`, `.env.homol.example`, `.env.prod.example` com `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_SANDBOX` | **Eu preparo** | Só template — nenhum valor real entra no arquivo |
| 4 | Escrever os documentos referenciados por runbooks já existentes mas ausentes: `docs/infra/ROLLBACK.md`, `docs/infra/BACKUP-RESTORE.md`, `docs/db/MIGRATION-SAFETY.md`, `scripts/ci/smoke-test.sh` (citados por `docs/runbooks/deploy-quebrado.md` e `docs/infra/RPO-RTO.md`, nenhum existe hoje) | **Eu preparo** | Ver §10 |
| 5 | Atualizar `docs/runbooks/deploy-producao.md` e `carga-producao.md` com os passos dos ambientes novos (homol/main) | **Eu preparo** | — |
| 6 | Conta Cloudflare Workers **paga** (US$ 5/mês) — sem ela o teto de CPU é 10 ms/request, insuficiente para gerar PDF de peças | **Você executa** | ADR 0006 |
| 7 | Criar buckets R2 reais (homol + prod) e gerar `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` | **Você executa** | Credencial — nunca inserida por agente |
| 8 | Criar projeto Neon de produção (+ branch homol) e obter `DATABASE_URL`/`DATABASE_URL_DIRECT` | **Você executa** | Confirmar que o modo é WebSocket/transação, não HTTP — ver ADR 0006 |
| 9 | Decidir e registrar o domínio de produção real | **Você executa** | `.env.prod.example` já assume `albora.com.br`, mas `docs/architecture.md` Anexo A item 2 lista "Registro INPI, `registro.br`, handles" como decisão em aberto do Fundador — **ainda não fechada**. Opções: `albora.app` (citado no ADR 0006 original) ou `albora.com.br` (já nos templates) |
| 10 | Apontar DNS do domínio escolhido para o Worker | **Você executa** | Requer decisão do item 9 primeiro |
| 11 | Verificar domínio no Resend e gerar `RESEND_API_KEY` real | **Você executa** | — |
| 12 | Google Cloud Console: promover o app OAuth de **Testing** para **Production** | **Você executa** | Credencial/config de conta — bloqueante citado em `docs/architecture.md` §16; sem isso o refresh token do export para Drive expira em 7 dias |
| 13 | Obter chaves reais do Asaas (`ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`) e decidir sandbox vs. produção (`ASAAS_SANDBOX`) | **Você executa** | Gateway de pagamento — credencial financeira |
| 14 | Inserir todos os secrets acima como GitHub Actions secrets e via `wrangler secret put --env homol\|prod` | **Você executa** | Nenhum agente insere credencial em nenhuma superfície |
| 15 | Criar/confirmar GitHub Environment `production` com approval (já referenciado por `.github/workflows/backup.yml`) e replicar o padrão para o novo `deploy.yml` | **Você executa** | Config de conta GitHub |
| 16 | Autorizar e rodar o portão de carga (`carga-producao.md`) contra o host real, com os secrets de R2/Neon já carregados no ambiente | **Você executa** (ou autoriza o agente a rodar com secrets já configurados) | Ver §7 — o comando em si não é credencial, mas depende de infra e custo reais |
| 17 | Confirmar se algum worktree `salvage/*` (em especial `salvage/infra-ops`) está ativo antes de qualquer novo trabalho de infra | **Você executa** | Ver §10 — risco de colisão já registrado em `2026-09-04-paralelismo-contrato.md` |

## 5. Sequência de deploy

Respeita o ladder do `CLAUDE.md`: `stable` (teste) → `homol` (homologação) → `main` (prod), com promoção só a pedido explícito do mantenedor e prod saindo de **tag em `main`**, nunca de branch de feature.

1. **MR de feature → `stable`** (padrão já em vigor). Deploy de `stable` já funciona hoje via `.github/workflows/deploy-stable.yml` (`workflow_dispatch` + confirmação `deploy-stable`).
2. **Promoção `stable` → `homol`**, só a pedido do mantenedor. Usa o `env.homol` do `wrangler.jsonc` (item 1 da tabela acima) e o job de homol do novo `deploy.yml` (item 2).
3. **Validar em homol** antes de prosseguir: smoke HTTP (`tools/deploy/smoke.mjs` contra o host homol), health check (`GET /api/health/ready`), magic link real via Resend, um upload de ponta a ponta contra o R2 homol.
4. **Portão N3 — carga 150/20** roda contra homol (ou prod idêntico) neste ponto, seguindo `docs/runbooks/carga-producao.md` — é pré-requisito do 1º evento real, não do deploy em si, mas o runbook já assume um host estável para rodar contra.
5. **Promoção `homol` → `main`**, só a pedido do mantenedor.
6. **Tag em `main` dispara prod** — o `deploy.yml` novo cobre esse gatilho (`push` de tag em `main`, ou `workflow_dispatch` restrito, atrás do GitHub Environment `production` com approval, no mesmo padrão que `backup.yml` já usa para `inputs.alvo == production`).
7. **Smoke pós-deploy em prod** (§8) antes de considerar o deploy bom.
8. Só depois disso o produto está pronto para o casamento #1 (N6 em `plano-implementacao-produto.md`) — que ainda depende, em paralelo, de N1 (prova QR física), N4 (jurídico) e N5 (procedimento de menores), nenhum resolvido por este sub-projeto.

## 6. Segredos

**O que já protege o repositório hoje:**

- `.gitignore` já ignora `.env`, `.env.local` e `.env.*.local` (linhas 1–3).
- Os três templates existentes (`.env.example`, `.env.homol.example`, `.env.prod.example`) contêm só nomes de variável, nunca valor real — conferido por leitura direta.
- `.env.homol.example` e `.env.prod.example` já são explícitos: "NÃO preencha valores aqui" e "secretas — só via `wrangler secret put`".

**O que falta:**

- **Não há scanner de segredo automatizado.** `.github/workflows/security.yml` roda só `pnpm audit --audit-level=high` (com `continue-on-error: true`); não há gitleaks, trufflehog nem menção a GitHub secret scanning / push protection. Habilitar isso é ação de configuração de repositório (Settings → Code security), portanto **"Você executa"** — um agente pode propor o workflow, mas não liga a feature na conta.
- **`ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_SANDBOX` não existem em nenhum `.env*.example`**, apesar de o código (`apps/web/lib/billing/config.ts`) e `docs/flows.md` linha 46 já dependerem delas. Item 3 da tabela da seção 4.

**Onde secreto real pode viver — só dois lugares:**

1. **GitHub Actions secrets** (Settings → Secrets and variables → Actions). Convenção já em uso por `backup.yml`: nome prefixado por ambiente (`HOMOL_DATABASE_URL`, presumivelmente `PRODUCTION_DATABASE_URL`) — o novo `deploy.yml` deve seguir a mesma convenção, e não a genérica `DATABASE_URL` que a tabela de `deploy-producao.md` usa hoje (inconsistência a resolver ao escrever o workflow).
2. **`wrangler secret put --env homol|prod`** para o runtime do Worker (o que os `.env.homol.example`/`.env.prod.example` já apontam).

Nunca em arquivo committado, nunca em log (`docs/architecture.md` §13 já exige PII mascarada em log; o mesmo vale a fortiori para segredo).

## 7. Teste de carga contra infra real

O runbook já existe e é completo: [`docs/runbooks/carga-producao.md`](../runbooks/carga-producao.md). Este spec não o reescreve, só fixa como ele se encaixa na sequência de deploy (§5, passo 4).

- **Objetivo:** provar 150 uploads em 20 minutos contra a infra real (host HTTPS de `stable`/homol ou prod), medindo só `POST /api/sessions → presign → PUT R2 → confirm` — não exercita telão, feed nem admin.
- **Comando** (de `carga-producao.md` §3):

  ```bash
  ALVO=https://stable.albora.app \
  CARGA_CONFIRMO_ALVO=stable.albora.app \
  CARGA_EVENTO=carga-gate-2026 \
  CARGA_TOTAL=150 \
  CARGA_DURACAO_MIN=20 \
  CARGA_CONVIDADOS=50 \
  CARGA_SAIDA=docs/runbooks/carga-registros/gate-$(date +%Y%m%d).json \
  pnpm carga
  ```

- **Critério de aprovação** (`carga-producao.md` §4): ≥145/150 uploads concluídos (≥97%); zero erros 5xx em presign/PUT/confirm; 429 é aceitável se documentado (rate limit por IP — usar `CARGA_IP_POR_CONVIDADO=1` para medir o pipeline sem o teto de sessão); p99 do confirm <10s; prova de idempotência paralela passa (1 linha no banco por sessão).
- **429 não é defeito; 5xx e status 0 na rede do servidor são.**
- **Registro:** salvar o JSON em `docs/runbooks/carga-registros/` (só metadado, sem PII) e preencher a tabela no README daquela pasta — hoje a única linha é `_pendente_`.
- O perfil `gate` do workflow `carga.yml` roda hoje contra Postgres service + dev local em CI — **não substitui** o portão real; é só validação de que o arnês sobe (`carga.yml` §6, `carga-producao.md` §6).
- **Quem roda:** o comando em si não insere credencial — mas depende de `R2_*` e `DATABASE_URL` de produção já carregados no ambiente, que são segredo do dono. Portanto o agente prepara e documenta o comando exato; o dono autoriza a execução (ou concede um ambiente com os secrets já presentes para o agente rodar).

## 8. Smoke e rollback

### Smoke pós-deploy

`docs/runbooks/deploy-producao.md` §4 já define quatro checagens: (1) anfitrião — magic link → `/admin` → criar evento teste; (2) convidado — QR → consentimento → captura → upload → confirmação; (3) telão — `/wall-display` pareado, foto aparece; (4) admin — painel ao vivo mostra participação.

Automatizado hoje por `tools/deploy/smoke.mjs`: HTTP GET/HEAD em `/`, `/admin/sign-in` e `/wall-display`, esperando 200. **Gap:** o script não bate em `/api/health/live` nem `/api/health/ready`, apesar de ambos já existirem em código (`apps/web/app/api/health/{live,ready}/route.ts`) — vale adicionar essas duas rotas ao smoke antes de considerar o deploy bom (proposta de trabalho de agente, não feita ainda).

### Rollback

`docs/runbooks/deploy-producao.md` §5 define o essencial: Worker faz redeploy do commit anterior via CI; **migrations são forward-only** (nunca reescrever uma já aplicada — rollback de schema exige migration nova, regra também do `CLAUDE.md`); objetos no R2 persistem, **nunca apagar bucket em pânico**.

`docs/runbooks/deploy-quebrado.md` (já existente) detalha um procedimento mais operacional — qual SHA está no Worker, `GET /api/health/live` vs `ready`, se a migration aplicada é compatível com o código no ar — mas **referencia três artefatos que não existem no repositório hoje**: `docs/infra/ROLLBACK.md`, `docs/db/MIGRATION-SAFETY.md` e `scripts/ci/smoke-test.sh`, além de um workflow "Rollback production" que também não foi encontrado em `.github/workflows/`. Isso é uma lacuna real, não uma suposição — confirmada por busca direta pelos três caminhos e pelo texto "Rollback production" em todos os `.yml` de `.github/workflows/`. Fechar essas três referências é trabalho de agente (item 4 da tabela §4); até lá, o rollback operacional real é só o que está em `deploy-producao.md` §5.

## 9. Observabilidade mínima

O que já está ligado no código, sem inventar ferramenta nova:

- **Health checks:** `GET /api/health` (alias de `live`), `GET /api/health/live`, `GET /api/health/ready` (este último sonda o banco via `probeDatabase()` e responde 503 se o banco não responde).
- **Cloudflare Workers Observability:** `observability.enabled: true` em `apps/web/wrangler.jsonc` — logs/métricas nativos do Worker, sem serviço terceiro.
- **Sentry:** `@sentry/nextjs` já é dependência de `apps/web/package.json` e `SENTRY_DSN` já está no `.env.example` (marcado opcional). Falta confirmar que o DSN real de produção foi configurado — ação do dono, não verificável por leitura de código.
- **Backup:** `.github/workflows/backup.yml` já roda dump semanal de homol (cron) e dump de produção sob aprovação de Environment.

O que os templates de `.env.example` também citam como opcional (Axiom, Betterstack, analytics) **não tem nenhuma integração no código** além do nome da variável no template — não vira parte do mínimo de observabilidade deste spec, para não inventar ferramenta que o projeto não usa de fato. O mínimo real e verificável é: health check + Cloudflare Observability + Sentry (quando o DSN estiver configurado) + backup semanal.

## 10. Riscos abertos

- **Worktree `salvage/infra-ops` com estado desconhecido.** Confirmado via `git worktree list`: existe em `~/orca/projects/albora-project/.claude/worktrees/agent-aeff8549ac64525a6`, branch `salvage/infra-ops`, HEAD `a41efe0` ("feat(infra): health checks, CSP hardening, backup automation, RPO/RTO runbooks"). Comparando esse commit com o HEAD atual de `docs/roadmap-paralelo` (95b6871): `docs/runbooks/app-down.md`, `apps/web/app/api/health/live/route.ts`, `docs/infra/RPO-RTO.md`, `packages/db/migrations/0053_indices_feed_missao.sql` e `tools/guards/api-routes.mjs` são **byte-idênticos** entre os dois; `.github/workflows/backup.yml` e `security.yml` diferem só em pin de versão de action (`checkout@v4` vs `v7`). Ou seja: o conteúdo técnico de `salvage/infra-ops` já parece estar presente na base atual — mas isso foi verificado só por `git diff` entre commits, **sem entrar no worktree**, e não prova que a branch `salvage/infra-ops` esteja inativa ou que não tenha commits adicionais não vistos aqui. **Ação:** confirmar com o mantenedor se esse worktree está ativo antes de este sub-projeto criar `deploy.yml` ou tocar `wrangler.jsonc`/backup/security — colisão direta já registrada em `2026-09-04-paralelismo-contrato.md`.
- **Runbooks referenciam artefatos inexistentes.** `docs/runbooks/deploy-quebrado.md` cita `docs/infra/ROLLBACK.md`, `docs/db/MIGRATION-SAFETY.md`, `scripts/ci/smoke-test.sh` e um workflow "Rollback production" — nenhum existe. `docs/infra/RPO-RTO.md` cita `docs/infra/BACKUP-RESTORE.md`, que também não existe. Enquanto isso não for escrito, o procedimento de rollback documentado e verificável é só o de `deploy-producao.md` §5.
- **Domínio de produção não está fechado.** `.env.prod.example` já assume `albora.com.br`, mas `docs/architecture.md` Anexo A item 2 lista registro de domínio como decisão em aberto do Fundador. Enquanto essa decisão não sai, DNS não pode ser apontado (item 10 da tabela §4).
- **Verificação OAuth do Google ainda em Testing.** Citado como bloqueante pelo próprio `docs/architecture.md` §16: em "Testing" o refresh token do export para Drive expira em 7 dias — inutiliza qualquer export automático de longa duração até a promoção para Production no Google Cloud Console.
- **Convenção de nome de secret inconsistente entre workflows.** `backup.yml` usa `HOMOL_DATABASE_URL`/`PRODUCTION_DATABASE_URL` (prefixado por ambiente); a tabela de `deploy-producao.md` usa só `DATABASE_URL` genérico. O novo `deploy.yml` precisa decidir uma convenção única antes de existir, para não duplicar secret com nomes diferentes para o mesmo valor.
- **Gate de carga (N3) nunca rodou contra infra real.** `docs/runbooks/carga-registros/` só tem a linha `_pendente_` no README — não há prova de que 150/20 minutos passe fora de CI simulado.

## 11. Critério de sucesso

Este sub-projeto está pronto quando, **sem que nenhum agente tenha inserido credencial em lugar nenhum**:

1. `apps/web/wrangler.jsonc` declara `env.homol` e `env.prod` com nome, binding de assets e binding de fila próprios.
2. `.github/workflows/deploy.yml` existe, deploia homol sob confirmação manual e main sob tag + Environment `production` com approval — sem tocar `ci.yml`.
3. `.env.example`, `.env.homol.example` e `.env.prod.example` incluem as variáveis do Asaas.
4. Os três artefatos referenciados por `deploy-quebrado.md` e `RPO-RTO.md` (`docs/infra/ROLLBACK.md`, `docs/infra/BACKUP-RESTORE.md`, `docs/db/MIGRATION-SAFETY.md`) existem, junto com `scripts/ci/smoke-test.sh` — ou as referências foram corrigidas para apontar ao que já existe.
5. O dono confirmou, fora deste documento: conta Cloudflare paga, bucket R2 homol e prod, projeto Neon prod, domínio escolhido e apontado, Resend verificado, app Google em Production, chaves Asaas reais, todos os secrets carregados em GitHub Actions e via `wrangler secret put`.
6. O portão de carga (`carga-producao.md`) rodou contra homol ou prod real, com resultado ≥145/150 e 0 erros 5xx, registrado em `docs/runbooks/carga-registros/`.
7. O smoke pós-deploy (`tools/deploy/smoke.mjs`, idealmente já incluindo `/api/health/ready`) passa em prod logo após a tag.
8. O risco do worktree `salvage/infra-ops` foi confirmado pelo mantenedor antes de qualquer merge deste trabalho.

Só depois disso o produto está tecnicamente pronto para o casamento #1 — que ainda depende, em paralelo e fora do escopo deste documento, de N1 (prova QR), N4 (jurídico) e N5 (procedimento de menores).
