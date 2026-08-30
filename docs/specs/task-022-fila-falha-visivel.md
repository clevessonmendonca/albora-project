# Task 022 — fila de upload: falha visível

## Objetivo

Convidado **nunca** perde foto em silêncio após esgotar retries — principal reclamação de concorrentes (Dots).

## Contexto

- [`../product/inteligencia-competitiva.md`](../product/inteligencia-competitiva.md) §4
- [`../product/plano-implementacao-produto.md`](../product/plano-implementacao-produto.md) P2
- `architecture.md` §5 — fila IndexedDB fonte da verdade

## Escopo

**Entra:**
- Item em estado `falhou` permanece na fila com rótulo claro
- CTA "Tentar de novo" sempre acessível em fila global e `/my-photos`
- Contagem de tentativas visível (opcional, discreta)

**Não entra:**
- Mudar política de retry/backoff
- Notificar push

## Contrato

- Reutilizar catálogo `queue-status` existente
- Falha não remove item da fila até ação explícita do convidado

## Como se verifica

1. Simular falha de rede no confirm → item fica `falhou` visível
2. "Tentar de novo" dispara drenagem
3. Cobertura ≥90% no pipeline de upload mantida

## Riscos

- UI alarmista → tom calmo: "Guardamos no celular. Vamos tentar de novo."
