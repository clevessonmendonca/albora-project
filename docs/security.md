# Albora — Segurança e proteção de dados

> **Status:** fundação. Independente de runtime.
> **Última revisão:** 2026-08-09
> **Complementa:** [`architecture.md`](./architecture.md), [`flows.md`](./flows.md), [ADR 0002](./adr/0002-event-as-tenancy-boundary.md), [ADR 0004](./adr/0004-anonymous-guest-session.md)

## 1. O enquadramento que muda todas as decisões

A maioria dos produtos pensa segurança como "vazamento de dados". Aqui o enquadramento é outro, e mais concreto:

> **O modo de falha do Albora é uma foto da avó de alguém, ou do filho de alguém, aparecer onde não devia.**

Não é abstrato e não é recuperável. Não existe rotação de credencial que desfaça uma foto exibida num telão para 150 pessoas, nem notificação de incidente que conserte uma foto de criança indexada pelo Google. Cada controle abaixo existe porque um caminho específico leva a essa consequência.

Três agravantes que a maioria dos produtos não tem simultaneamente:

1. **O usuário principal não é autenticado.** Não há a quem responsabilizar, e a credencial é um QR Code impresso numa mesa de bar.
2. **O conteúdo é de terceiros.** Quem envia raramente é quem aparece. O titular do dado não é o usuário.
3. **A superfície de maior alcance é passiva.** O telão exibe para todo mundo, ninguém precisa clicar, e quem aparece não deu permissão a ninguém ali.

---

## 2. Ativos

| Ativo | Sensibilidade | Por quê |
|---|---|---|
| **Mídia de convidados** | 🔴 Crítica | Imagem de terceiros identificáveis, incluindo crianças e idosos. Insubstituível e irretratável |
| **Metadado de mídia** | 🟠 Alta | EXIF traz GPS e horário. Localização de uma festa privada, com convidados |
| **Contatos de convidados** | 🟠 Alta | Telefone e e-mail com opt-in. É o ativo comercial e o alvo mais óbvio |
| **Token de sessão** | 🟠 Alta | Única credencial do plano do convidado |
| **Slug do evento** | 🟡 Média | É a credencial de fato de entrada. Impresso e legível |
| **Identidade visual** | 🟡 Média | Propriedade do casal; base do white-label |
| **Conta do anfitrião** | 🔴 Crítica | Acesso total ao acervo e ao download |

---

## 3. Atores de ameaça

Ordenados por probabilidade real, não por sofisticação.

| # | Ator | Motivação | O que consegue hoje sem controles |
|---|---|---|---|
| A1 | **Convidado curioso** | Ver outros eventos | Trocar o slug na URL |
| A2 | **Convidado hostil na festa** | Constranger, sabotar o telão | Enviar conteúdo impróprio para uma tela de 150 pessoas |
| A3 | **Terceiro com link vazado** | Bisbilhotar, baixar | Tudo que um convidado consegue, sem estar presente |
| A4 | **Raspador** | Coletar acervo em escala | Enumerar slugs e baixar álbuns inteiros |
| A5 | **Perseguidor** 🔴 | Encontrar fotos de **uma pessoa específica** | Achar onde alguém esteve, com quem, e quando |
| A6 | **Fornecedor** | Reter base após fim de contrato | Exportar eventos de clientes que não são dele |
| A7 | **Conta de anfitrião comprometida** | Acesso ao acervo | Baixar tudo, apagar tudo |
| A8 | **Atacante de disponibilidade** | Derrubar num sábado | Exaurir cota do plano gratuito e tirar o produto do ar na hora do evento |

**A5 merece atenção desproporcional ao seu volume.** É o único ator cujo dano não é estatístico: violência doméstica e perseguição são reais, casamentos são eventos previsíveis e publicamente anunciados, e um álbum com agrupamento facial é exatamente a ferramenta que um perseguidor quer. Todo recurso de busca por pessoa precisa ser avaliado contra A5 antes de ser construído, não depois.

---

