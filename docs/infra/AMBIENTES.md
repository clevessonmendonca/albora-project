# Estratégia de Ambientes — Albora

> Fonte da verdade para a configuração dos três ambientes do Albora.
> Atualizar aqui antes de alterar qualquer workflow ou secret.

---

## Visão Geral

O Albora opera com três ambientes claramente separados, cada um com seu próprio banco de dados, bucket de storage e conjunto de secrets. Nenhuma variável de produção toca staging; nenhuma variável de staging toca desenvolvimento local.

```
Desenvolvedor (local)
       │
       ▼
  Development ──── Neon branch: dev ──── R2: albora-dev
       │
       ▼ push para stable
  Staging ──────── Neon branch: staging ── R2: albora-staging
       │
       ▼ tag em main + aprovação manual
  Production ───── Neon branch: main ───── R2: albora-production
```

---

## 1. Development (Local)

| Atributo       | Valor                                   |
|----------------|-----------------------------------------|
| URL            | `http://localhost:3000`                 |
| Branch Git     | qualquer branch de feature              |
| Banco          | Neon branch `dev` (ou Docker local)     |
| Storage        | R2 bucket `albora-dev`                  |
| Secrets        | `.env.local` (gitignored)               |
| Deploy         | `pnpm dev` (manual)                     |

### Variáveis de ambiente (.env.local)

```bash
# Database
DATABASE_URL=postgres://<user>:<password>@<dev-host>.neon.tech/<db>?sslmode=require

# Storage
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<dev-key-id>
R2_SECRET_ACCESS_KEY=<dev-secret>
R2_BUCKET=albora-dev
R2_PUBLIC_URL=https://pub-<id>.r2.dev

# App
SESSION_SECRET=<dev-session-secret-minimo-32-chars>
APP_ROOT_DOMAIN=localhost:3000

# Opcionais em dev
RESEND_API_KEY=re_<chave-dev>
```

### Banco local (alternativa ao Neon dev)

Para rodar completamente offline ou em ambientes sem acesso à internet:

```bash
pnpm db:up       # sobe postgres:18 no Docker (porta 55432)
# DATABASE_URL=postgres://albora:albora@localhost:55432/albora
pnpm db:semear   # popula com dados de teste
pnpm db:down     # derruba e limpa volumes
```

### Critérios de integridade

- Nunca usar connection string de staging/prod em `.env.local`
- EXIF removal ativo mesmo em dev (testar com foto real)
- Hot reload funciona sem reiniciar o servidor

---

## 2. Staging (Homologação)

| Atributo       | Valor                                                                      |
|----------------|----------------------------------------------------------------------------|
| URL            | `https://staging.albora.vercel.app` (até domínio próprio estar ativo)      |
| Branch Git     | `stable`                                                                   |
| Banco          | Neon branch `staging`                                                      |
| Storage        | R2 bucket `albora-staging`                                                 |
| Secrets        | GitHub Secrets prefixo `STAGING_`                                          |
| Deploy         | Automático via workflow `deploy-staging.yml` após CI verde em `stable`     |

### GitHub Secrets necessários

| Secret                        | Descrição                                      |
|-------------------------------|------------------------------------------------|
| `STAGING_DATABASE_URL`        | Connection string Neon branch staging          |
| `STAGING_R2_ACCOUNT_ID`       | Cloudflare Account ID (comum entre ambientes)  |
| `STAGING_R2_ACCESS_KEY_ID`    | R2 API token (escopo bucket staging)           |
| `STAGING_R2_SECRET_ACCESS_KEY`| R2 API secret                                  |
| `STAGING_R2_BUCKET`           | `albora-staging`                               |
| `STAGING_R2_PUBLIC_URL`       | URL pública do bucket staging                  |
| `STAGING_SESSION_SECRET`      | Secret de sessão (≥32 chars, random)           |
| `STAGING_RESEND_API_KEY`      | Chave Resend para emails de staging            |
| `CLOUDFLARE_ACCOUNT_ID`       | Account ID para deploy Pages/Workers           |
| `CLOUDFLARE_API_TOKEN`        | Token com permissão Pages:Edit                 |

### Critérios de promoção staging → production

