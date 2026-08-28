# Albora — Práticas de engenharia

> **Status:** fundação. Independente de runtime.
> **Última revisão:** 2026-08-15

Este documento cobre o que é **específico do Albora**. Os princípios gerais de código limpo, tratamento de erro e observabilidade não são repetidos aqui — as regras de trabalho estão em [`../CLAUDE.md`](../CLAUDE.md) e valem integralmente.

O que segue são as decisões de estrutura que, se ignoradas, custam semanas para desfazer.

---

## 1. A regra de dependência

Uma seta, e ela nunca inverte:

```
   transporte  ──▶  aplicação  ──▶  domínio
   (handler,        (casos de        (regras,
    rota, SSE)       uso)             invariantes)

   pack  ──▶  core        core nunca importa pack
```

**O domínio não sabe onde está rodando.** Não conhece request, não conhece resposta HTTP, não conhece o SDK do armazenamento, não conhece o cliente do banco. Recebe dados, devolve decisões.

Isso tem uma razão prática além da estética: [ADR 0006](./adr/0006-hosting-platform.md) escolheu Cloudflare Workers, que é a mais específica das três dependências de plataforma. Manter a lógica de negócio em código puro, com o handler como camada fina de transporte, é o que mantém essa escolha reversível. Se a plataforma mudar, muda o adaptador — não o produto.

**O núcleo não sabe que casamento existe.** Ele conhece `event`, `host`, `guest`, `challenge`, `upload`. Casamento e 15 anos são packs: vocabulário, missões, templates, tom. Guard bloqueante no CI impede o import invertido.

---

## 1.1 Onde a feature mora na web

A UI de produto não vive em `app/` além da página fina. Cada superfície tem pasta em `apps/web/features/`:

| Pasta | Superfície |
|---|---|
| `guest` | Entrada, sessão, recado, funil, chrome do convidado |
| `photo` | Câmera, editor, fila, upload |
| `feed` | Feed, reação, comentário |
| `album` | Álbum da noite e capítulos |
| `missions` | Missões do convidado |
| `music` | Trilha e sugestão |
| `my-photos` | Galeria pessoal e share Stories |
| `cover` | Hub `/cover` |
| `admin` | Wizard, painel, missões, recado, funil, peças |
| `wall` / `wall-pairing` | Telão e autorização da TV |
| `catalog` | Catálogo `/telas` — não é o produto |

Handler HTTP em `apps/web/app/api/` (EN canônico; PT reexporta). Domínio em `packages/core`. Persistência em `packages/db`.

---

## 2. Onde cada coisa mora

| Tipo de lógica | Onde | Exemplo |
|---|---|---|
| Invariante de negócio | domínio | "só mídia aprovada vai ao telão"; "confirmação é idempotente" |
| Orquestração de caso de uso | aplicação | "confirmar upload: valida, persiste, enfileira moderação, emite evento de funil" |
| Fronteira e escopo | adaptador de banco | `SET LOCAL app.event_id` na abertura da transação — **um lugar só** |
| Forma do transporte | handler | ler cookie, montar resposta, código de status |
| Resolução de token | package compartilhado | usado por web, telão e pipeline de impressão, sem duplicação |
| Vocabulário e conteúdo | pack | toda string que um humano lê |

**Regra prática:** se você consegue testar sem subir servidor nem banco, está no lugar certo. Se precisa de um request de mentira para testar uma regra de negócio, a regra está na camada errada.

---

## 3. Onde a disciplina compra mais

Três pontos concentram quase todo o risco de manutenção do projeto. Vale gastar cuidado desproporcional neles.

### 3.1 O escopo de evento é definido em exatamente um lugar

`SET LOCAL app.event_id` acontece na abertura da transação, num único helper. Nenhum caso de uso o chama diretamente; nenhum handler o chama.

*Por quê:* dois lugares viram cinco. Cinco viram um esquecido, e o esquecido não dá erro — dá uma política de RLS que não casa com nada, e o sintoma aparece como "sumiu tudo", não como "vazou tudo". É a falha mais provável de toda a arquitetura ([ADR 0006](./adr/0006-hosting-platform.md) documenta a armadilha do driver).

### 3.2 O resolvedor de tokens é único

Web, telão e pipeline SVG→PDF consomem o mesmo resolvedor, com a mesma cadeia de fallback. Nenhum renderizador implementa o seu.

*Por quê:* se divergirem, a placa impressa não combina com o telão — e essa coerência é literalmente o que o produto vende ([ADR 0003](./adr/0003-runtime-token-resolution.md)).

