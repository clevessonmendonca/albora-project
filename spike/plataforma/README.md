# Spike de plataforma — task 001

> **Descartável por decisão.** Este código responde sim ou não a três perguntas e depois morre.
> Não é base de nada. Aproveitar qualquer parte dele na task 002 é como a aresta vira dívida.

Ver [`docs/specs/task-001-verificacao-plataforma.md`](../../docs/specs/task-001-verificacao-plataforma.md).

## O que ele prova

1. O Service Worker registra, ativa e **controla** a página sob OpenNext no Cloudflare
2. O IndexedDB persiste a fila entre fechamentos de aba e reinícios do navegador
3. Um PUT presigned chega no R2 direto do navegador, sem o servidor tocar nos bytes

## Antes de rodar

Node **≥ 20**. A máquina tem 16 como padrão; use a 22:

```sh
nvm use 22            # ou: export PATH="$HOME/.nvm/versions/node/v22.21.1/bin:$PATH"
corepack enable
```

Preencha no `.env` da **raiz do repositório** — nunca aqui:

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=albora-spike
```

`R2_ACCESS_KEY_ID` é o **Access Key ID** da tela do token R2, não o "Token value". O token
value é da API de gerência da Cloudflare e produz `SignatureDoesNotMatch` no PUT.

Depois:

```sh
pnpm install
./scripts/sincronizar-env.sh     # .env da raiz → .dev.vars e .env.local
```

## CORS do bucket

O PUT vem do navegador, então sem CORS ele volta 403 — é o risco previsto na spec.
No painel do R2 → bucket → **Settings → CORS Policy**, cole o [`cors-r2.json`](./cors-r2.json)
trocando a origem pelo domínio real do deploy.

## Rodar

```sh
pnpm dev        # localhost:3000 → /spike
pnpm preview    # build OpenNext + Worker local, mais próximo de produção
pnpm deploy     # publica no Cloudflare
```

**Provas 1 a 6 exigem `preview` ou `deploy`**, não `pnpm dev`. O `next dev` não passa pelo
OpenNext — e a pergunta da tarefa é justamente sobre o OpenNext. As provas 7 e 8 exigem o
deploy, porque o celular precisa de HTTPS público (Service Worker só registra em contexto seguro).

## Rodar as oito provas

O `/spike` é o painel: cada seção corresponde a uma prova, na ordem da spec.
Anote o resultado **no arquivo da spec**, não aqui.

| # | O que fazer | O que tem de acontecer |
|---|---|---|
| 1 | Abrir `/spike` | Chip "SW activated" + "controlando" |
| 2 | Recarregar uma vez com rede, depois desligar e recarregar | A página abre |
| 3 | "Enfileirar 3", fechar a aba, reabrir | 3 itens, ~2400 KB |
| 4 | Encerrar o navegador inteiro e reabrir | Os 3 continuam |
| 5 | "Subir 800 KB" | `✓ PUT 200` no registro e o objeto na lista do bucket |
| 6 | `npx wrangler tail albora-spike` durante o PUT | Só `presign.emitido`. Nenhum byte de mídia |
| 7 | Repetir 1–6 no Safari do iPhone e num Android antigo | Passa nos dois |
| 8 | Android: enfileirar offline → "Registrar sync" → sair da tela → religar | Sobe sozinho |

A prova 8 falhar no iOS **não reprova** — é o que define se o app instalado tem vantagem
honesta a comunicar.

## Se algo reprovar

Vários itens falhando juntos significa **reabrir o ADR 0005** antes da task 002 começar.
A alternativa avaliada e descartada lá era Hono + SPA Vite.