## 4. Controles por camada

### 4.1 Isolamento entre eventos

Detalhado em [ADR 0002](./adr/0002-event-as-tenancy-boundary.md). O que importa aqui: **o isolamento vive no banco, não na aplicação.** RLS forçado significa que um endpoint novo escrito sem contexto — por uma pessoa cansada ou por um assistente de código — não vaza dado. A política ainda filtra.

Contra **A1** e **A3**: mudar o id na URL não retorna nada, porque a transação está presa ao evento da sessão.

### 4.2 A superfície de upload

É o único ponto do sistema onde um cliente **não autenticado** obtém permissão de escrita direta no armazenamento. Sete controles, todos obrigatórios:

| # | Controle | Ataque que fecha |
|---|---|---|
| 1 | **Chave derivada no servidor** (`events/{event_id}/...`), nunca informada pelo cliente | Travessia de caminho; escrita em evento alheio |
| 2 | **TTL curto** na URL assinada (minutos) | Reuso da URL depois de vazada |
| 3 | **Teto de tamanho** embutido na assinatura | Bomba de armazenamento; exaustão de cota |
| 4 | **Tipo de conteúdo restrito** a um conjunto fechado de imagem e vídeo | Upload de HTML, SVG ou executável |
| 5 | **Validação por magic bytes no `confirm`**, nunca por extensão nem pelo cabeçalho declarado | Arquivo que mente sobre o que é |
| 6 | **Limite de dimensão e de razão de compressão** | Bomba de descompressão derrubando o telão e o navegador dos outros convidados |
| 7 | **Rate limit por sessão e por IP, antes do presign** | Inundação; exaustão de cota |

O ponto 5 não é paranoia: um "JPEG" que é HTML, servido da mesma origem da aplicação, é XSS armazenado com alcance de festa inteira.

### 4.3 Servir a mídia — a decisão que evita XSS armazenado

> **Mídia é servida de um domínio próprio, jamais da origem da aplicação.**

Mesmo com validação de magic bytes, servir conteúdo enviado por usuário da mesma origem que a aplicação é apostar toda a segurança do cliente numa única checagem. Origem separada significa que, se a validação falhar, o pior caso é conteúdo hostil isolado num domínio sem sessão, sem cookie e sem acesso ao DOM da aplicação.

Adicionalmente: `Content-Disposition` explícito, `X-Content-Type-Options: nosniff`, **SVG nunca servido como imagem de usuário**, e CSP restritiva na aplicação.

### 4.4 EXIF e geolocalização

O documento de produto exige remoção de EXIF no cliente. Está certo, e é insuficiente sozinho — **controle no cliente não é controle de segurança**, porque o cliente é do atacante.

A tensão é real: a arquitetura diz que o servidor nunca toca nos bytes ([§5 de `architecture.md`](./architecture.md)), e não dá para remover EXIF sem tocar nos bytes.

**Resolução:** as duas coisas, em momentos diferentes.

1. **No cliente, antes do upload** — resolve a ameaça real, que é vazamento *acidental* da localização do próprio convidado. Cobre a esmagadora maioria dos casos, sem custo e sem latência.
2. **Em job assíncrono, depois do `confirm`** — relê do armazenamento, reprocessa e substitui. Fora do caminho crítico, fecha o caso do cliente adulterado.

O que **não** se faz: colocar reprocessamento no caminho de request. Isso violaria a regra das duas dependências duras e adicionaria latência exatamente onde a H1 é decidida.

### 4.5 Moderação — controle de segurança, não recurso

Com feed, reações e telão, o produto **difunde** imagem de terceiros. Isso muda a natureza da moderação.

