# Task 015 — Compartilhar com moldura

> **Origem:** [`../architecture.md` §6](../architecture.md) · Fase 2. **~1 dia de trabalho.**
> **Depende de:** 006.

## Objetivo

O **único canal viral gratuito** do produto.

## Escopo

**Entra**

- Composição 9:16 em canvas: foto, monograma, nomes, data, legenda ou recado
- Colagem da noite como segundo formato
- `navigator.share()` com o arquivo composto
- Assinatura Albora com o slug, **na moldura**

**Não entra**

- API do Instagram. Publicar em story de conta pessoal por API é impossível — só Business, com App Review de semanas

## Contrato

É o **quinto renderizador** dos mesmos tokens, junto de web, telão, PDF e preset. Monograma, nomes e data saem do resolvedor, não de constante.

🔴 **A marca fica fora da foto.** Marca d'água sobre a imagem é anti-padrão explícito: estraga a memória e some no recorte. A assinatura vive na moldura, que é descartável — a foto que o casal guarda continua limpa.

## Como se verifica

1. Compartilhar abre a folha nativa com o arquivo, não com um link
2. A composição carrega a identidade do evento, não a da Albora
3. Trocar o modelo de identidade muda a moldura
4. A foto original permanece sem marca
5. Funciona offline — é canvas, não rede
6. Colagem monta com as fotos do próprio convidado

## Riscos

| Risco | Plano |
|---|---|
| `navigator.share` com arquivo ausente em navegador antigo | Cair para download do arquivo composto |
| Render pesado em Android antigo | Compor em 1080×1920, não em resolução original |
