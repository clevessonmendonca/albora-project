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
