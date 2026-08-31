# Runbook — smoke do dev client (Expo)

> **Objetivo:** provar Skia, share, fila offline, passagem e background fetch em aparelho real.  
> **Pré-requisito:** Expo Go **não** serve — use `eas build --profile development`.

## 1. Build

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use
pnpm install
cd apps/mobile
pnpm fontes   # Fraunces + Instrument Sans em assets/fontes/
eas init      # uma vez — grava EAS_PROJECT_ID (ver universal-links.md)
# Ajuste EXPO_PUBLIC_API_URL em eas.json (development) para API acessível pelo celular
eas build --profile development --platform android   # ou ios
pnpm start --dev-client
```

## 2. Parear

1. Web aberta (`pnpm dev`) → `/e/festa-demo` → primeira foto → `/e/festa-demo/pair`.
2. **App instalado:** toque **Abrir no app** (passagem one-shot) → deve ir direto ao **Feed**.
3. **Sem app / debug:** digite os 4 dígitos ou `albora://pair?codigo=1234`.
4. Reabrir app com sessão → index pula parear.

Universal link HTTPS só com credenciais reais — ver [`universal-links.md`](./universal-links.md).

## 3. Câmera + Skia

1. Tab câmera → disparar → revisão com filtros (preview GPU).
2. Enviar → badge **N na fila** se offline.

## 4. Fila

1. Modo avião → enviar 1–2 fotos → abrir **N na fila** ou **Ver fila →** em Minhas.
2. `/queue`: rótulos, **Tentar de novo**, rodapé telemetria + status BG fetch.
3. Voltar online → drain automático (foreground) ou manual.

## 5. Share

1. Minhas → foto enviada → **Compartilhar** (moldura Skia).
2. Feed → vídeo → detalhe (mime passado) → **Compartilhar poster** (thumb).
3. Recap (≥3 fotos) → botão Recap → folhas sequenciais.

## 6. Passagem (1ª foto)

1. Web: enviar 1ª foto → **Abrir no app** (não só o código).
2. App abre no **Feed** com a mesma sessão (passagem consumida).
3. Gerar outro código em `/pair` → link antigo deve falhar.

## 7. Background (🟡 manual)

1. Enfileirar com app em background 2–5 min.
2. Matar app (swipe) → esperar 15+ min → reabrir.
3. Conferir telemetria `origem: background` em `/queue`.

## Falhas comuns

| Sintoma | Checar |
|---------|--------|
| Fonte errada na moldura | `pnpm fontes` antes do build |
| API unreachable | `EXPO_PUBLIC_API_URL` LAN/túnel, não `localhost` no device |
| BG fetch negado | Ajustes iOS/Android → atualização em background |
| Passagem não abre feed | Migration 0048 rodou? API `/api/app/parear` devolve `passagem`? |
