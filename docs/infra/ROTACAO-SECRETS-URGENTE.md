# 🚨 GUIA DE ROTAÇÃO DE SECRETS — AÇÃO IMEDIATA

> **URGENTE:** Secrets foram expostos em conversa de cloud agent e DEVEM ser rotacionados IMEDIATAMENTE.

---

## ⚠️ SECRETS COMPROMETIDOS

Os seguintes secrets foram expostos em texto plano:

```
✅ R2_SECRET_ACCESS_KEY
✅ SESSION_SECRET
✅ RESEND_API_KEY
✅ DATABASE_URL (password incluída)
```

**Risco:** Qualquer pessoa com acesso à conversa pode usar esses secrets para acessar a infraestrutura.

---

## 🔴 ROTAÇÃO IMEDIATA — PASSO A PASSO

### 1. R2_SECRET_ACCESS_KEY (Cloudflare R2)

**Como rotacionar:**

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com)
2. R2 → Manage R2 API Tokens
3. Encontre o token atual (account ID: `e44af6d5f47703e6098b912dd021c805`)
4. **Revoke** o token atual
5. **Create new token** com as mesmas permissões:
   - Read + Write no bucket `albora-spike`
6. Copie o novo `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY`
7. Atualize `.env.local` (dev) e GitHub Secrets (CI/CD)

**Teste:** Execute `pnpm dev` e tente fazer upload. Se funcionar, rotação bem-sucedida.

---

### 2. SESSION_SECRET (JWT Signing)

**Como rotacionar:**

1. Gere novo secret:
   ```bash
   openssl rand -base64 32
   ```

2. Copie o output (exemplo: `abc123XYZ...`)

3. Atualize `.env.local`:
   ```
   SESSION_SECRET=novo_secret_aqui
   ```

4. ⚠️ **IMPACTO:** Todas as sessões de convidados existentes serão invalidadas (usuários precisarão fazer login novamente).

5. Para produção (quando existir), faça rotação gradual:
   - Mantenha old + new secret por 24h
   - Depois remova old secret

**Teste:** Acesse a aplicação, faça login como convidado. Se funcionar, rotação bem-sucedida.

---

### 3. RESEND_API_KEY

**Como rotacionar:**

1. Acesse [Resend Dashboard](https://resend.com/api-keys)
2. Encontre o token atual (`re_8wLbbf3G_...`)
3. **Delete** o token atual
4. **Create API Key** com as mesmas permissões:
   - Full access (ou scope específico se preferir)
5. Copie o novo token
6. Atualize `.env.local` (dev) e GitHub Secrets (CI/CD)

**Teste:** Envie um email de teste (magic link) e verifique se chega.

---

### 4. DATABASE_URL (Neon)

**Como rotacionar:**

1. Acesse [Neon Console](https://console.neon.tech)
2. Selecione seu projeto (database: `neondb`)
3. Settings → **Reset password**
4. Copie a nova connection string (pooled + direct)
5. Atualize `.env.local`:
   ```
   DATABASE_URL=postgresql://neondb_owner:nova_senha@ep-long-dawn-acge8dqw-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
   DATABASE_URL_DIRECT=postgresql://neondb_owner:nova_senha@ep-long-dawn-acge8dqw.sa-east-1.aws.neon.tech/neondb?sslmode=require
   ```
6. Atualize GitHub Secrets (CI/CD)

**Teste:** Execute `pnpm dev` e verifique se a aplicação conecta ao banco.

---

## 📋 CHECKLIST DE ROTAÇÃO

```
[ ] R2_SECRET_ACCESS_KEY rotacionado
[ ] SESSION_SECRET rotacionado
[ ] RESEND_API_KEY rotacionado
[ ] DATABASE_URL rotacionado
[ ] .env.local atualizado
[ ] GitHub Secrets atualizados (se CI/CD configurado)
[ ] Aplicação testada (dev funciona)
[ ] Documentar data da rotação (para próxima rotação em 90 dias)
```

---

## 🔐 PREVENÇÃO — NÃO FAÇA ISSO NOVAMENTE

### ❌ NUNCA:

1. Compartilhe secrets em texto plano (chat, email, Slack)
2. Commite secrets no Git (mesmo em branches privadas)
3. Exponha secrets em logs ou errors
4. Use secrets de produção em desenvolvimento
5. Compartilhe secrets via screenshot ou print

### ✅ SEMPRE:

1. Use GitHub Secrets para CI/CD
2. Use `.env.local` (gitignored) para dev
3. Mascare secrets em logs (use `[REDACTED]`)
4. Rotacione secrets a cada 90 dias (mínimo)
5. Use secrets diferentes para dev/staging/prod

---

## 🛡️ PRÓXIMAS AÇÕES (Fase 6 — Segurança)

Após rotacionar os secrets, implementar:

1. **Secrets Manager** (futuro)
   - GitHub Secrets (já disponível, usar)
   - Cloudflare Workers Secrets (para produção)

2. **Auditoria de Secrets** (mensal)
   - Verificar quais secrets existem
   - Verificar última rotação
   - Rotacionar automaticamente

3. **Monitoring de Secrets** (futuro)
   - Alertar se secret exposto em commit
   - Alertar se secret exposto em log
   - Revogar automaticamente

---

## 📞 SUPORTE

Se tiver dúvidas ou problemas durante a rotação:

1. Verificar documentação oficial:
   - [Cloudflare R2](https://developers.cloudflare.com/r2/api/s3/tokens/)
   - [Neon](https://neon.tech/docs/manage/projects#reset-a-password)
   - [Resend](https://resend.com/docs/dashboard/api-keys)

2. Testar em dev antes de produção

3. Se algo quebrar, reverter para secrets antigos temporariamente e investigar

---

**Status:** 🔴 AÇÃO IMEDIATA NECESSÁRIA  
**Prazo:** Hoje (28/08/2026)  
**Responsável:** Você (admin do projeto)  
**Após rotação:** Marcar como ✅ COMPLETO
