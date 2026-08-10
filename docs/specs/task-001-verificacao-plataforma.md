# Task 001 — Verificação de plataforma

> **Tipo:** spike descartável. O código não vai para produção.
> **Origem:** [ADR 0005](../adr/0005-runtime-stack.md) — "Verificação obrigatória na semana 1".
> **Bloqueia:** todas as outras tarefas.

## Objetivo

Responder **sim ou não** a três perguntas antes de existir qualquer tela:

1. O Service Worker registra e sobrevive sob OpenNext no Cloudflare?
2. O IndexedDB persiste uma fila entre fechamentos de aba e reinícios do navegador?
3. Um PUT presigned chega no R2 direto do navegador, sem o servidor tocar nos bytes?

## Contexto

O [ADR 0005](../adr/0005-runtime-stack.md) escolheu Next.js sobre OpenNext assumindo dois custos declarados: *"OpenNext sobre Workers tem arestas"* e *"o SSR do Next briga com o PWA do convidado"*.

A rota `/e/[slug]` é a **exceção arquitetural do projeto** — deliberadamente client-heavy, porque a fila offline é o que decide a H1. Esta tarefa existe para provar que essa exceção é sustentável.

Se qualquer uma das três respostas for não, **o ADR 0005 é reaberto** antes de qualquer outra linha de código. É por isso que esta tarefa vem antes de tudo.

## Escopo

**Entra**

- Um projeto Next.js mínimo, implantado no Cloudflare via `@opennextjs/cloudflare`
- Uma rota `/spike` com Service Worker registrado e um `manifest`
- Uma fila em IndexedDB com três operações: enfileirar, listar, remover
- Um endpoint que assina URL do R2 e devolve dois PUTs presigned
- Um bucket R2 de teste

**Não entra**

- Qualquer tela do produto, qualquer identidade visual, qualquer token
- Banco de dados, autenticação, sessão
- Compressão de imagem, EXIF, thumbnail — a tarefa 004 cuida disso
- Qualquer coisa que dê vontade de aproveitar depois. **Este código é descartável por decisão**, e tratá-lo como base é como a aresta vira dívida.

## Contrato

### Fila (IndexedDB)

```ts
type ItemFila = {
  id: string          // uuid do cliente — é a chave de idempotência da 004
  blob: Blob
  criadoEm: number
  tentativas: number
}

enfileirar(item): Promise<void>
listar(): Promise<ItemFila[]>
remover(id): Promise<void>
```

### Presign

```
POST /api/spike/presign  →  { full: string, thumb: string, key: string }
```

**Invariante que já vale aqui**, ainda que seja spike: a **chave é derivada no servidor**. O cliente não a envia e não a escolhe. É a regra de [ADR 0002](../adr/0002-event-as-tenancy-boundary.md) e [ADR 0004](../adr/0004-anonymous-guest-session.md), e começar a violá-la no spike é como ela vaza para o produto.

## Como se verifica

Cada item roda numa aba de verdade, num aparelho de verdade. Nenhum passa por "funcionou na minha máquina".

| # | Prova | Critério |
|---|---|---|
| 1 | Abrir `/spike`, conferir o SW ativo nas ferramentas do navegador | `activated` e controlando a página |
| 2 | Recarregar com rede desligada | A página abre do cache |
| 3 | Enfileirar 3 itens, **fechar a aba**, reabrir | `listar()` devolve os 3 |
| 4 | Enfileirar, **encerrar o navegador**, reabrir | Os itens continuam lá |
| 5 | Pedir presign e fazer PUT de um arquivo de ~800 KB | 200, e o objeto aparece no bucket |
| 6 | Conferir o log do Worker no PUT | **Nenhum byte de mídia passou pelo servidor** |
| 7 | Repetir 1–6 no **Safari do iPhone** e num **Android antigo** | Passa nos dois |
| 8 | Background Sync no Android: enfileirar offline, ligar a rede sem tocar na tela | Sobe sozinho |

O item 7 não é opcional. O produto roda em 200 aparelhos alheios num salão de festas — Chrome no desktop não é evidência de nada. O item 8 pode falhar no iOS sem reprovar a tarefa; ele é o que define se o app instalado tem vantagem honesta a comunicar.

### Resultado

Instrumento em [`spike/plataforma/`](../../spike/plataforma/README.md). O `/spike` é o painel: cada seção é uma prova, na ordem desta tabela.

**Rodado em 2026-08-10, Chrome 1633×810 no macOS, contra o Worker local do OpenNext:**

| # | Prova | Resultado |
|---|---|---|
| 1 | SW ativo e controlando | ✅ `activated`, `controlando: true`, escopo `http://localhost:8788/` |
| 2 | Recarregar com a rede desligada | ✅ **Com o Worker morto de verdade**, a página abriu completa e hidratada |
| 3 | 3 itens, fechar a aba, reabrir | ✅ 3 itens, 2 457 600 bytes — número idêntico ao enfileirado |
| 4 | Encerrar o navegador | ⏳ Exige reiniciar o Chrome; fica para a rodada nos aparelhos |
| 5 | Presign + PUT de 800 KB | ✅ `200` pelo navegador, objeto de 800 KB no bucket. Ver nota de CORS |
| 6 | Log do Worker durante o PUT | ✅ 15 requisições no Worker, **`PUT: 0`**. Só presign, casca e assets |
| 7 | iPhone e Android antigo | ⏳ Aparelho na mão |
| 8 | Background Sync | ⏳ Android |

