# Spike de plataforma — task 001

> **Descartável por decisão.** Este código responde sim ou não a três perguntas e depois morre.
> Não é base de nada. Aproveitar qualquer parte dele na task 002 é como a aresta vira dívida.

Ver [`docs/specs/task-001-verificacao-plataforma.md`](../../docs/specs/task-001-verificacao-plataforma.md).

## O que ele prova

1. O Service Worker registra, ativa e **controla** a página sob OpenNext no Cloudflare
2. O IndexedDB persiste a fila entre fechamentos de aba e reinícios do navegador
3. Um PUT presigned chega no R2 direto do navegador, sem o servidor tocar nos bytes

## Antes de rodar

Node **≥ 20**, sem mexer no padrão da máquina. O `.nvmrc` da raiz do repositório
fixa a 22 só aqui dentro:

```sh
nvm use               # lê o .nvmrc subindo os diretórios → 22
corepack enable
```

Três camadas garantem que ninguém rode sob a versão errada por engano: o `.nvmrc`
diz qual é, o `engines` do `package.json` com `engine-strict` recusa a instalação,
e o próprio pnpm 10 não sobe abaixo da 18.

Para o `nvm use` acontecer sozinho ao entrar na pasta, o hook de auto-troca do nvm
no `.zshrc` resolve — mas isso é configuração da sua máquina, não do repositório.

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
./scripts/publicar.sh   # build + deploy + segredos
```

**Provas 1 a 6 exigem `preview` ou deploy**, não `pnpm dev`. O `next dev` não passa pelo
OpenNext — e a pergunta da tarefa é justamente sobre o OpenNext.

## Testar nos aparelhos

**O celular não alcança `localhost`, e não é questão de rede.** Service Worker só registra
em contexto seguro: HTTPS, ou `localhost` na própria máquina. Apontar o celular para o IP
da sua rede (`http://192.168.x.x:8788`) faz a página abrir e **o SW não registrar** — e o
painel vai mostrar isso como falha, sem ser culpa da plataforma. Por isso as provas de
aparelho exigem deploy de verdade.

```sh
npx wrangler login        # OAuth no navegador, uma vez
./scripts/publicar.sh
```

O script imprime o `https://albora-spike.<subdomínio>.workers.dev`. **Acrescente essa origem
ao CORS do bucket** antes de tentar a prova 5 no celular — é a mesma configuração de antes,
e a origem do deploy não é a mesma do preview.

**No primeiro deploy de um subdomínio novo, a URL fica ~2 minutos fora do ar.** O DNS resolve
na hora, mas o certificado TLS ainda não foi emitido, e o erro é de handshake — no celular
aparece como "não foi possível conectar". Parece falha da plataforma e é só espera.

Para levar a URL ao aparelho sem digitar, gere um QR dela — que é, aliás, exatamente o
gesto do produto.

### O que fazer em cada aparelho

Rode as provas 1 a 6 nos dois, na ordem, lendo o resultado no painel do próprio `/spike`.
Ele registra tudo na seção **Registro**, no fim da página — não precisa de console.

| # | Gesto | Passa se |
|---|---|---|
| 1 | Abrir `/spike` | Chip `SW activated` **e** `controlando` |
| 2 | Recarregar uma vez, ligar o modo avião, recarregar | A página abre completa |
| 3 | Ainda offline: "Enfileirar 3" | 3 itens, 2400 KB — e **nenhum `✗ FilaIDB indisponível`** no registro |
| 4 | Encerrar o navegador de vez e reabrir | Os 3 continuam lá |
| 5 | Tirar o modo avião, "Subir 800 KB" | `✓ PUT 200` no registro, objeto na lista do bucket |
| 6 | `npx wrangler tail albora-spike` no Mac durante o 5 | Só `presign.emitido`. Nenhum PUT |

Na prova 6, o número que interessa não é o `presign.emitido` aparecer — é o `content-length`
do evento. Ele tem de ficar na casa das dezenas de bytes enquanto a foto tem centenas de
milhares. Se um dia aparecer um evento de `PUT`, o caminho crítico regrediu.

Se for canalizar o `tail` para arquivo, use `--format json`: o `pretty` bufferiza quando a
saída não é um terminal e o arquivo fica vazio, o que parece "nenhuma requisição chegou" —
exatamente a conclusão errada nesta prova.

A prova 3 **offline** é a que mais importa, e a que quase passou batida no desktop: o bug era
a página abrir inteira e a fila não existir. `✗ FilaIDB indisponível` no registro é a
assinatura exata dele voltando.

### iPhone — as pegadinhas

- **Safari, e só Safari.** Todo navegador no iOS usa WebKit por baixo, mas Service Worker
  fora do Safari é território de comportamento inconsistente. Teste no Safari.
- **Navegação privada mata o IndexedDB.** A prova 4 falha e a culpa não é da plataforma.
  Confira que a aba é normal.
- **"Encerrar o navegador" na prova 4 é fechar o app**, deslizando para cima no seletor de
  apps — não é fechar a aba. Fechar a aba é a prova 3.
- **Instalar via Compartilhar → Adicionar à Tela de Início** e repetir a 1 e a 3. É o que
  diz se o app instalado se comporta diferente do Safari, e isso muda o que a landing pode
  prometer.
- **A prova 8 vai falhar, e está previsto.** A Apple não implementa Background Sync. Isso
  não reprova a tarefa — define a vantagem honesta do app instalado.
- Console, se precisar: Mac → Safari → Desenvolvedor → *nome do iPhone*. Exige "Web
  Inspector" ligado em Ajustes → Safari → Avançado.

### Android antigo — as pegadinhas

- **"Antigo" é o ponto.** Um Chrome recente não prova nada que o seu desktop já não tenha
  provado. Interessa um aparelho de 4 a 6 anos, que é o que aparece numa festa.
- **Confira a versão do Chrome** em Configurações → Sobre o Chrome, e anote junto do
  resultado. "Falhou no Android" sem versão não é informação reaproveitável.
- **Prova 8, o roteiro exato:** modo avião → "Enfileirar 3" → "Registrar sync" → **sair da
  tela** (botão home, tela apagada) → tirar o modo avião → esperar até um minuto → voltar.
  Passa se o registro mostrar `SW drenou (sync)` e a fila estiver vazia.
  Sair da tela não é opcional: o objetivo é provar que sobe **sem** o convidado voltar ao app.
- Console: `chrome://inspect` no Chrome do Mac, com depuração USB ligada no aparelho.

### Anotar o resultado

Marque as provas na tabela de [`docs/specs/task-001-verificacao-plataforma.md`](../../docs/specs/task-001-verificacao-plataforma.md),
com o modelo e a versão do navegador. Depois disso falta só o parágrafo no ADR 0005 —
o último item da definição de pronto.

## Se algo reprovar

Vários itens falhando juntos significa **reabrir o ADR 0005** antes da task 002 começar.
A alternativa avaliada e descartada lá era Hono + SPA Vite.
