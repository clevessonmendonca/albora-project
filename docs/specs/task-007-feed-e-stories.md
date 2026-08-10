# Task 007 — Feed e stories

> **Origem:** [ADR 0009](../adr/0009-app-social-do-convidado.md) — o app social a serviço do álbum dos noivos.
> **Depende de:** 006.
> **É a aposta central do produto.** Se ela não move upload, o ADR 0009 volta para a mesa.

## Objetivo

O convidado vê o que os outros estão mandando — **e por isso manda mais**.

## Contexto

O [ADR 0009](../adr/0009-app-social-do-convidado.md) coloca o social como mecanismo, não como fim: quem paga são os noivos, o que eles querem é ficar com as fotos, e o que impede é o convidado não subir. O feed existe para atacar exatamente esse obstáculo.

A ordem entre esta tarefa e a 008 não é acidental. **Ver o que os outros mandaram move mais upload do que receber reação na própria foto** — a primeira cria a vontade de participar, a segunda recompensa quem já participou. Quem já participou não é o problema.

## Escopo

**Entra**

- **Stories** — as fotos do evento em 9:16, avanço por toque, agrupadas por hora
- **Feed** — grade cronológica, mais recente primeiro, com filtro por missão
- **Gate de interação** — respeita a configuração do evento; antes dele, feed e stories mostram só o que já está no telão
- Carregamento por página, com miniatura primeiro
- Instrumentação de upload **antes e depois** da primeira abertura do feed, por sessão

**Não entra**

- Reação e galeria pessoal — é a 008
- Comentário — é a 014, depois da moderação de texto
- Compartilhamento externo — é a 015, e tem pendência de consentimento
- Qualquer contagem visível antes do gate
- Notificação de qualquer tipo. Fica desligada por decisão do ADR 0009

## Contrato

O feed lê **exatamente o que a moderação já liberou**. Ele não é uma segunda fonte de verdade sobre o que é público: se uma foto sai do telão pelo botão de pânico, ela some do feed no mesmo instante, pela mesma consulta.

```
GET /api/events/:id/feed?cursor=&missao=   → { itens[], proximoCursor }
GET /api/events/:id/stories?hora=          → { itens[] }
```

Ambos escopados por `event_id` via `SET LOCAL`, como qualquer consulta do produto. **Não existe endpoint que devolva mídia de mais de um evento** — nem para o mesmo convidado, que não tem identidade entre eventos.

## Como se verifica

| # | Prova | Critério |
|---|---|---|
| 1 | Antes do gate, abrir o feed | Mostra só o que está no telão. Nenhuma contagem |
| 2 | Abrir o gate no admin | Feed completo aparece sem recarregar o app |
| 3 | Foto removida pelo botão de pânico | Some do feed em menos de 5s, como some do telão |
| 4 | 200 fotos, 3G lento | Primeira tela em menos de 2s, miniatura antes do arquivo cheio |
| 5 | Sessão de outro evento tentando o endpoint | Devolve vazio, não erro — e o teste roda contra banco real |
| 6 | **Uploads por sessão, antes × depois da 1ª abertura do feed** | **É a prova que decide a tarefa** |

A prova 6 é a única que importa de verdade. As outras cinco dizem que o feed funciona; ela diz se o feed **serve**. Sem instrumentação não há como saber, e sem saber o ADR 0009 vira fé.

## Riscos, e o plano para cada

| Risco | Sinal | Plano |
|---|---|---|
| O feed vira distração e derruba upload | Prova 6 dá negativo | Reduzir a stories, que é passivo. Se ainda assim cair, o ADR 0009 volta para a mesa |
| Convidado abre o feed e para de tirar foto | Tempo de tela sobe, upload não | Não é para otimizar tempo de tela. O botão de câmera é fixo e sempre visível |
| Cabeça baixa no salão | Reclamação dos noivos | O gate existe para isso. Padrão "após a cerimônia" continua |
| Custo de leitura em 200 aparelhos simultâneos | Latência no fim da festa | Miniatura no R2, cache na borda. Nunca consulta por foto |