### 3.3 A fila do cliente é a fonte da verdade do upload

O estado de um upload em trânsito mora no IndexedDB, não em estado de componente. A interface lê a fila; não a espelha.

*Por quê:* o convidado troca de app, o navegador suspende a aba, o sinal cai. Estado espelhado em memória diverge no primeiro desses eventos — e os três acontecem numa festa, na mesma noite.

---

## 4. Nomes

O schema e o núcleo são genéricos desde o primeiro commit. Custa zero agora; retrofitar custa semanas, e a conta chega justamente quando você estiver ocupado vendendo.

| Nunca | Sempre |
|---|---|
| `couple_names`, `bride`, `groom` | `title`, `subtitle`, `host` |
| `wedding_date` | `event_date` |
| `guests_of_the_couple` | `guest` |
| `"Os noivos"` no componente | resolvido pelo pack |

O teste de sanidade: **trocar o pack de um evento muda toda a UI sem tocar uma linha do núcleo.** Se algo escapa, o vocabulário vazou para o lugar errado.

---

## 5. Estratégia de teste

O que se testa importa mais que quanto. A cobertura escalona por fase ([`../CLAUDE.md`](../CLAUDE.md)); estes quatro não escalonam.

| Nível | O que | Contra o quê |
|---|---|---|
| **Isolamento** 🔴 | Evento A não lê o B, mesmo com id mal configurado | **Banco real**, nunca mock. Job de CI dedicado e visível |
| **Domínio** | Invariantes e máquina de estados do upload | Nada. Funções puras |
| **Contrato** | Presign, confirm, idempotência, validação de magic bytes, cabeçalhos de mídia | Banco e armazenamento reais ou dublê local |
| **Caminho crítico** 🔴 | QR → consentimento → captura → upload → confirmação | Pilha real, com rede degradada simulada |
| **Carga** 🔴 | **150 uploads em 20 minutos**, antes do primeiro evento | Ambiente real |

**Testar isolamento contra mock prova que o mock está isolado.** É o único lugar do projeto onde dublê é proibido por regra, não por preferência.

**A rede degradada não é caso de borda, é o caso normal.** Testar upload só em rede boa testa o cenário que não acontece. Perda de conexão no meio, retry, aba fechada com fila pendente e confirmação duplicada são caminhos principais, e merecem teste como tal.

---

## 6. Migrations

Forward-only em produção. Uma migration já aplicada nunca é reescrita — escreve-se outra.

Toda tabela nova nasce com `event_id`, RLS forçado e política, na mesma migration. **Tabela sem política é tabela que vaza**, e o intervalo entre "criei a tabela" e "adiciono o RLS depois" é onde isso acontece.

---

## 7. O que é verificado por máquina

Disciplina que depende de lembrar não é disciplina. Bloqueantes no CI desde o primeiro commit:

| Guard | Falha quando |
|---|---|
| Isolamento entre eventos | Um evento lê dado de outro |
| Conformidade de tokens | Hex literal ou cor arbitrária em componente |
| Disciplina de packs | `core` importa de `pack` |
| Sessão | Token aparece em querystring ou em log |
| Nomenclatura | Alias PT reverso ou seção legado num barrel (`ADR 0014`) |
| Cabeçalhos de mídia | CSP, `nosniff` ou `Content-Disposition` divergem do contrato |
| Segredos | Segredo em commit |
| Dependências | Vulnerabilidade conhecida; lockfile ausente |

Cada guard tem **auto-teste com fixture deliberadamente violadora**, que precisa falhar. Sem isso, um guard pode parar de verificar qualquer coisa e ninguém percebe — ele continua verde, que é exatamente como ele parece quando está funcionando.

Rebaixar um gate para deixar o CI verde é violação não negociável.

---

## 8. Comentários

Regra completa em [`../CLAUDE.md`](../CLAUDE.md). Resumo: por padrão, nenhum.

O tipo que **vale** manter neste projeto, com exemplos reais do domínio:

```
// SET LOCAL, nunca SET: o pool devolve a conexão a cada COMMIT
// e um setting de sessão vaza para o próximo evento.

// Falha aberto de propósito: deletar acervo com export pendente
// destrói memória insubstituível.

// Ordem importa: rate limit antes do presign, para que um request
// condenado não queime cota.
```

Os três dizem por que algo é do jeito que é, e nenhum deles é dedutível do código ao lado. Comentário que narra o que a próxima linha faz não sobrevive à próxima linha.
