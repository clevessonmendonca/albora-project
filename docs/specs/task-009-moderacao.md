# Task 009 — Moderação, denúncia e botão de pânico

> **Origem:** [`../flows.md` §4](../flows.md) · [`../security.md` §4.5](../security.md)
> **Depende de:** 008.

## Objetivo

Proteger a parede **sem depender de ninguém olhando fila** — porque os noivos estão na festa.

## Escopo

**Entra**

- Publicação automática por padrão
- Classificador no thumb, antes da liberação para o telão
- Botão de pânico no admin **e na tela do telão**
- Denúncia por convidado, sem login
- Remoção em um toque, propagando em segundos
- Modo endurecido opcional, ligável durante a festa
- Auditoria de toda ação: ator, ação, recurso e **a decisão aplicada**

**Não entra**

- Fila de aprovação como padrão. Um controle que fica desligado não é controle

## Contrato — a assimetria que decide

Quando o classificador não responde a tempo: **publica na galeria, segura do telão.**

Galeria é ativa — alguém escolheu abrir. Telão é passivo — 150 pessoas estão olhando sem ter escolhido. Falhar aberto na galeria custa pouco; falhar aberto na parede custa a festa.

**Duas denúncias tiram do telão automaticamente**, pendente de revisão. As 150 pessoas na sala veem a parede antes de qualquer classificador — são o melhor sensor disponível, e são de graça.

## Como se verifica

1. Foto entra e aparece no telão **sem intervenção humana**
2. Classificador desligado → galeria publica, telão segura, admin avisado
3. Pânico pausa a exibição em **menos de 3 segundos**, das duas superfícies
4. Duas denúncias tiram da parede sozinhas
5. Remoção propaga em menos de 5s
6. Modo endurecido ligado no meio da festa passa a exigir aprovação
7. Toda ação registrada com a decisão, não só as negadas

## Riscos

| Risco | Plano |
|---|---|
| 🔴 Conteúdo ilegal com menor | **Não é moderação, é obrigação legal.** Preservar, bloquear, seguir procedimento escrito — que **precisa existir antes do primeiro evento** |
| Classificador com falso positivo em foto normal | Fila de revisão, e o anfitrião libera em um toque |
| Ninguém no admin durante a festa | É a premissa, não o problema. Por isso o pânico está também na tela do telão |
