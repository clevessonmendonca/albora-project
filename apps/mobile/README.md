# App do convidado (Expo)

Segunda porta. O QR **sempre** abre a web; o app só entra depois da primeira foto, pelo código de 4 dígitos (`/e/[slug]/pair`).

Não há login, push, nem compra. ADR 0004, 0009 e 0010.

## Stack

- Expo SDK 53 (React Native 0.79), Expo Router, New Architecture
- Node 20 — o monorepo inteiro. SDK 54 puxa Metro que exige Node 22; aqui isso quebraria o CI.
- NativeWind v4 consumindo `@albora/tokens` (um resolvedor, dois `ui-*`)
- Fila em arquivo (`src/queue.ts`) — o `URLSession` iOS não aceita Blob
- Câmera nativa (`expo-camera`) copia o still para disco e enfileira `corpo.tipo === "arquivo"`
- Sessão em SecureStore; o cookie se chama `albora_sessao`, igual à web

## Dev

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 20.20.1
pnpm install
cd apps/mobile
echo "EXPO_PUBLIC_API_URL=http://localhost:3000" > .env
pnpm start
```

O pareamento chama `POST /api/app/parear/resgatar`. A web precisa estar no ar (`pnpm dev`).

## O que ainda não está

LUT no still, PUT em segundo plano (`URLSession` / WorkManager), feed real, universal links, ícone/fichas das lojas, EAS project id. A captura já deixa o JPEG na fila em disco.
