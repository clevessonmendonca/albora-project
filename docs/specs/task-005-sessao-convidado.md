# Task 005 — Sessão do convidado e consentimento

> **Origem:** [ADR 0004](../adr/0004-anonymous-guest-session.md) · [`../flows.md` §3.2 e §3.3](../flows.md)
> **Depende de:** 004.

## Objetivo

Do QR à sessão válida em **três toques**, sem login, com consentimento versionado e datado.

## Escopo

**Entra**

- `GET /e/[slug]` — a rota client-heavy, exceção arquitetural declarada no [ADR 0005](../adr/0005-runtime-stack.md)
- Tela de consentimento: uma frase, um checkbox
- Nome **obrigatório**, persistido no aparelho
- `POST /api/sessions` → token opaco assinado, cookie `HttpOnly` `Secure` `SameSite=Lax`
- Rotação de slug pelo admin
- Rate limit por sessão e por IP
- Estados: evento não começou, janela de 48h encerrada, consentimento recusado

**Não entra**

- Missões e captura — é a 006
- Login de qualquer espécie, em qualquer superfície

## Contrato

O token carrega **exatamente um escopo**: um `event_id` e um `session_id`. Autoriza três coisas — subir mídia naquele evento, reagir, remover a própria mídia. Nada além.

**Opaco, nunca JWT legível.** Não há segredo dentro, mas também não há razão para publicar estrutura a um público que inclui o primo adolescente da noiva. Referência a estado no servidor é o que permite **revogação por evento** sem derrubar quem já está subindo foto.

**Nunca na URL.** Vaza em referer, histórico, print de tela e no grupo do WhatsApp.

## Por que o nome é obrigatório

Contraria o §4.2 do doc de produto, que dizia opcional. Custa um toque no recurso mais escasso do projeto e paga três coisas que não existem sem ele: atribuição no telão — que é o mecanismo de recrutamento —, "suas fotos" depois da festa, e responsabilização num modelo onde tudo vai à parede por padrão.

## Como se verifica

1. QR → consentimento → nome → sessão, em **3 toques**, cronometrado
2. Consentimento gravado com versão e data
3. Recusar consentimento → saída com dignidade e caminho de volta, sem insistência
4. Token não aparece em querystring nem em log (guard da 002)
5. Token de um evento recusado em outro
6. Rotação de slug: sessões ativas continuam, link antigo para de abrir novas
7. Segunda foto **não pede o nome de novo**
8. Cookie limpo → nova sessão, e a ajuda aponta para o anfitrião

## Riscos

| Risco | Plano |
|---|---|
| Rotação invalida material impresso | Aviso explícito no admin, e o slug antigo mostra página de orientação, nunca erro seco (N1.5) |
| Nome ofensivo, e ele vai ao telão | Admin renomeia ou oculta a sessão inteira. **Política ainda em aberto** — ver §12 dos fluxos |
