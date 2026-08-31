# Task 014 — Álbum da noite

> **Origem:** [`../flows.md` §7](../flows.md) · Fase 2.
> **Depende de:** 006.

## Objetivo

O acervo organizado pela **hora da noite**, não por grade nem por feed.

## Escopo

**Entra**

- Capa sangrando, dissolvendo em calor
- Linha do tempo: chegada · cerimônia · 21h · meia-noite · 2h · **amanhecer**
- Disco circular como unidade de navegação
- Contadores: fotos, convidados, missões
- Baixar tudo (job, com aviso por e-mail)

**Não entra**

- Livro de fotos (Fase 3), curadoria automática, export para Drive

## Contrato

**A unidade é a hora, não o dia.** O concorrente organiza memórias em calendário mensal porque é app de casal ao longo de meses. O Albora é **uma noite** — e essa transformação é o que ele estruturalmente não consegue copiar, porque o modelo de dados dele é mês.

**A faixa do amanhecer é a única em âmbar**, com anel nos discos. Fecha o arco: nome do produto, paleta, movimento do telão e navegação do álbum passam a dizer a mesma coisa.

**Disco circular, não miniatura quadrada.** O recorte redondo é gentil com foto torta — corta o enquadramento ruim sem parecer erro.

## Como se verifica

1. As faixas agrupam pela hora real do `taken_at`, com fallback no `created_at`
2. Foto sem hora confiável cai numa faixa "durante a festa", não some
3. Amanhecer destacado
4. Baixar tudo é job, nunca request
5. Sem scroll infinito e sem contagem visível de reação
6. Abre em menos de 2s com 800 fotos

## Riscos

| Risco | Plano |
|---|---|
| EXIF removido levou o horário junto | Preservar `taken_at` no `confirm`, **antes** de descartar o EXIF — é o único campo que sobrevive |
| Fuso do aparelho errado | Ancorar no fuso do evento, não no do convidado |
