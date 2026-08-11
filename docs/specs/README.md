# Specs — a estratégia de execução

Uma spec é o **contrato de uma tarefa**, escrito antes do código. Ela existe para que quem executa não precise reabrir a discussão — e para que, meses depois, dê para saber por que a coisa ficou daquele jeito.

## A estratégia, em três regras

### 1. Risco técnico primeiro, não valor primeiro

O roadmap do produto é explícito: *"Semana 1 — schema + pipeline de upload ponta a ponta (**comece pelo risco técnico real**)"*.

Isso inverte o instinto normal de começar pela tela bonita. A razão é aritmética: se o Service Worker brigar com o OpenNext, ou se o PUT presigned no R2 não funcionar do jeito previsto, **isso muda a stack** — e descobrir com trinta telas construídas em cima custa semanas. Descobrir na semana 1 custa um dia.

### 2. Fatia vertical, nunca camada horizontal

Cada tarefa atravessa da interface ao banco e entrega algo verificável por um humano. Nenhuma tarefa é "montar o schema todo" ou "fazer os componentes".

*Por quê:* camada horizontal só se prova quando a última camada fecha, e aí tudo falha junto. Fatia vertical falha cedo e barato.

### 3. Toda tarefa tem prova, não relatório

A spec declara o **como se verifica** antes de começar. "Feito" significa que a prova roda, não que o autor acha que está pronto.

---

## A sequência do MVP

Seis semanas, uma pessoa, noites e fins de semana. A data do casamento não move.

| # | Tarefa | Entrega verificável | Sem. |
|---|---|---|---|
| **001** | [Verificação de plataforma](./task-001-verificacao-plataforma.md) | SW registra sob OpenNext · IndexedDB persiste · PUT presigned chega no R2 | 1 |
| [002](./task-002-monorepo-e-guards.md) | Monorepo, esqueleto e guards de CI | `pnpm dev` sobe · os cinco guards bloqueiam de propósito | 1 |
| [003](./task-003-schema-rls-isolamento.md) | Schema, RLS e testes de isolamento | Evento A não lê o B contra banco real, com id mal configurado | 1 |
| [004](./task-004-pipeline-upload.md) | Pipeline de upload ponta a ponta | Foto do celular chega no R2, com a rede caindo no meio | 2 |
| [005](./task-005-sessao-convidado.md) | Sessão do convidado e passagem web→app | QR → sessão em ≤ 3 toques · a sessão da web chega no app instalado | 2 |
| [006](./task-006-missoes-captura-editor.md) | Missões, captura e editor | Cinco toques do QR à foto no telão | 3 |
| [007](./task-007-feed-e-stories.md) | **Feed e stories** | Uploads por sessão sobem depois da 1ª abertura do feed | 3 |
| [008](./task-008-reacoes-e-galeria.md) | **Reações e galeria pessoal** | 3 pendentes sobrevivem a matar o app, e o convidado os vê | 4 |
| [009](./task-009-admin-e-pecas.md) | Admin: evento, missões, peças, gate de interação | PDF pronto para gráfica · o casal abre a interação em um toque | 4 |
| [010](./task-010-telao.md) | Telão | Roda 4h sem intervenção, sobrevive a queda de rede e a reload | 5 |
| [011](./task-011-moderacao.md) | Moderação, denúncia, bloqueio e botão de pânico | Foto sai da parede em menos de 5s | 5 |
| [012](./task-012-carga-e-app.md) | Teste de carga e app instalável | **150 uploads em 20 min** · instala no Android e no iOS | 5 |
| — | **Casamento real** | A métrica que decide o negócio | 6 |

> A tarefa 001 é **spike descartável**. O código dela não vai para produção — ela existe só para responder sim ou não. Se der não, o ADR 0005 é reaberto antes de qualquer outra linha.

### As três decisões de escopo, e o porquê de cada uma

**Feed e reações entraram no MVP.** O [ADR 0009](../adr/0009-app-social-do-convidado.md) aposta que o social é o mecanismo que faz o convidado subir foto. A H1 — ≥40% de participação — é justamente o que o MVP existe para medir. Entregar o MVP sem o feed testaria a hipótese antiga com o produto novo, e o resultado não decidiria nada.

**A landing saiu do MVP** e virou a [013](./task-013-landing-e-conversao.md). Ela converte estranhos, e no primeiro casamento não existem estranhos — o casal já está contratado. É a semana que paga o feed. Se isso doer, a alternativa honesta não é cortar a landing pela metade: é adiar a data.

**Comentário ficou de fora**, mesmo sendo pedido explícito. Pelo próprio critério do ADR 0009, é a funcionalidade social de menor alavanca sobre upload e maior custo — moderação de texto, LGPD e superfície nova para o perseguidor. Ele volta na [014](./task-014-comentarios.md), com a instrumentação da 007 e da 008 dizendo se interação move upload de verdade.

