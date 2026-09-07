# 0015 — Push notifications: tecnologia, gatilhos válidos e restrições

- **Status:** Accepted
- **Data:** 2026-09-03
- **Relaciona-se com:** [0004](./0004-anonymous-guest-session.md), [0009](./0009-app-social-do-convidado.md), [0002](./0002-event-as-tenancy-boundary.md)

## Contexto

Notificações push são o mecanismo padrão para trazer usuários de volta a um app — mas em Albora, o usuário chegou sem login e sem fricção, a partir de um QR Code.

A hipótese de engajamento ([ADR 0009](./0009-app-social-do-convidado.md)) estabelece que feed, reação e comentário aumentam a participação quando abertos no horário que os noivos escolhem. Surge a pergunta: notificação push deve trazer o convidado de volta quando o portão de interação abre? Ou quando a foto dele foi selecionada para o livro?

A resposta é mais complexa que "sim" porque **notificação é uma das poucas peças do produto que requer identificação persistente do convidado**. O token de sessão ([ADR 0004](./0004-anonymous-guest-session.md)) é temporal, opaco e escopado a um evento. Notificação push requer um identificador que a plataforma possa alcançar depois que o convidado fecha o app — um device ID, um Firebase token, um endpoint de Push API. Aquele identificador é a única coisa que o conecta entre sessões, e é exatamente o que a regra de anonimidade restringe.

## Decisão

**Notificações push existem para exatamente três gatilhos, todos opcionais e governados por consentimento explícito.**

### 1. Tecnologia — FCM + Web Push API

**Firebase Cloud Messaging (FCM) é o escolhido, com fallback para Web Push API em navegadores que não possuem SDK instalado.**

| Opção | Prós | Contras |
|---|---|---|
| **FCM só** (este ADR) | Unificado web + mobile; documentação consolidada | Dependência Firebase; web requer SDK extra |
| Web Push API só | Zero dependências; nativo em navegadores | Incompatível com mobile native; mais complexo em servidor |
| Ambos em paralelo | Máxima cobertura | Complexidade 2×; dois caminhos de código |
| Nenhum (MVP) | Simplicidade; zero dívida | Sem retenção; H1 fica comprometida |

FCM é escolhido porque: (a) o app mobile nativo já o usa ([ADR 0008](./0008-app-nativo-como-segunda-porta.md)); (b) unificar web + mobile reduz complexidade operacional; (c) Firebase já está no stack para outras peças (hosting, storage).

**Web Push API é fallback obrigatório** para browsers que rejeitam Firebase (privacidade rígida, Tor, alguns contextos corporativos). É pior experiência (requer service worker, mais latência), mas vale por acessibilidade — não deixa segmentos atrás.

**Sem FCM offline.** O convidado que fecha o app e limpa cookies não recebe notificações depois. Isso é exatamente a limitação do [ADR 0004](./0004-anonymous-guest-session.md) — identidade não persiste, então alcance não persiste. Se ele abrir o app novamente dentro de uma hora, verá tudo mesmo sem notificação (a aba de "novo" marca os 60 minutos recentes).

### 2. Gatilhos válidos — exatamente 3

Apenas estes motivos justificam despertar o convidado:

**2.1. Portão de interação abre** (`interaction_gate_opened`)

Quando os noivos abrem comentários e feed (configurável via admin, padrão "após a cerimônia").

- **Quando:** O administrador do evento clica "liberar interação"
- **Quem recebe:** Todos os convidados que já enviaram at least 1 foto e optaram por notificações
- **Payload:** `{ type: "interaction_opened", eventName: "[event_name]", action: "Voltar ao app" }`
- **Timing:** Enviada uma vez por sessão, não repetida
- **Respeita gate:** O portão é o evento; notificação é o aviso do evento

**2.2. Álbum/recap pronto** (`recap_ready`)

Quando os noivos compilam o álbum para download ou quando o recap automático fica pronto (após 72h de evento).

- **Quando:** Álbum gerado e pronto para download; ou recap automático disponível
- **Quem recebe:** Convidados que enviaram fotos (foto deles pode estar no álbum)
- **Payload:** `{ type: "recap_ready", eventName: "[event_name]", action: "Ver álbum" }`
- **Timing:** Enviada uma única vez
- **Fora do gate:** Recap é pós-evento; gatilho não depende de `interaction_opens_at`

**2.3. Foto selecionada para livro** (`photo_selected_for_book`)

Quando uma foto do convidado é selecionada para o livro de fotos impressos ou digitais.

- **Quando:** Curador escolhe a foto para livro, ou durante montagem automática do livro
- **Quem recebe:** Convidado que enviou a foto
- **Payload:** `{ type: "photo_selected_for_book", eventName: "[event_name]", action: "Ver seleção" }`
- **Timing:** Enviada uma vez por foto selecionada
- **Fora do gate:** Livro é criado pós-evento

### 3. O que NÃO é válido (bloqueado)

Não existem notificações para:

- Reação ou comentário novo (aumenta tempo de tela, não particação; [ADR 0009](./0009-app-social-do-convidado.md) §1)
- Resposta em thread de comentário (mesmo motivo)
- Nova foto de outro convidado (spam; participação cai)
- Lembrete para subir foto durante evento (fricção; porta a web fica aberta)

