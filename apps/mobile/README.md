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

O `prestart` já roda o script; em CI/EAS o passo é explícito se o build não passar por `expo start`.

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
2. Ajuste `EXPO_PUBLIC_API_URL` em `eas.json` (perfil `development`) ou sobrescreva via secret/`.env` apontando para a API acessível pelo aparelho (LAN, túnel ou stable).
3. Gere o binário:

```bash
cd apps/mobile
eas build --profile development --platform ios     # dispositivo físico (simulator: false)
eas build --profile development --platform android # APK interno
```

4. Instale o artefato no aparelho e conecte ao Metro:

```bash
pnpm start --dev-client
```

Valide em aparelho real: preview Skia na câmera, moldura de share (fontes `.woff`), drain da fila com app em background/fechado.

Perfil `preview` (`channel: preview`) serve builds internos sem launcher de dev — smoke antes de loja.

Checklist completo: [`docs/runbooks/dev-client-smoke.md`](../../docs/runbooks/dev-client-smoke.md).

## O que ainda não está

Universal links, ícone/fichas das lojas, EAS project id no `app.json`. A captura já deixa o JPEG na fila em disco; LUT/Skia, share e fila offline estão no código — falta prova em aparelho via dev client.
