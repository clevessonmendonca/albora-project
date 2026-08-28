# App do convidado (Expo)

Segunda porta. O QR **sempre** abre a web; o app só entra depois da primeira foto, pelo código de 4 dígitos (`/e/[slug]/pair`).

Não há login, push, nem compra. ADR 0004, 0009 e 0010.

## Stack

- Expo SDK 53 (React Native 0.79), Expo Router, New Architecture
- Node 22 — `.nvmrc` na raiz do monorepo
- NativeWind v4 consumindo `@albora/tokens` (um resolvedor, dois `ui-*`)
- Fila em arquivo (`src/queue.ts`) — o `URLSession` iOS não aceita Blob
- Câmera nativa (`expo-camera`) copia o still para disco e enfileira `corpo.tipo === "arquivo"`
- Sessão em SecureStore; o cookie se chama `albora_sessao`, igual à web

## Dev

### Pré-requisitos

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use   # lê .nvmrc → Node 22
pnpm install
```

### Fontes da moldura de compartilhar

As faces Fraunces/Instrument Sans vivem em `assets/fontes/` (gitignored). Copie antes de rodar:

```bash
pnpm --filter @albora/mobile fontes
```

### Ícones e splash (lojas)

Rasteriza `brand/icones/icone-app-512.svg` para PNG do Expo:

```bash
pnpm --filter @albora/mobile icones
```

O `eas-build-pre-install` roda fontes + ícones; em CI/local use os dois antes de `eas build`.

### Desenvolvimento local (Metro)

```bash
cd apps/mobile
echo "EXPO_PUBLIC_API_URL=http://localhost:3000" > .env
pnpm start
```

O pareamento chama `POST /api/app/parear/resgatar`. A web precisa estar no ar (`pnpm dev`).

**Expo Go não serve.** Skia (`@shopify/react-native-skia`), upload em segundo plano (`expo-background-fetch`) e composição de share exigem **dev client nativo** — binário compilado com `expo-dev-client`.

### Build de desenvolvimento (EAS)

1. Instale o EAS CLI (`npm i -g eas-cli`) e faça login (`eas login`).
2. Rode **`eas init`** uma vez — grava `EAS_PROJECT_ID` (ver [`docs/runbooks/universal-links.md`](../../docs/runbooks/universal-links.md)).
3. Copie `apps/mobile/.env.example` → `.env` e ajuste `EXPO_PUBLIC_API_URL` (LAN/túnel no aparelho).
4. Ajuste `EXPO_PUBLIC_API_URL` em `eas.json` (perfil `development`) ou via secret.
5. Gere o binário:

```bash
cd apps/mobile
eas build --profile development --platform ios     # dispositivo físico (simulator: false)
eas build --profile development --platform android # APK interno
```

6. Instale o artefato no aparelho e conecte ao Metro:

```bash
pnpm start --dev-client
```

Valide em aparelho real: preview Skia na câmera, moldura de share (fontes `.woff`), drain da fila com app em background/fechado.

Perfil `preview` (`channel: preview`) serve builds internos sem launcher de dev — smoke antes de loja.

Checklist completo: [`docs/runbooks/dev-client-smoke.md`](../../docs/runbooks/dev-client-smoke.md).

## O que ainda não está

Capturas de tela e submit real (`eas submit`) — ficha em [`store/listing.pt-BR.md`](store/listing.pt-BR.md), privacidade em `/privacidade`, runbook [`docs/runbooks/publicacao-lojas.md`](../../docs/runbooks/publicacao-lojas.md). Credenciais reais de App Link no deploy. Falta prova em aparelho via dev client ([`docs/runbooks/dev-client-smoke.md`](../../docs/runbooks/dev-client-smoke.md)).