**O risco desta sequência, dito de frente:** ela é mais apertada que a anterior. Se a semana 4 escorregar, o corte é a **008**, não a 007 — ver o que os outros mandaram move mais upload do que receber reação na própria foto.

## Depois do MVP — Fase 2

| # | Tarefa | Origem |
|---|---|---|
| [013](./task-013-landing-e-conversao.md) | Landing e conversão | Sai do MVP por escopo, não por importância |
| [014](./task-014-comentarios.md) | Comentários | Com thread. Exige a 011 pronta |
| [015](./task-015-compartilhar.md) | Compartilhar com moldura | O único canal viral gratuito. Tem pendência de consentimento |
| [016](./task-016-album-da-noite.md) | Álbum da noite | A linha do tempo por hora |
| [017](./task-017-app-expo-e-lojas.md) | App Expo e lojas | Nativo, com o domínio vindo de `packages/core`. **US$ 99/ano + US$ 25** |
| [018](./task-018-musica-do-casal.md) | A música do casal | Link e sugestão. Áudio embutido **não** — [ADR 0011](../adr/0011-musica-do-evento-sem-direito-de-sincronizacao.md) |

Fora de spec por decisão de roadmap: entrega por WhatsApp, agrupamento facial (bloqueado em parecer jurídico), export para Drive, livro de fotos, portal do fornecedor, multi-evento, checkout.

## O critério que decide escopo social

Do [ADR 0009](../adr/0009-app-social-do-convidado.md), e vale para toda spec daqui em diante:

> Quem paga são os noivos. O que eles querem é ficar com as fotos dos 200 convidados. O que impede é o convidado não subir. O social é o mecanismo.

**Toda funcionalidade social se julga por volume de upload, nunca por tempo de tela.** A pergunta é sempre *"isso aumenta a chance de a tia mandar a foto que está no rolo dela?"*. É por isso que as specs 007 e 008 têm instrumentação de upload como prova, e não "a tela renderiza".

## A stack, concreta

Decidida nos ADRs [0005](../adr/0005-runtime-stack.md) e [0006](../adr/0006-hosting-platform.md). As escolhas de biblioteca abaixo são default — trocar exige justificativa na spec, não na conversa.

| Camada | Escolha | Nota |
|---|---|---|
| Framework | **Next.js App Router** + TypeScript | `/e/[slug]` é client-heavy por decisão |
| Runtime | **Cloudflare Workers** via `@opennextjs/cloudflare` | Sem cold start; escala a zero |
| Banco | **Neon** (Postgres 16) | 🔴 Driver **com transação** em todo caminho de evento — `SET LOCAL` exige uma |
| ORM | **Drizzle** | Migrations versionadas, leve, tipos do schema |
| Storage | **Cloudflare R2** | Egress zero. PUT presigned direto |
| Fila | **Cloudflare Queues** + Cron Triggers | Retenção, entrega, export |
| Estilo | **Tailwind 4** com `@theme` no `packages/ui` | Tokens do evento em custom properties |
| Fila no cliente | **IndexedDB** direto, sem wrapper | A fila é a fonte da verdade; abstração aqui é risco |
| Imagem | **Canvas 2D** | Compressão, EXIF, thumb, filtros. Zero IA |
| PDF | **SVG → PDF** (Satori/resvg) | Em fila, nunca em request |
| Testes | **Vitest** + **Playwright** | Isolamento contra banco real, nunca mock |
| E-mail | **Resend** | Magic link e avisos |
| Pacotes | **pnpm** workspace | |

**O que não entra, e por quê:** biblioteca de estado global (o estado vive na fila e no servidor), biblioteca de componentes pronta (o `packages/ui` é o sistema), wrapper de IndexedDB, SDK de IA generativa.

## Formato

```
# Task NNN — título

## Objetivo        uma frase: o que passa a ser possível
## Contexto        de onde isso veio (ADR, fluxo, nuance)
## Escopo          o que entra e o que explicitamente não entra
## Contrato        interfaces, schema, invariantes
## Como se verifica a prova, escrita antes de começar
## Riscos          o que pode dar errado, e o plano
```

## Regras que valem para toda spec

- **O que não entra é tão importante quanto o que entra.** Escopo sem fronteira vira scope creep, e o prazo é a única coisa que não negocia.
- **Toda spec cita a origem** — o ADR, a seção da arquitetura ou a nuance do fluxo. Sem isso, a decisão vira folclore.
- **Nenhuma spec reabre decisão já tomada.** Se a execução mostrar que a decisão estava errada, o caminho é um ADR novo, não uma exceção silenciosa na spec.
