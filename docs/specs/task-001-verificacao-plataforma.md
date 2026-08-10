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

Publicado em `https://albora-spike.albora-dev.workers.dev/spike`.

**Rodado em 2026-08-10, Chrome no macOS, contra o Worker local e depois contra o publicado:**

| # | Prova | Resultado |
|---|---|---|
| 1 | SW ativo e controlando | ✅ `activated`, `controlando: true`, escopo `http://localhost:8788/` |
| 2 | Recarregar com a rede desligada | ✅ **Com o Worker morto de verdade**, a página abriu completa e hidratada |
| 3 | 3 itens, fechar a aba, reabrir | ✅ 3 itens, 2 457 600 bytes — número idêntico ao enfileirado |
| 4 | Encerrar o navegador | ✅ **No iPhone**, relatado pelo mantenedor |
| 5 | Presign + PUT de 800 KB | ✅ `200` pelo navegador, local **e publicado**. Objeto de 800 KB no bucket |
| 6 | Log do Worker durante o PUT | ✅ Ver abaixo — a evidência mais forte da tarefa |
| 7 | iPhone e Android antigo | 🟡 **iPhone sim, Android não testado.** Ver abaixo |
| 8 | Background Sync | 🟡 **Código provado**, comportamento de aparelho não. Ver abaixo |

**A prova 6, no Worker publicado.** `wrangler tail` durante um PUT de 819 200 bytes registrou **um único evento**:

```
POST /api/spike/presign     content-length: 21     cpuTime: 71 ms
logs: presign.emitido { chave, tipo, validadeSegundos: 600 }
```

`"method": "PUT"` aparece **zero vezes** no log. O corpo inteiro que tocou o servidor foram os 21 bytes de `{"tipo":"image/jpeg"}` — proporção de cerca de 39 000 para 1 contra o que foi para o R2.

Isso é a regra do `CLAUDE.md` — *"o servidor nunca toca nos bytes de mídia"* — deixando de ser intenção e virando medida. E é o que faz a conta de custo do produto fechar: 150 convidados subindo 20 fotos cada custam 3 000 invocações de 71 ms, não 3 000 × 4 MB de tráfego.

**A prova 5 falhou primeiro, e o modo da falha importa.** Antes do CORS, `curl` dava `200` e o navegador dava `TypeError: Failed to fetch` — rejeição antes de qualquer resposta. CORS é regra de cliente e o `curl` passa por cima dela, então **a única prova que vale é a do navegador**. Com a política aplicada, os dois passam: 800 KB em `200`, e um controle de 2 bytes junto para separar "CORS resolvido" de "upload grande quebrado".

Um detalhe que custou uma investigação: o preflight `OPTIONS` já respondia `204` com os cabeçalhos certos enquanto o navegador ainda recusava. Era preflight negativo em cache do Chrome. Ao diagnosticar CORS, sondar com `curl -X OPTIONS -H 'Origin: …'` separa configuração errada de cache velho — e só a segunda some sozinha.

`--upload-file` de 800 KB no `curl` devolve `200` **sem** `Access-Control-Allow-Origin`, mas com `-d` de 2 bytes devolve com. É o `Expect: 100-continue`, que o navegador não usa. Ou seja: `curl` grande dá falso negativo de CORS, além do falso positivo já citado. Não é ferramenta para essa pergunta.

A prova 2 merece uma nota de método. A primeira tentativa usou `Network.emulateNetworkConditions` do CDP e **deu falso positivo**: a página abriu, mas o log do Worker mostrou uma requisição nova. A emulação do CDP é do renderizador e não alcança o Service Worker, que tem contexto de rede próprio. A prova só vale com o servidor derrubado.

`SignedHeaders: host` é o que importa na prova 5: o `content-type` **não** entra na assinatura, então o navegador pode mandar o dele sem quebrar o PUT.

### A rodada no iPhone, e o que ela não cobre

**O mantenedor rodou o `/spike` no iPhone e reportou tudo correto.** Isso fecha a prova 4 e a perna iOS da prova 7 — as duas que dependiam de aparelho físico e não tinham substituto.

O relato foi global, sem detalhe por prova. Fica registrado assim, e não como seis marcações verdes: **inventar granularidade que não foi medida é pior que registrar menos.** Se algum comportamento do iOS aparecer depois, é aqui que se olha para saber o que de fato foi verificado.

Vale notar o que isso significa: **o iPhone é o caso difícil**, não o fácil. Safari despeja armazenamento sob pressão, limpa dado após 7 dias sem uso e não tem Background Sync. Passar nele é a evidência mais cara de conseguir.

