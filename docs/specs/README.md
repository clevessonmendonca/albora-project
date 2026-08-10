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
| 002 | Monorepo, esqueleto e guards de CI | `pnpm dev` sobe · os quatro guards bloqueiam de propósito | 1 |
| 003 | Schema, RLS e testes de isolamento | Evento A não lê o B contra banco real, com id mal configurado | 1 |
| 004 | Pipeline de upload ponta a ponta | Foto do celular chega no R2 e aparece na galeria, com a rede caindo no meio | 2 |
| 005 | Sessão do convidado e consentimento | QR → consentimento → nome → sessão, em ≤ 3 toques | 2 |
| 006 | Missões, captura e editor | Cinco toques do QR à foto no telão | 3 |
| 007 | Admin: evento, missões, geração de peças | PDF sai pronto para gráfica, com QR que escaneia impresso | 3–4 |
| 008 | Telão | Roda 4h sem intervenção, sobrevive a queda de rede e a reload | 4 |
| 009 | Moderação, denúncia e botão de pânico | Foto sai da parede em menos de 5s | 4 |
| 010 | Teste de carga e PWA instalável | **150 uploads em 20 min** · instala no Android e no iOS | 5 |
| — | **Casamento real** | A métrica que decide o negócio | 6 |

> A tarefa 001 é **spike descartável**. O código dela não vai para produção — ela existe só para responder sim ou não. Se der não, o ADR 0005 é reaberto antes de qualquer outra linha.

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