**A prova 5 falhou primeiro, e o modo da falha importa.** Antes do CORS, `curl` dava `200` e o navegador dava `TypeError: Failed to fetch` — rejeição antes de qualquer resposta. CORS é regra de cliente e o `curl` passa por cima dela, então **a única prova que vale é a do navegador**. Com a política aplicada, os dois passam: 800 KB em `200`, e um controle de 2 bytes junto para separar "CORS resolvido" de "upload grande quebrado".

Um detalhe que custou uma investigação: o preflight `OPTIONS` já respondia `204` com os cabeçalhos certos enquanto o navegador ainda recusava. Era preflight negativo em cache do Chrome. Ao diagnosticar CORS, sondar com `curl -X OPTIONS -H 'Origin: …'` separa configuração errada de cache velho — e só a segunda some sozinha.

`--upload-file` de 800 KB no `curl` devolve `200` **sem** `Access-Control-Allow-Origin`, mas com `-d` de 2 bytes devolve com. É o `Expect: 100-continue`, que o navegador não usa. Ou seja: `curl` grande dá falso negativo de CORS, além do falso positivo já citado. Não é ferramenta para essa pergunta.

A prova 2 merece uma nota de método. A primeira tentativa usou `Network.emulateNetworkConditions` do CDP e **deu falso positivo**: a página abriu, mas o log do Worker mostrou uma requisição nova. A emulação do CDP é do renderizador e não alcança o Service Worker, que tem contexto de rede próprio. A prova só vale com o servidor derrubado.

`SignedHeaders: host` é o que importa na prova 5: o `content-type` **não** entra na assinatura, então o navegador pode mandar o dele sem quebrar o PUT.

### Achados

**1. Node ≥ 20 é obrigatório, e a máquina tem 16 como padrão.**
`next@15` e `@opennextjs/cloudflare` recusam a 16. O padrão da máquina fica na 16 por decisão do mantenedor; a exceção é **por projeto**, em três camadas: `.nvmrc` na raiz (`nvm use` sobe os diretórios e acha), `engines: node >=20.9.0` com `engine-strict=true` no `.npmrc`, e o próprio pnpm 10, que não sobe abaixo da 18.

Verificado: sob a 16, `pnpm install` para com mensagem explícita em vez de quebrar num erro críptico três passos adiante. Isso vira imagem do CI na task 002.

**2. 🔴 O `headers()` do `next.config` não alcança `/public` sob OpenNext.**
O Workers Assets serve esses arquivos **antes** do Worker do Next, então a regra do `next.config` nunca roda. Descoberto justamente no `/sw.js`, onde o cabeçalho errado de cache é o que congela um Service Worker antigo em produção. Corrigido com `public/_headers`, que o build copia para os assets.

É exatamente a categoria de aresta que o ADR 0005 assumiu como custo — e o custo se pagou: apareceu na semana 1, num spike, e não no sábado às 20h.

**3. O risco "OpenNext não serve o SW no escopo certo" não se materializou.**
O plano B da tabela abaixo — servir o SW fora do pipeline do Next — já é o comportamento padrão. Não houve o que contornar.

**4. 🔴 O bug que só a prova offline pega: precachear não é servir.**
O `/fila-idb.js` estava no `PRECACHE` desde o primeiro commit e **nunca era lido**. O `fetch` do SW só tratava dois casos, `/_next/static/` e `navigate`. Um `<script src>` não é nenhum dos dois: caía direto na rede.

Online ninguém percebe. Offline, a página abria bonita, hidratada, com todos os botões — **e `window.FilaIDB` era `undefined`**. O convidado abriria a tela sem sinal, tiraria a foto e ela não entraria em fila nenhuma.

É o pior modo de falha que existe neste produto: não parece quebrado. Uma tela de erro o convidado tolera; uma tela que aceita a foto e a joga fora é a H1 indo a zero sem sinal nenhum no monitoramento. Corrigido com um terceiro ramo, cache-primeiro, para o que sobra.

**Este achado sozinho paga a task 001.** Nenhuma prova unitária pegaria: o arquivo estava no cache, o teste do cache passaria. Só quebrou porque a prova 2 foi rodada com o servidor derrubado de verdade e alguém olhou se a fila existia — e não só se a página apareceu.

**5. A credencial de upload não consegue configurar CORS, e isso é a propriedade certa.**
`PutBucketCors` com o token Object Read & Write devolve `403 AccessDenied`. O token que assina URL para cliente não autenticado não muda política de bucket. A configuração sai do painel, na mão, uma vez por ambiente — e entra no runbook da task 002.

## Riscos, e o plano para cada

| Risco | Sinal | Plano |
|---|---|---|
| OpenNext não serve o SW no escopo certo | SW registra mas não controla a página | Servir o SW como asset estático fora do pipeline do Next |
| Safari do iOS limita IndexedDB em modo restrito | Item 4 falha só no iPhone | Detectar na entrada e avisar, como a nuance N6.7 já prevê |
| CORS do R2 recusa o PUT do navegador | 403 no item 5 | Configurar CORS no bucket; se não resolver, o presign vai para o Worker |
| Background Sync ausente no iOS | Item 8 falha no iPhone | **Esperado.** Não reprova — é o que justifica o app instalado |
| OpenNext quebra em algo estrutural | Vários itens falham juntos | **Reabrir o ADR 0005.** A alternativa avaliada e descartada lá era Hono + SPA Vite, que não tem essa fricção |

## Definição de pronto

- Os oito itens verificados, com o resultado anotado neste arquivo
- Um parágrafo no ADR 0005 registrando o que se confirmou e o que se descobriu
- Se algo reprovou: um ADR novo, **antes** da tarefa 002 começar
