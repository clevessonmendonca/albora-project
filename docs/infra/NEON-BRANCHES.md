# Neon Branches — Estratégia de Bancos por Ambiente

> Configuração das branches do Neon para os três ambientes do Albora.
> As connection strings exibidas aqui são **mascaradas** — os valores reais ficam nos GitHub Secrets.

---

## Por Que Branches Neon?

O Neon oferece branching instantâneo de banco de dados (copy-on-write), permitindo:
- Banco de staging isolado de production com custo zero de storage inicial
- Possibilidade de criar branches de feature por PR (futuro)
- Rollback de dados via branch
- Testes de migration sem risco para production

---

## Estrutura de Branches

```
main (production)
 ├── staging
 └── dev
```

- `main` → banco de produção. Nunca resetar. Acesso via `PROD_DATABASE_URL`.
- `staging` → derivado de `main`. Resetável. Dados de teste realistas.
- `dev` → derivado de `staging`. Resetável. Seed automático no CI.

---

## Passo a Passo — Criar as Branches

### Pré-requisitos

- Conta no Neon: https://console.neon.tech
- Projeto Albora já criado (branch `main` existe)

### 1. Criar Branch `staging`

1. Acesse o console do Neon → seu projeto Albora
2. Clique em **"Branches"** no menu lateral
3. Clique em **"New Branch"**
4. Configurações:
   - **Name:** `staging`
   - **Branch from:** `main` (HEAD)
   - **Compute:** manter o padrão (serverless)
5. Clique em **"Create Branch"**
6. Copie a connection string do endpoint da branch `staging`

### 2. Criar Branch `dev`

Repita o processo acima com:
- **Name:** `dev`
- **Branch from:** `main` (HEAD)

### 3. Obter Connection Strings

Para cada branch, acesse **"Connection Details"** e copie a string no formato:

```
postgres://<user>:<password>@<host>.neon.tech/<dbname>?sslmode=require
```

> **Atenção:** a string contém senha. Nunca commitar. Salvar nos GitHub Secrets.

---

## Configuração dos GitHub Secrets

| Secret                 | Branch Neon | Onde usar              |
|------------------------|-------------|------------------------|
| `STAGING_DATABASE_URL` | staging     | workflow deploy-staging |
| `PROD_DATABASE_URL`    | main        | workflow deploy-production |

Para configurar:
1. GitHub → seu repositório → **Settings** → **Secrets and variables** → **Actions**
2. **"New repository secret"** para cada entrada acima
3. Use a connection string completa com `?sslmode=require`

---

## Variável Local (Desenvolvimento)

Adicione ao `.env.local` (nunca ao `.env.example` — template sem senha):

```bash
DATABASE_URL=postgres://albora_dev:<senha>@<host-dev>.neon.tech/albora?sslmode=require
```

---

## Gerenciamento de Migrations por Ambiente

| Ambiente   | Quando aplicar         | Quem aplica              |
|------------|------------------------|--------------------------|
| dev        | Manualmente (`pnpm db:migrate`) | Desenvolvedor     |
| staging    | Push para `stable`     | CI (deploy-staging.yml)  |
| production | Tag em `main` + approval| CI (deploy-production.yml) |

O CI aplica migrations antes do deploy em cada ambiente.

---

## Reset de Branch (Staging/Dev)

Para resetar staging ao estado atual de production:

1. Neon Console → Branches → `staging`
2. Clique nos três pontos → **"Reset from parent"**
3. Confirme

> Isso apaga dados de staging e sincroniza com `main`. Útil antes de testes de migration destrutiva.

---

## Proteção da Branch `main`

No Neon Console → Branch `main` → configurar:

- **Protected:** ✅ (bloqueia reset acidental)
- Deletar somente com confirmação explícita

---

## Conexões Diretas (Emergência)

Em situações de debug autorizado (nunca rotineiro):

```bash
# Staging
psql "postgres://albora_staging:<senha>@<host>.neon.tech/albora?sslmode=require"

# Production — requer aprovação de dois mantenedores
psql "postgres://albora_prod:<senha>@<host>.neon.tech/albora?sslmode=require"
```

Qualquer acesso direto a production deve ser registrado no canal de operações.

---

## Referências

- Neon Branching docs: https://neon.tech/docs/guides/branching
- GitHub Secrets: Settings → Secrets and variables → Actions
- Migration safety: `docs/db/MIGRATION-SAFETY.md`
- Ambientes: `docs/infra/AMBIENTES.md`
