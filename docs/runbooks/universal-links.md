# Runbook — Universal Links / App Links

> **Objetivo:** domínio verificado abre o app na passagem web→app sem digitar código.  
> **Pré-requisito:** dev client instalado (`docs/runbooks/dev-client-smoke.md`).

## 1. EAS project id

```bash
cd apps/mobile
npm i -g eas-cli   # se ainda não tiver
eas login
eas init           # grava project id — exporte como EAS_PROJECT_ID
```

Opcional em `.env` local do mobile:

```bash
EAS_PROJECT_ID=<uuid-do-eas-init>
EXPO_PUBLIC_APP_LINK_HOST=albora.app
EXPO_PUBLIC_API_URL=https://sua-api
```

Rebuild dev client após mudar `associatedDomains` / intent filters.

## 2. Credenciais Apple (iOS)

1. Apple Developer → **Membership** → copie **Team ID** (10 caracteres).
2. No deploy da web (Cloudflare), defina:

```bash
IOS_APP_TEAM_ID=AB12CD34EF
IOS_APP_BUNDLE_ID=app.albora.guest   # opcional — default já bate com app.json
APP_LINK_HOST=albora.app
```

3. Confira AASA servido:

```bash
curl -s https://albora.app/.well-known/apple-app-site-association | jq .
```

Deve conter `"appID": "TEAMID.app.albora.guest"` e paths `/e/*/pair`.

## 3. Credenciais Google (Android)

1. SHA-256 do certificado de assinatura do build EAS:

```bash
# Play App Signing ou keystore do EAS — pegue o fingerprint SHA-256
eas credentials -p android
```

2. No deploy da web:

```bash
ANDROID_APP_SHA256=AA:BB:CC:...
ANDROID_APP_PACKAGE=app.albora.guest   # opcional
```

3. Confira:

```bash
curl -s https://albora.app/.well-known/assetlinks.json | jq .
```

4. Validação Google: [Statement List Generator](https://developers.google.com/digital-asset-links/tools/generator).

## 4. Checagem local

```bash
IOS_APP_TEAM_ID=... ANDROID_APP_SHA256=... node tools/dev/check-app-links.mjs
```

Sem env, rotas `.well-known` servem **placeholders** — deep link `albora://` funciona; HTTPS universal link só após credenciais reais.

## 5. Smoke de passagem (zero digitação)

1. Web logada → `/e/festa-demo/pair` → **Abrir no app**.
2. App instalado → cai no **Feed** com a mesma sessão (token `passagem` consumido).
3. Gerar outro código na web → link antigo deve falhar (409).

Deep link manual (debug):

```text
albora://pair?passagem=<token-da-resposta-do-POST-parear>
```

## 6. Migration 0048

A passagem exige coluna `passagem_token_hash` (`0048_passagem_do_app.sql`).  
Ambiente local: `pnpm db:semear` já roda migrations. Homol/prod: pipeline normal de migrate.

## Falhas comuns

| Sintoma | Checar |
|---------|--------|
| Link HTTPS abre Safari, não o app | AASA/assetlinks + Team ID/SHA256 + rebuild nativo |
| Passagem 409 | Código já consumido ou expirado — gerar outro na web |
| `eas build` pede project id | `eas init` + `EAS_PROJECT_ID` |
| AASA placeholder em prod | `IOS_APP_TEAM_ID` no Worker/Cloudflare |