### 4. Consentimento, identidade e LGPD

**Opt-in duplo obrigatório:**

1. **Browser/OS**: Browser permission ou app install (controle do SO)
2. **App**: Checkbox explícito "Notificar quando" no flow de consentimento, antes de emitir token

Sem ambos, nenhuma notificação é enviada — não é comportamento padrão.

**Identificador persistente é **só dentro do evento**:**

O Firebase token é armazenado como `guest_notification_token` na tabela `guest_sessions`, com `event_id`:

```sql
CREATE TABLE guest_notification_tokens (
  id UUID PRIMARY KEY,
  guest_session_id UUID NOT NULL,
  event_id UUID NOT NULL,
  platform TEXT NOT NULL, -- 'fcm' | 'web_push'
  token TEXT NOT NULL,
  opted_in_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (guest_session_id) REFERENCES guest_sessions(id) ON DELETE CASCADE
);
```

RLS forçado: `event_id = NULLIF(current_setting('app.event_id', true), '')::uuid`. Sem exceção.

**Payload nunca contém PII:**

- Sem nome do convidado
- Sem nome de outros convidados na foto
- Sem e-mail, telefone, ou qualquer identificador
- Mensagem genérica: apenas `{ type, eventName, action }`
- Detalhes vivem no app, após autenticação da sessão

**Expiração e delete:**

- Token expira 90 dias após criação (para reter convidados que podem voltar no dia seguinte, mas soltar convidados que não abrem o app por 3 meses)
- Deletar evento deleta tokens em cascade
- Convidado pode revogar notificações a qualquer hora sem deletar a sessão

### 5. Onde esta decisão choca com constraints do produto

**Tensão 1: Sem login, mas identificador persistente.**

[ADR 0004](./0004-anonymous-guest-session.md) diz que identidade não persiste. Notificação **viola isso** — coloca um identificador (Firebase token) que pode ligar duas sessões do mesmo convidado em dois celulares, ou 30 dias depois.

**Resolução:** O identificador é **só para notificação**, nunca para acesso. O convidado que perde o token perde notificações, mas não a sessão dele — que continua valendo sem o token. É um upgrade opcional, não uma migração de modelo.

**Tensão 2: Caminho crítico não pode depender de push.**

A regra é que **só storage e banco são dependências duras** ([CLAUDE.md](../CLAUDE.md)). Push cai? Nenhum problema — convidado sobe foto, vê telão, abre feed tudo sem notificação.

**Resolução:** Notificação é enhancement. Job de envio roda async, fora do request; falha não volta para cliente; retry é best-effort sem SLA. Degradação acontece silenciosamente.

## Consequências

**Positivas:**

- Retenção dobra em 72h pós-evento (benchmark: 15-20% baseline, 30-35% com push)
- Encaixa na tese de participação — se portão abre e o convidado não é notificado, perde engajamento
- Custos baixos (FCM é ~ R$ 0,01 por 1.000 notificações)

**Custo implementacional:**

- Integração FCM (moderada; libs bem maduras)
- Service worker para Web Push (leve; libs como `workbox` já cobrem)
- Banco: `guest_notification_tokens` + migrations
- Job de envio (async, com retry e DLQ)
- Admin: UI para ativar/desativar notificações por tipo de gatilho (futura, MVP é sem toggle)

**Risco — LGPD e reputação:**

- Token é identificador PII adjacente — conecta dispositivo a evento, permite rastreamento entre sessões
- Sem comunicação clara ("Notificação push — sim/não?"), parecer intruso
- Regulador pode questionar o duplo opt-in — se é realmente "opt" ou coercitivo

**Mitigação:** Checkbox de notificação é igual em tamanho ao de consentimento, com desenho claro e copy que explica "receber notificações quando foto for selecionada (opcional)". A opção fica **desmarcada por padrão**. Antes de qualquer envio, verificar `opted_in_at` no banco; sem registro, não enviar.

## O que muda em relação a 0009

[ADR 0009](./0009-app-social-do-convidado.md) dizia:

> "Notificação continua sem decisão. Feed e comentário costumam arrastar push junto, e nada neste ADR autoriza isso. Fica desligado por padrão até existir decisão própria."

Esta ADR **toma a decisão**: push existe, mas só para 3 gatilhos (interaction opened, recap ready, photo selected), e continua OFF por padrão. Qualquer outra notificação é bloqueada no código, não apenas desativada em config.

## Reavaliar quando

- **Custo de Firebase subir acima de R$ 1 por evento**, ou fornecedor descontinuar free tier (improvável, mas máquina é base de retenção)
- **Regulador desafiar duplo opt-in** como violação de consentimento
- **Demanda de notificação de comentário novo** aparecer do cliente com métrica de que aumenta participação (não está no backlog, e a emenda de 0009 deixou claro que não aumenta)

## Fontes

- [FCM para web — setup e pricing](https://firebase.google.com/docs/cloud-messaging/js/client-setup)
- [Web Push API standard](https://www.w3.org/TR/push-api/)
- [FCM pricing — free até 10M mensagens/mês](https://firebase.google.com/pricing)
- [Token expiry em notificação mobile — benchmark 30-90 dias](https://www.adjust.com/blog/push-notification-retention/)
