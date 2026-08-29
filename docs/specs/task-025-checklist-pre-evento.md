# Task 025 — checklist pré-evento no admin

## Objetivo

Anfitrião não esquece passo crítico antes do sábado 20h.

## Contexto

- [`../runbooks/dia-do-evento.md`](../runbooks/dia-do-evento.md)
- [`../product/plano-implementacao-produto.md`](../product/plano-implementacao-produto.md) P6

## Escopo

**Entra:**
- Card ou página `/admin/e/[eventId]/pre-event` (ou seção no painel ao vivo)
- Checklist interativo espelhando runbook §2 e §4 (localStorage ou colunas simples — sem bloquear evento)
- Links diretos: peças, telão parear, gate, expected_guests, menores
- Export PDF 1 página opcional (mesmo conteúdo runbook)

**Não entra:**
- Bloquear publicação do evento se item unchecked
- Notificações e-mail automáticas

## Contrato

- Itens fixos do runbook; labels via pack se expuser ao convidado
- Estado checklist por `event_id` + conta (não convidado)

## Como se verifica

1. Anfitrião marca itens; recarrega persiste
2. Links abrem rotas corretas admin
3. Mobile admin legível

## Riscos

- Scope creep → MVP = lista estática com links, persistência opcional v2