**O padrão é publicar tudo** ([`flows.md` §4](./flows.md#4-f3--workflow-da-mídia)). É uma decisão de produto tomada de olhos abertos, e a justificativa é operacional: os noivos estão *na festa*. Uma fila de aprovação pressupõe alguém olhando, ninguém vai olhar, e um controle que fica desligado não é um controle — é uma falsa sensação de segurança que ainda por cima adiciona atraso ao telão.

A defesa, então, não pode depender de atenção humana em tempo real:

- **O classificador é o único portão automático.** Roda no thumb, antes da liberação para o telão.
- **Assimetria galeria versus telão quando o classificador não responde:** publica na galeria, **segura do telão**. São exposições diferentes — galeria é ativa (alguém escolheu abrir), telão é passivo (150 pessoas estão olhando sem ter escolhido). Falhar aberto na galeria custa pouco; falhar aberto na parede custa a festa.
- **Botão de pânico** no admin *e* na tela do telão, pausando a exibição em três segundos. Quando algo dá errado, ninguém vai procurar o menu certo.
- **Denúncia por convidado**, sem login. Duas denúncias tiram do telão automaticamente, pendente de revisão. As 150 pessoas na sala veem o telão antes de qualquer classificador — são o melhor sensor disponível e são de graça.
- **Remoção propaga em segundos**, não no próximo ciclo.
- **O anfitrião pode endurecer o modo durante a festa.** O padrão aberto é aposta calculada e precisa ter freio.

🔴 **Conteúdo ilegal envolvendo menores** não é caso de moderação, é obrigação legal. Precisa de procedimento escrito — preservação, notificação, contato — **antes** do primeiro evento. Não pode ser improvisado no sábado.

### 4.6 Sessão do convidado

Detalhado em [ADR 0004](./adr/0004-anonymous-guest-session.md). Reforços de segurança:

- Token **opaco**, nunca um JWT com conteúdo legível. Não há segredo dentro, mas também não há razão para publicar estrutura a um público que inclui o primo adolescente da noiva.
- Cookie `HttpOnly`, `Secure`, `SameSite=Lax`. **Nunca na URL** — URL vaza em referer, histórico, print de tela e no grupo do WhatsApp.
- Escopo de um evento. Não é transferível.
- **Revogável por evento** sem derrubar quem já está subindo (contra **A3**).
- Rate limit **antes** de qualquer trabalho caro, inclusive antes do presign. Circuito no portão, não na saída.

### 4.7 Slug e descoberta

O slug é legível por exigência de produto: está impresso na placa e alguém vai digitá-lo. Isso é irreconciliável com "impossível de adivinhar", então a defesa é em camadas:

- Slug **não é autorização**. Abrir o link mostra apenas a tela de consentimento; ler a galeria exige sessão.
- `noindex` em toda superfície de evento, e `robots.txt` fechado. Nenhum álbum de casamento pode virar resultado de busca.
- Sem índice, sem listagem, sem endpoint que enumere eventos.
- Rate limit agressivo em slug inexistente — é a assinatura de **A4**.
- Rotação de slug disponível ao anfitrião.

### 4.8 Contas de anfitrião e fornecedor

- Magic link de uso único e validade curta. Sem senha, sem base de senha para vazar.
- **Reautenticação para ações destrutivas**: baixar tudo, apagar tudo, mudar canal de contato. Comprometer o e-mail não pode significar exportar o acervo em um clique (contra **A7**).
- Caminhos que cruzam eventos — painel de fornecedor, observabilidade — usam papel dedicado com `BYPASSRLS`, **auditados por chamada**, com ator, ação, recurso e decisão (contra **A6**).
- Fim de contrato do fornecedor não move propriedade: os eventos e as memórias ficam com os casais.

### 4.9 Disponibilidade — a ameaça específica do plano gratuito

**A8 é criada pela escolha de hospedagem.** O plano gratuito de Workers tem cota diária; um atacante que a exaure tira o produto do ar. Se isso acontecer num sábado às 21h, o evento não tem segunda chance.

- Rate limit e WAF **na borda**, antes de qualquer consumo de cota computável.
- Plano pago desde o dia 1 remove o piso mais baixo (ver [ADR 0006](./adr/0006-hosting-platform.md)).
- Alerta de consumo em 60% da cota diária, não em 100%.
- O telão tem cache local das últimas 50 imagens e continua rodando mesmo com a API fora. É o único componente com requisito de sobreviver à indisponibilidade do resto.

---

## 5. LGPD — três pontos que passam despercebidos

O documento de produto cobre bem o básico: consentimento versionado, EXIF removido, remoção self-service, retenção por job. Três coisas ainda não estão resolvidas e todas são caras de consertar depois.

### 5.1 🔴 Agrupamento facial é dado biométrico

A Fase 2 prevê "agrupamento facial" para a entrega individual de "suas fotos". Isso é **tratamento de dado biométrico**, classificado como dado pessoal sensível pelo Art. 5º, II da LGPD — categoria distinta, com base legal própria e consentimento específico e destacado.

Consequências que precisam estar decididas **antes** de construir:

- Consentimento específico e separado do consentimento geral de upload. Não pode estar embutido no checkbox da entrada.
- O titular do dado biométrico é **quem aparece** na foto, não quem a enviou. A pessoa que dá o consentimento e a pessoa cujo rosto é processado são pessoas diferentes — e é aí que o desenho ingênuo quebra.
- Agrupar sem consentimento do titular é o caminho mais direto para um problema real com a ANPD.
- **Contra A5:** busca por pessoa transforma o produto na ferramenta ideal de um perseguidor. Se este recurso existir, precisa de opt-out efetivo e de não permitir que um terceiro pesquise alguém.

Recomendação: tratar como decisão de produto com parecer jurídico, não como recurso de roadmap. É o item de maior risco regulatório do projeto inteiro.

### 5.2 🟠 Crianças

Casamento tem criança. O Art. 14 da LGPD exige consentimento específico e destacado de **pelo menos um dos pais** para tratamento de dado de criança.

Ninguém vai coletar consentimento parental na porta do salão. Isso precisa de uma posição escrita — provavelmente base legal distinta de consentimento, com o casal como controlador —, não de silêncio.

### 5.3 🟠 Controlador vs. operador

Já registrado como pendência no documento de produto e no [Anexo A da arquitetura](./architecture.md#anexo-a--decisões-em-aberto). Vale ressaltar por quê é urgente e não burocrático: **define quem responde** quando um convidado exigir remoção, quando alguém que aparece numa foto exigir exclusão, e quando houver incidente. Sem essa definição, a resposta a um pedido de titular é improvisada — e improviso em pedido de titular tem prazo legal correndo.

---

## 6. O que nunca se faz

| Nunca | Por quê |
|---|---|
| Token de sessão na URL | Vaza em referer, histórico, print e no grupo do WhatsApp |
| Confiar em chave de armazenamento vinda do cliente | É escrita direta sem autenticação |
| Servir mídia de usuário da origem da aplicação | XSS armazenado com alcance de festa inteira |
| Servir SVG como imagem enviada por usuário | SVG é código |
| Aceitar tipo de arquivo por extensão ou cabeçalho declarado | Ambos são do atacante |
| Liberar para o telão sem passar por aprovação | É a tela que 150 pessoas estão olhando |
| Logar PII crua | Nome, telefone e e-mail em log é vazamento por outro caminho |
| Marca d'água na foto | Estraga a memória e some no compartilhamento |
| **Alterar a mídia do convidado com IA generativa** | O convidado consentiu que a foto fosse **usada**, não **reescrita**. Restilizar, remover pessoa ou inventar detalhe altera a aparência de terceiros que nunca consentiram com nada — agrava a exposição de direito de imagem em vez de reduzi-la, e manda mídia de convidado para o pipeline de um fornecedor externo ([ADR 0007](./adr/0007-ai-policy-luts-not-generation.md)) |
| Deletar acervo com export pendente ou falho | Memória insubstituível. É o único job que **precisa** falhar aberto |
| Relaxar RLS para resolver query cruzada | Existe papel dedicado e auditado para isso |
| `SET` em vez de `SET LOCAL` | Vaza escopo de evento pelo pool de conexão |
| Reprocessamento de imagem no caminho de request | Viola a regra das duas dependências duras |

---

## 7. O que é verificado por máquina

Segurança que depende de lembrar não é controle, é intenção. Estes rodam bloqueantes no CI desde o primeiro commit:

| Guard | O que falha o pipeline |
|---|---|
| **Isolamento entre eventos** | Teste contra banco real, com escopo definido, provando que o evento A não lê o B mesmo com id mal configurado. Job dedicado e visível, para que um refactor não o apague em silêncio |
| **Conformidade de tokens** | Hex literal ou cor arbitrária em componente ([ADR 0003](./adr/0003-runtime-token-resolution.md)) |
| **Disciplina de packs** | Import de `core` para `pack` |
| **Segredos** | Varredura de segredo em commit |
| **Dependências** | Auditoria de vulnerabilidade conhecida; lockfile obrigatório |
| **Cabeçalhos** | Teste de contrato de CSP, `nosniff` e `Content-Disposition` na rota de mídia |
| **Sessão** | Teste que falha se um token aparecer em querystring ou em log |

Os testes de isolamento rodam contra o banco real, **nunca contra mock**. Provar isolamento contra um mock prova que o mock está isolado.

---

## 8. Auditoria

Toda ação sensível registra **ator, ação, recurso e a decisão aplicada** — não só as negadas. Sem o "por quê" da decisão não se reconstrói um incidente sem reconsultar o estado, que a essa altura já mudou.

Escopo mínimo: acesso e download de acervo, remoção de mídia, mudança de moderação, rotação de slug, leitura cruzada por fornecedor ou plataforma, export, exclusão, mudança de canal de contato.

O log de auditoria é **append-only**. Escrita assíncrona: uma falha de auditoria nunca pode derrubar o caminho do request — e um caminho de request nunca pode pular a auditoria por conveniência.

---

## 9. Resposta a incidente

Quatro cenários com resposta pré-escrita, porque nenhum deles admite improviso no sábado à noite.

| Cenário | Primeira ação | Depois |
|---|---|---|
| **Conteúdo impróprio no telão** | Anfitrião remove; propaga em segundos | Revisar por que passou o classificador |
| **Link vazou durante a festa** | Rotacionar slug. Sessões ativas continuam | Avisar o anfitrião pelo admin |
| **Conteúdo ilegal com menor** | Preservar, não deletar. Bloquear acesso | Procedimento legal escrito. **Precisa existir antes do 1º evento** |
| **Pedido de titular** (remoção, acesso) | Registrar com data — o prazo legal já está correndo | Depende de controlador vs. operador (§5.3) |

---

## 10. Pendências de segurança, priorizadas

| # | Item | Bloqueia |
|---|---|---|
| 1 | 🔴 Procedimento para conteúdo ilegal com menor | **1º evento** |
| 2 | 🟠 Controlador vs. operador, com advogado | **1º evento** |
| 3 | 🟠 Caminho de remoção para quem aparece na foto e não a enviou | **1º evento** |
| 4 | 🟠 Posição sobre imagem de crianças | **1º evento** |
| 5 | 🟠 Política para nome ofensivo exibido no telão ([`flows.md` N3.3](./flows.md#32-o-nome--obrigatório-e-por-quê)) | **1º evento** |
| 6 | 🔴 Parecer jurídico sobre agrupamento facial como dado biométrico | Antes de **construir** a Fase 2 |
| 7 | 🟡 Avaliação de busca por pessoa contra o ator A5 | Antes de **desenhar** o recurso |

> "Quem modera durante a festa" saiu desta lista: foi decidido em [`flows.md` §4](./flows.md#4-f3--workflow-da-mídia) — ninguém modera, o padrão é publicar tudo, e a defesa passou a ser automática (classificador, denúncia, botão de pânico).

Os cinco primeiros são baratos agora e caríssimos depois — inclusive em reputação, num mercado que roda inteiro em boca a boca de grupo de noiva.