- [ ] Deploy concluído sem erros
- [ ] Smoke test passou (QR → sessão → upload → feed)
- [ ] Nenhum erro 5xx nos primeiros 5 minutos
- [ ] Performance Lighthouse ≥ 85 (medido no deploy)
- [ ] Aprovação manual de pelo menos 1 reviewer

---

## 3. Production

| Atributo       | Valor                                                         |
|----------------|---------------------------------------------------------------|
| URL            | `https://albora.social.br` (futuro)                           |
| Branch Git     | `main` (via tag semântica `v1.2.3`)                           |
| Banco          | Neon branch `main` (production)                               |
| Storage        | R2 bucket `albora-production`                                 |
| Secrets        | GitHub Secrets prefixo `PROD_`                                |
| Deploy         | Manual approval no GitHub Environment `production`            |

### GitHub Secrets necessários

| Secret                       | Descrição                                      |
|------------------------------|------------------------------------------------|
| `PROD_DATABASE_URL`          | Connection string Neon production              |
| `PROD_R2_ACCOUNT_ID`         | Cloudflare Account ID                          |
| `PROD_R2_ACCESS_KEY_ID`      | R2 API token (escopo bucket production)        |
| `PROD_R2_SECRET_ACCESS_KEY`  | R2 API secret                                  |
| `PROD_R2_BUCKET`             | `albora-production`                            |
| `PROD_R2_PUBLIC_URL`         | URL pública do bucket production               |
| `PROD_SESSION_SECRET`        | Secret de sessão (≥32 chars, random, único)    |
| `PROD_RESEND_API_KEY`        | Chave Resend de produção                       |
| `CLOUDFLARE_ACCOUNT_ID`      | Account ID para deploy Pages/Workers           |
| `CLOUDFLARE_API_TOKEN`       | Token com permissão Pages:Edit                 |

### Proteções obrigatórias

1. **GitHub Environment `production`** com required reviewers configurados
2. **Neon branch protection** na branch `main` (evitar reset acidental)
3. **R2 bucket `albora-production`** com Object Lock ativado (produção)
4. **Rollback disponível** em até 5 minutos via workflow `rollback.yml`

### Critérios de entrada em produção

- [ ] Staging passou todos os gates
- [ ] Reviewers aprovaram no GitHub Environment
- [ ] Migration (se houver) validada em staging
- [ ] Janela de deploy definida (nunca sexta/sábado 18h-23h)
- [ ] Runbook de rollback revisado antes do deploy

---

## Diagrama de Fluxo Completo

```
feature branch
      │
      │ PR → stable
      ▼
   stable ──── CI gates (9 checks) ──── [FAIL] → notificação, bloqueia
      │
      │ [PASS] → deploy-staging.yml
      ▼
  staging env
      │
      │ smoke test + validação manual
      │
      │ PR stable → main (ou promoção direta)
      ▼
    main
      │
      │ tag v1.2.3
      ▼
   ci gates
      │
      │ [PASS] → deploy-production.yml
      ▼
  staging deploy (validação pré-prod)
      │
      │ E2E em staging
      │
      │ 🛑 MANUAL APPROVAL
      ▼
  production deploy
      │
      │ health check + smoke test
      ▼
  notificação de sucesso / rollback automático em falha
```

---

## Responsabilidades por Ambiente

| Ação                          | Dev   | Staging | Production |
|-------------------------------|-------|---------|------------|
| Rodar migrations              | Manual| CI auto | CI c/ approval |
| Resetar banco                 | ✅    | ✅ (não em sexta/sábado) | ❌ nunca |
| Deploy sem CI                 | N/A   | ❌      | ❌         |
| Acesso direto ao banco        | ✅    | ✅ (auditado) | ❌ somente via migration |
| Debug com logs PII            | ✅    | ❌ (mascarado) | ❌ (mascarado) |

---

## Referências

- Workflows: `.github/workflows/`
- Secrets: GitHub → Settings → Secrets and variables → Actions
- Neon Console: https://console.neon.tech
- Cloudflare Dashboard: https://dash.cloudflare.com
- Rollback: `docs/infra/ROLLBACK.md`
- Deploy process: `docs/infra/DEPLOY-PROCESS.md`
