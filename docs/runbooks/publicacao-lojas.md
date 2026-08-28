# Runbook — publicação nas lojas (task 017)

> **Depende de:** dev client validado ([`dev-client-smoke.md`](./dev-client-smoke.md)), App Links ([`universal-links.md`](./universal-links.md)).

## 1. Contas (abrir cedo)

| Loja | Custo | Nota |
|------|-------|------|
| Apple Developer | US$ 99/ano | TestFlight antes de produção |
| Google Play | US$ 25 uma vez | Conta pessoal: 14 dias × 12 testadores |

## 2. Ícones e splash

```bash
cd apps/mobile
pnpm icones    # rasteriza brand/icones/icone-app-512.svg → assets/*.png
pnpm fontes
```

`eas-build-pre-install` já roda os dois no EAS.

## 3. Builds

```bash
eas init                    # EAS_PROJECT_ID
eas build -p ios --profile preview      # smoke interno
eas build -p android --profile preview
eas build -p all --profile production   # loja
```

Ajuste `EXPO_PUBLIC_API_URL` em `eas.json` (production) para API de produção.

## 4. Submit

1. Preencha placeholders em `eas.json` → `submit.production`.
2. Coloque `store/google-service-account.json` (gitignored) para Android.
3. Revise [`store/listing.pt-BR.md`](../apps/mobile/store/listing.pt-BR.md).
4. Confirme `https://albora.app/privacidade` no ar (`curl -sI` → 200; página em `apps/web/app/privacidade`).
5. `eas submit -p ios --profile production` / `eas submit -p android --profile production`.

## 5. Capturas de tela

Dispositivo real, tema festa-demo, três fluxos:

1. Câmera + filtros  
2. Feed com stories  
3. Minhas + compartilhar  

Exportar via Xcode / Android Studio ou ferramenta de screenshot.

## 6. EAS Update (correções OTA)

```bash
eas update --channel production --message "fix: …"
```

Só JS/assets — mudança nativa exige novo build.

## Checklist pré-submit

- [ ] Migration 0048 em prod  
- [ ] `IOS_APP_TEAM_ID` + `ANDROID_APP_SHA256` no deploy web  
- [ ] Passagem smoke OK em aparelho  
- [ ] Ícones gerados (`pnpm icones`)  
- [ ] `/privacidade` no ar (curl 200)  
- [ ] URL de privacidade preenchida nas fichas das lojas  
- [ ] Classificação etária / data safety (Play) preenchidos  
