# Task 008 — Reações e galeria pessoal

> **Origem:** [ADR 0009](../adr/0009-app-social-do-convidado.md).
> **Depende de:** 007.

## Objetivo

O convidado reage às fotos dos outros e vê, num lugar só, tudo que ele mandou.

## Contexto

A galeria e a reação resolvem coisas diferentes.

**A galeria é confiança.** O convidado subiu oito fotos numa festa com sinal ruim e não faz ideia se chegaram. Sem um lugar que diga "as suas oito estão aqui", ele para de mandar por dúvida, não por desinteresse. É a resposta visível da fila do [ADR 0005](../adr/0005-runtime-stack.md), incluindo o que ainda está pendente.

**A reação é retorno.** Ela recompensa quem já participou — por isso vem depois do feed, que cria a vontade de participar. Ordem invertida gastaria a semana no público errado.

## Escopo

**Entra**

- Reação em foto, respeitando o gate de interação do evento
- Conjunto **fechado** de reações, definido no pack — sem emoji livre
- Galeria pessoal: enviadas, **subindo agora** e falhas, com "tentar de novo"
- Remover a própria foto, que o [ADR 0004](../adr/0004-anonymous-guest-session.md) já autoriza no token
- Contagem de reação visível **só depois do gate**

**Não entra**

- Comentário — é a 014
- Reação em comentário. Não existe, em nenhuma fase
- Lista de quem reagiu. Ver abaixo
- Notificação de reação. Ver abaixo

## Contrato

```
PUT    /api/events/:id/media/:mediaId/reacao   { tipo }   → idempotente por sessão
DELETE /api/events/:id/media/:mediaId/reacao
GET    /api/events/:id/minhas                             → enviadas + pendentes
```

`PUT` é idempotente por `(session_id, media_id)`: reagir duas vezes é reagir uma vez. É o que faz o botão sobreviver a toque duplo e a retry de rede sem inflar contagem.

**Duas ausências deliberadas, e o mesmo motivo para as duas.**

**Não existe lista de quem reagiu.** Contagem sim, nomes não. Numa festa, "quem curtiu a foto de quem" é material de briga familiar, e o custo de moderar isso é maior que o upload que gera. O [`../security.md`](../security.md) trata o perseguidor como ator de atenção desproporcional — uma lista de nomes por foto é exatamente a superfície que ele quer.

**Não existe notificação de reação.** Pelo critério do ADR 0009: aumenta tempo de tela, não aumenta upload. Se algum dia for ligada, respeita o gate como todo o resto.

## Como se verifica

| # | Prova | Critério |
|---|---|---|
| 1 | Reagir duas vezes rápido | Contagem sobe 1, não 2 |
| 2 | Reagir offline | Entra na fila e sincroniza; a contagem não pisca |
| 3 | Antes do gate | Botão ausente, contagem invisível |
| 4 | Galeria com upload pendente | Mostra "subindo", com o número certo de pendentes |
| 5 | Matar o app com 3 pendentes e reabrir | Os 3 continuam na galeria, marcados |
| 6 | Remover a própria foto | Some da galeria, do feed e do telão |
| 7 | Sessão tentando remover foto alheia | Recusa, e o teste roda contra banco real |
| 8 | Uploads por sessão, antes × depois de receber a primeira reação | Instrumentado, alimenta a decisão da 014 |

A prova 5 é a que justifica a galeria existir: é ela que prova que o convidado consegue **ver** que nada se perdeu.
