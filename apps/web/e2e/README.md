# 🎯 Testes E2E do Albora

Testes end-to-end usando Playwright para validar o fluxo completo do convidado.

## 📦 Setup

### Instalar dependências
```bash
pnpm install
```

### Instalar navegadores do Playwright
```bash
npx playwright install
```

## 🚀 Executar Testes

### Modo normal (headless)
```bash
pnpm test:e2e
```

### Modo UI (interactive)
```bash
pnpm test:e2e:ui
```

### Modo debug
```bash
pnpm test:e2e:debug
```

### Ver relatório HTML
```bash
pnpm test:e2e:report
```

## 📂 Estrutura

```
e2e/
├── specs/                          # Testes E2E
│   ├── guest-upload-flow.spec.ts   # Fluxo completo de upload
│   ├── guest-upload-flow-offline.spec.ts # Retry offline
│   └── ...                         # Mais testes
├── helpers/                        # Funções auxiliares
│   ├── setup-test-event.ts         # Cria evento de teste
│   ├── cleanup.ts                  # Limpa dados
│   └── auth-helpers.ts             # Gera tokens
├── fixtures/                       # Dados de teste
│   ├── events.json
│   ├── tokens.json
│   └── photo.jpg
└── README.md                       # Este arquivo
```

## 📊 Cobertura

| Teste | Descrição | Status |
|-------|-----------|--------|
| guest-upload-flow | Fluxo completo (happy path) | 🔜 |
| guest-upload-flow-offline | Retry em caso de offline | 🔜 |
| guest-upload-flow-slow | Rede 3G lenta | 🔜 |
| guest-multi-mission | Múltiplas missões | 🔜 |
| guest-upload-isolation | Isolamento RLS | 🔜 |
| guest-exif-removal | Remoção de EXIF/GPS | 🔜 |
| guest-story-degradation | Story degradável | 🔜 |

## 🛡️ Caminho Crítico

Estes testes validam o fluxo de sábado às 20h:

1. ✅ QR → Landing
2. ✅ Consentimento LGPD
3. ✅ Captura → Upload → Confirm
4. ✅ Validação de missões
5. ✅ Confirmação visual

## 🎯 Performance Targets

- **LCP**: < 2.5s
- **INP**: < 200ms
- **TTI**: < 3.0s
- **Upload + Confirm (3G)**: < 5s

## 📚 Recursos

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
