# R2 Buckets — Configuração por Ambiente

> Configuração dos buckets Cloudflare R2 para desenvolvimento, staging e produção.
> Tokens e credenciais ficam nos GitHub Secrets — nunca neste documento.

---

## Buckets por Ambiente

| Ambiente   | Bucket Name          | Visibilidade | Versionamento |
|------------|----------------------|--------------|---------------|
| dev        | `albora-dev`         | Privado      | Não           |
| staging    | `albora-staging`     | Privado      | Não           |
| production | `albora-production`  | Privado      | Sim           |

Os buckets são privados; acesso público às fotos acontece via URLs presigned de curta duração geradas no servidor.

---

## Passo a Passo — Criar os Buckets

### Pré-requisitos

- Conta Cloudflare com R2 habilitado
- CLI `wrangler` instalado (opcional — pode fazer pelo dashboard)

### 1. Via Cloudflare Dashboard

1. Acesse https://dash.cloudflare.com → **R2 Object Storage**
2. Clique em **"Create bucket"**
3. Para cada ambiente:

**albora-dev:**
- Name: `albora-dev`
- Location: Automatic (ou escolher região mais próxima)
- Object Lock: desabilitado

**albora-staging:**
- Name: `albora-staging`
- Location: Automatic
- Object Lock: desabilitado

**albora-production:**
- Name: `albora-production`
- Location: Automatic
- Object Lock: **habilitado** (compliance mode, 30 dias)

### 2. Via wrangler (alternativa)

```bash
npx wrangler r2 bucket create albora-dev
npx wrangler r2 bucket create albora-staging
npx wrangler r2 bucket create albora-production
```

---

## Configuração CORS

Cada bucket precisa de CORS configurado para aceitar uploads presigned do browser.

No Cloudflare Dashboard → bucket → **Settings** → **CORS**:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://staging.albora.vercel.app",
      "https://albora.social.br"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type", "Content-Length", "x-amz-meta-*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

> Para o bucket de dev, `AllowedOrigins` pode ser `["*"]` para facilitar desenvolvimento local.
> Em staging e production, listar apenas as origens reais.

---

## Estrutura de Chaves (Paths)

A estrutura de paths dentro de cada bucket segue a convenção definida no core:

```
events/{event_id}/uploads/{upload_id}.{ext}
events/{event_id}/thumbs/{upload_id}_thumb.webp
events/{event_id}/book/{page}.pdf
```

O servidor **sempre** deriva a chave — o cliente nunca informa o path. Ver CLAUDE.md.

---

## Criação de API Tokens por Ambiente

Cada ambiente usa um API token R2 com permissão mínima (somente o bucket correspondente).

1. Cloudflare Dashboard → **R2** → **Manage R2 API tokens**
2. **"Create API token"** para cada ambiente:

| Token Name           | Permissão         | Bucket Scope    |
|----------------------|-------------------|-----------------|
| `albora-dev-rw`      | Object Read/Write | `albora-dev`    |
| `albora-staging-rw`  | Object Read/Write | `albora-staging`|
| `albora-prod-rw`     | Object Read/Write | `albora-production`|

3. Salve `Access Key ID` e `Secret Access Key` para cada token

---

## Configuração dos Secrets

### GitHub Secrets

| Secret                        | Valor                           |
|-------------------------------|----------------------------------|
| `STAGING_R2_ACCOUNT_ID`       | Cloudflare Account ID            |
| `STAGING_R2_ACCESS_KEY_ID`    | Access Key ID do token staging   |
| `STAGING_R2_SECRET_ACCESS_KEY`| Secret Key do token staging      |
| `STAGING_R2_BUCKET`           | `albora-staging`                 |
| `STAGING_R2_PUBLIC_URL`       | URL pública (se configurada)     |
| `PROD_R2_ACCOUNT_ID`          | Cloudflare Account ID            |
| `PROD_R2_ACCESS_KEY_ID`       | Access Key ID do token production|
| `PROD_R2_SECRET_ACCESS_KEY`   | Secret Key do token production   |
| `PROD_R2_BUCKET`              | `albora-production`              |
| `PROD_R2_PUBLIC_URL`          | URL pública de production        |

### .env.local (desenvolvimento)

```bash
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<dev-key-id>
R2_SECRET_ACCESS_KEY=<dev-secret-key>
R2_BUCKET=albora-dev
R2_PUBLIC_URL=https://pub-<id>.r2.dev  # se URL pública estiver ativa
```

---

## Object Lock em Production

O bucket `albora-production` tem Object Lock habilitado em modo Governance com retenção de 30 dias. Isso significa:

- Objetos não podem ser deletados dentro do período de retenção sem permissão especial
- Protege contra deleção acidental ou ransomware
- O job de retenção (LGPD, dia 365) usa a permissão bypass configurada separadamente

Para o job de deleção LGPD ter permissão de deletar após 365 dias, o API token dedicado ao job precisa de permissão `Object Delete (bypass governance)`.

---

## Verificação Pós-Criação

Após criar os buckets, valide:

```bash
# Usando wrangler para listar buckets
npx wrangler r2 bucket list

# Esperado:
# albora-dev
# albora-staging
# albora-production
```

Teste de upload via presign (use o smoke test):

```bash
bash scripts/ci/smoke-test.sh https://staging.albora.vercel.app
```

---

## Referências

- Cloudflare R2 docs: https://developers.cloudflare.com/r2/
- CORS R2: https://developers.cloudflare.com/r2/buckets/cors/
- Object Lock: https://developers.cloudflare.com/r2/buckets/object-lock/
- Cache na borda (não assinar Cache-Control no PUT): `docs/infra/CDN.md`
- Ambientes: `docs/infra/AMBIENTES.md`
- Smoke test: `scripts/ci/smoke-test.sh`