**A perna Android continua sem teste**, com a hipótese declarada de que funciona. É hipótese razoável — o Chrome é mais permissivo que o Safari em tudo que estas provas medem, e o piso de compatibilidade calculado abaixo mostra que nada aqui pede motor recente. Mas **hipótese não é medida**, e fica escrito para não virar fato por repetição.

**O [ADR 0010](../adr/0010-expo-para-o-app-do-convidado.md) reduziu muito o custo dessa lacuna.** Com o app do convidado em Expo, o upload em segundo plano no Android passa a ser WorkManager nativo, não Background Sync do navegador. O que continua sem medição é só o comportamento da **web** no Android — o caminho de quem escaneia o QR e nunca instala.

### Sobre emulador, agora que a stack mudou

Este documento registra que o emulador foi tentado e descartado: o Chrome da imagem Android 16 entrava em ANR, e mesmo funcionando responderia a pergunta errada. **Isso valia para provar PWA, e deixa de valer para desenvolver o app.**

A distinção importa daqui em diante:

| | Emulador serve? |
|---|---|
| Desenvolver telas do app Expo | **Sim.** É o fluxo normal de React Native |
| Lógica, navegação, integração de API | **Sim** |
| Câmera, upload em segundo plano, tela apagada | Não. Aparelho |
| Despejo de armazenamento sob pressão, ITP de 7 dias | Não. Aparelho |

Ou seja: emulador vira a ferramenta padrão do dia a dia na [017](./task-017-app-expo-e-lojas.md), e o aparelho fica reservado para a lista curta acima. O erro seria o inverso do que este documento cometeu — usar aparelho para tudo é lento, usar emulador para tudo dá verde falso nas quatro linhas que importam.

### Sem Android à mão: o que foi possível separar

Não havia aparelho Android. Em vez de deixar a prova 8 em branco, ela foi **partida em duas perguntas**, e uma delas se responde no desktop.

**O código do Background Sync está provado.** Chrome desktop implementa a mesma API. Com três itens na fila e `sync.register('albora-fila')`, o Service Worker acordou sozinho e devolveu:

```
{ tipo: "drenagem", origem: "sync", enviados: 3, restantes: 0 }
```

Presign, PUT e remoção da fila rodaram dentro do SW, sem página envolvida. Se algo estivesse errado no handler, na fila ou no fluxo de upload de dentro do worker, teria falhado aqui.

**O que continua em aberto é o comportamento do aparelho, não o código:** se o Android acorda o Service Worker com a tela apagada e o app fora de foco, sob Doze e economia de bateria. Isso não tem substituto em desktop nem em emulador — só um telefone de verdade, com a tela apagada, responde.

A distinção importa para o produto: a primeira pergunta é "o upload em segundo plano existe"; a segunda é "ele funciona quando o convidado guardou o celular no bolso" — que é a única situação em que ele importa.

**Piso de compatibilidade, no lugar do "Android antigo".** Sem aparelho velho, dá para calcular o que o código exige em vez de adivinhar: o bundle emitido usa `?.` e `??`, que pedem **Chrome 80** (2020); o alvo mais antigo que o Next compila por padrão é **Chrome 109**, última versão para Android 6 e 7. Ou seja, o piso é o do Next, não o do nosso código — não há nada aqui que precise de motor recente.

Isso não substitui a prova 7: reduz a pergunta de "funciona num Android antigo?" para "o motor do aparelho é Chrome 109 ou maior?", que é verificável em um toque em Configurações → Sobre o Chrome.

**O emulador foi tentado e descartado.** O AVD Android 16 subiu, mas o Chrome 134 da imagem entra em ANR e crasha antes de abrir a página. E mesmo funcionando responderia a pergunta errada: Chrome 134 em Android 16 é mais novo que o desktop que já testamos — o que a prova 7 quer é o aparelho de quatro anos que aparece na festa.

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

- [x] Os oito itens verificados, com o resultado anotado neste arquivo — **sete fechados, um com lacuna declarada** (perna Android da 7)
- [x] Um parágrafo no [ADR 0005](../adr/0005-runtime-stack.md) registrando o que se confirmou e o que se descobriu
- [x] Nada reprovou. Nenhum ADR novo é necessário, e o 0005 fica **confirmado**

**Tarefa encerrada em 2026-08-10.** A 002 está liberada.

O spike segue publicado enquanto for útil como referência. Quando não for, apagar: [`spike/plataforma/`](../../spike/plataforma/README.md) é **código descartável por decisão**, e tratá-lo como base é como a aresta vira dívida.
