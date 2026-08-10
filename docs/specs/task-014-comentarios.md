# Task 014 — Comentários

> **Origem:** [ADR 0009](../adr/0009-app-social-do-convidado.md).
> **Depende de:** 008 e **011**. A moderação de texto não é opcional aqui.
> **Substitui** a spec de "recados", que era meio-termo para um problema que o produto não tinha.

## Objetivo

O convidado comenta nas fotos — *"a tia Cida rindo antes de derrubar o copo"* — e a legenda coletiva da festa fica junto da imagem.

## Contexto

A spec anterior deste número entregava "livro de recados": uma frase por pessoa, sem réplica. Vinha de uma leitura em que thread era considerado vetor de drama familiar e por isso proibido. Essa leitura era síntese de assistente, não decisão do dono do produto — o [ADR 0009](../adr/0009-app-social-do-convidado.md) a revogou. Comentário tem resposta, como em qualquer lugar.

**Por que fica na Fase 2, e não no MVP.** Pelo critério do próprio ADR 0009: funcionalidade social se julga por volume de upload. Comentário é, das quatro, a de **menor alavanca sobre upload e maior custo** — moderação de texto, LGPD sobre conteúdo escrito, e uma superfície nova para o perseguidor. O feed faz o convidado querer participar; o comentário conversa com quem já participou.

Isso é sequenciamento, não veto. Se a instrumentação da 007 e da 008 mostrar que interação move upload, o comentário sobe na fila com evidência em vez de palpite.

## Escopo

**Entra**

- Comentário em foto, com resposta
- Gate de interação do evento, igual ao resto
- Denúncia em comentário, pelo mesmo caminho da denúncia em foto
- Remoção pelo autor e pelo anfitrião
- Bloqueio entre convidados dentro do evento
- Classificação automática de texto impróprio, **fora do caminho crítico**

**Não entra**

- Reação em comentário
- Notificação de citação ou de resposta. Continua desligada, pelo critério do ADR 0009
- Mensagem privada entre convidados. Não existe, em nenhuma fase — é o que transformaria o produto em canal de assédio dentro de uma festa

## Contrato

```
POST   /api/events/:id/media/:mediaId/comentarios   { texto, respostaA? }
DELETE /api/events/:id/comentarios/:comentarioId
POST   /api/events/:id/comentarios/:comentarioId/denuncia
POST   /api/events/:id/bloqueios                    { sessionId }
```

**Bloqueio é simétrico e imediato.** Bloqueou, os dois somem um do outro — comentários, reações e presença no feed. Sem aviso ao bloqueado, que é o que impede o bloqueio de virar o próprio conflito.

O texto é **escapado no servidor e no template**, pelas duas camadas, como manda a defesa em profundidade do [`../security.md`](../security.md). Comentário é entrada de usuário exibida para 200 pessoas.

## Como se verifica

| # | Prova | Critério |
|---|---|---|
| 1 | Comentar antes do gate | Recusado |
| 2 | `<script>` no comentário | Renderiza como texto, nas duas camadas |
| 3 | Denunciar comentário | Sai da vista em menos de 5s |
| 4 | Bloquear alguém | Os dois somem um do outro, sem aviso ao bloqueado |
| 5 | Botão de pânico do anfitrião | Remove foto **e** os comentários dela |
| 6 | Classificador fora do ar | Comentário publica normalmente. Degrada, nunca falha |
| 7 | Sessão de outro evento comentando | Recusa contra banco real |

A prova 6 é a regra do caminho crítico aplicada a texto: o classificador é enriquecimento, e enriquecimento nunca derruba o produto.
