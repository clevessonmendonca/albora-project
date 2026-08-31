#!/usr/bin/env bash
# Wrapper para o preview server: garante Node 22 (o repo exige >=18; o preview
# herda Node 16 do shell base). Ativa o nvm e roda o dev do app web.
source ~/.nvm/nvm.sh
nvm use 22 >/dev/null
exec pnpm --filter @albora/web dev
