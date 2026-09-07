# 0018 — SSO Google por OIDC, e o convidado pode reivindicar as próprias fotos

- **Status:** Accepted
- **Data:** 2026-09-06
- **Relaciona-se com:** [0004](./0004-anonymous-guest-session.md), [0008](./0008-app-nativo-como-segunda-porta.md), [0009](./0009-app-social-do-convidado.md), [0013](./0013-acesso-por-conta-sob-rls.md), [0016](./0016-camadas-do-console-interno.md)

## Contexto

Hoje toda autenticação da Albora usa um único mecanismo: token opaco assinado + cookie próprio, emitido por magic link. Três substratos — `accounts` (anfitrião/fornecedor, cookie `albora_host`, `magic_links`), `staff_users` (equipe, cookie `albora_staff`, `staff_magic_links`) e a sessão de convidado (token por-aparelho, escopada a um evento, sem login). Existe OAuth do Google no produto, mas só para acessar o Drive do casal — não para autenticar.

O dono pediu **"Entrar com Google"** como opção adicional de login, e — separadamente — que o **convidado possa, se quiser, entrar para reivindicar as próprias fotos** daquele evento.

Este ADR registra duas decisões que se cruzam: a técnica do SSO, e um refinamento de uma regra não-negociável do convidado.

## Decisão 1 — SSO Google por OIDC direto, não por biblioteca nem serviço

O login com Google usa **OpenID Connect direto** contra o Google, produzindo os cookies de sessão que já existem (`albora_host`, `albora_staff`). Coexiste com o magic link — é uma porta a mais, nunca substituta.

Rejeitadas:

- **Biblioteca de auth (Auth.js/NextAuth).** Trocaria o modelo de sessão do projeto inteiro — token opaco assinado, hash no banco, RLS por sessão ([ADR 0013](./0013-acesso-por-conta-sob-rls.md)) — por outro, para ganhar um botão. Reescrever a auth de host e staff que já funciona é risco desproporcional ao ganho.
- **Serviço externo (Clerk/WorkOS).** Põe um terceiro no caminho de login e move identidade para fora. Colide com o isolamento por evento e com a postura de LGPD do produto, que mantém PII sob controle próprio. Terceiro no caminho crítico é falha de arquitetura, não de configuração — a mesma régua que o upload já segue.

OIDC direto reusa a infraestrutura de OAuth do Google que o Drive já tem, mas com **client dedicado e escopo mínimo** (`openid email`) — login não precisa de acesso a API do Google, e um client separado impede que um vazamento de escopo de um vire poder do outro. **`email_verified=true` é obrigatório**: sem isso, alguém criaria uma conta Google com o e-mail de um staff e entraria como ele. Como `accounts` e `staff_users` são keyed por e-mail (UNIQUE), Google e magic link convergem na mesma identidade quando o e-mail é o mesmo — não há segunda identidade a fundir, e não há sequestro enquanto o Google prova posse do e-mail.

## Decisão 2 — o convidado pode reivindicar as próprias fotos, sem virar conta

Isto refina uma regra não-negociável. O `CLAUDE.md` diz, sob "Sessão do convidado":

> "O convidado não tem login e nunca terá."
> "O convidado nunca digita senha, nunca recebe e-mail, nunca espera SMS."

E "O que este projeto NÃO é" diz: *"Não há conta Albora."*

O que muda, e o que **não** muda:

- **Não muda o que a regra protege.** A primeira foto continua sem login, sem loja de aplicativo, sem tela de autenticação. É desse caminho que a regra defende a H1 — a hipótese que decide se o negócio existe. O convite para reivindicar aparece **depois** da primeira foto, opcional, nunca antes. Mesmo espírito da "segunda porta" do [ADR 0008](./0008-app-nativo-como-segunda-porta.md).
- **Não vira conta Albora.** Reivindicar **não** cria `accounts`, **não** emite cookie de host, **não** dá identidade que cruza eventos. O vínculo é escopado ao evento, e morre com ele — coerente com [ADR 0004](./0004-anonymous-guest-session.md) e [0009](./0009-app-social-do-convidado.md).
- **O mecanismo já existe.** `guest_contacts` (migration 0001) liga um contato (`channel`, `value`) a uma `guest_session` por `session_id`, escopado a `event_id`, já tratado como PII apagada pela retenção. Reivindicar é **verificar posse de um e-mail e gravá-lo como contato daquela sessão-de-evento** — não uma sessão nova. O OIDC do Google é só a prova de posse; o convidado volta a ser sessão anônima logo depois.

O que de fato se flexibiliza da regra literal: o convidado passa a poder, **por escolha própria e depois da primeira foto**, provar um e-mail para receber as próprias memórias. "Nunca recebe e-mail" cede especificamente para **receber as próprias fotos** — que é o ponto, não um canal de marketing nem um magic link de auth. Google (OAuth, sem e-mail de ida) fere menos essa linha que o magic link; ambos ficam disponíveis, e a entrega em si respeita o consentimento já versionado da sessão.

Precedente explícito: o [ADR 0009](./0009-app-social-do-convidado.md) já corrigiu uma regra do convidado que uma síntese anterior havia endurecido além da intenção do dono. Esta decisão é do dono, registrada aqui para que o refinamento fique rastreável — não uma erosão silenciosa.

## Consequências

**Ganha-se:** login sem espera de e-mail para quem tem Google (host e staff); e um caminho para o convidado reivindicar as próprias fotos sem que o produto vire "conta Albora" nem perca a fricção-zero da primeira foto.

**Paga-se:** um client OAuth novo a configurar e guardar em segredo; um segundo caminho de autenticação para manter em cada superfície; e a responsabilidade de blindar, em review, que o callback do convidado **nunca** emite sessão de host — a tentação de "aproveitar que ele já logou" é exatamente o que reverteria a Decisão 2.

**Fica de fora deste ADR:** a *entrega* das fotos ao convidado (o pipeline que usa o contato verificado para mandar as memórias) — o SSO resolve o vínculo, a entrega é outra frente. E a restrição de domínio corporativo para staff, que o dono dispensou por ora (qualquer Google já em `staff_users` entra); fica registrada como endurecimento futuro disponível.
