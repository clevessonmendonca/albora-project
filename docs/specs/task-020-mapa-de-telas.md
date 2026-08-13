# Task 020 — Mapa de telas e fluxos

> **Tipo:** design / mapa (não é contrato de uma tarefa só — é o inventário que alimenta as ondas de construção do `/telas`).
> **Fonte visual:** [`/telas`](../../apps/web/app/telas/page.tsx). Toda tela nova nasce aqui primeiro, rodando pelo `resolverTokens` real, dentro do pack. Trocar o pack redesenha o catálogo inteiro — é a única forma de um projeto de tela não mentir sobre o código.
> **Manda sobre isto:** [`CLAUDE.md`](../../CLAUDE.md) (não-negociáveis), [`architecture.md`](../architecture.md), os ADRs citados por tela.

## Por que este documento existe

Reunimos referências de apps de feed social, "memories", diário, galeria e viagem. Elas são bonitas e resolvem mecânicas que a Albora também tem (grade de fotos, reação, capítulos, player, recap, envio pra pessoas). Mas quase todas carregam uma **identidade de rede social entre pessoas** — perfil, seguidores, seguir, stories de contas, DM — que a Albora **não é** ([ADR 0009](../adr/0009-app-social-do-convidado.md)): o feed vive dentro de um evento e morre com ele, não há conta Albora.

Este mapa faz a tradução: **pego a mecânica, largo a identidade de rede social e os anti-padrões visuais banidos.** Cada tela abaixo carimba sua fase (A = pronto pro 1º evento, B = pós-H1, C = escala) pra nenhuma pretender ser MVP sem ser.

## Princípios de tradução (valem pra todas as telas)

1. **Extrair mecânica, largar identidade.** Grade de fotos ✅. Cabeçalho de perfil com "1.5k seguidores · Seguir" ❌ — o convidado não tem conta.
2. **A reação é a estrela da marca.** Coração, aliança, pombinha e coração-de-mãos são anti-padrão listado. Onde a referência põe ❤️, entra `Estrela`.
3. **Zero hex no componente.** Toda cor/fonte/raio/espaço sai de token (`var(--acento)`, `var(--fonte-titulo)`…). As referências que gritam gradiente roxo, glassmorphism, neon ou dark-mode "tech" são exatamente o que a identidade do casal precisa poder sobrescrever — e não pode, se estiver hardcodado. [Ver memória de design: ofício Apple/HIG, glassmorphism é anti-padrão explícito.]
4. **Nada corta na vertical.** Toda proporção é declarada (`9/16`, `3/4`, `16/9`). Nunca `objectFit: cover` num quadro deitado. Vale pra foto e pra vídeo.
5. **O convidado não digita nada além do nome** (e, uma vez na vida, o código de 4 dígitos do parear). Sem senha, sem e-mail, sem busca de perfil.
6. **O gate é honesto.** Antes da hora que o anfitrião escolheu, reação e comentário **não existem na tela** — não aparecem desabilitados.
7. **Chão do convidado = escuro por padrão** (usa às 23h num salão sem luz), reversível por escolha. **Chão do anfitrião = claro** (lido de manhã no sofá). **Parede = escuro, fullscreen, sem cromo.**

## Componentes reutilizados

O build de cada tela nova reaproveita as peças já existentes, não redesenha padding/tipografia:

- **Molduras/telefone:** `Aparelho`, `Navegador`, `Parede`, `BarraDeStatus` (`pecas-de-tela.tsx`).
- **Shell do convidado:** `ChaoConvidado`, `MioloConvidado`, `CabecalhoConvidado`, `BarraDeAbas`, `BotaoPrimario`/`Secundario`, `CampoNome`, `Consentimento`, `AvisoGate`, `CabecalhoPublicacao`, `AvatarAutor` (`shell-convidado.tsx`).
- **Ícones/átomos:** `Estrela`, `IconeComentario`, `IconeCompartilhar`, `IconeGrade`, `IconePilha`, `IconeMais`, `IconePessoa`, `IconeVoltar`, `Pilula`, `BotaoFlutuante`, `Moldura`.
- **Anfitrião:** `Lateral` (8 seções), `Cartao`, `Interruptor`, `Marcador` (hoje em `telas.tsx`).

Quando uma tela precisa de um átomo novo, ele entra no `pecas-de-tela.tsx` e vira reutilizável — nunca inline.

---

# Superfície A — Convidado (PWA, chão escuro, sem login)

Shell de 5 abas: **Feed · Missões · Câmera (central) · Álbum · Minhas**. A câmera é o botão do meio (mecânica consolidada pelo Instagram). Sem aba de conversa, sem aba de planejamento.

### Já no catálogo (recapitulando, não re-especificar)
`TelaCapa` (claro/escuro) · `TelaEntrada` · `TelaCamera` · `TelaFeed` · `TelaAntesDoGate` · `TelaAlbum`.

---

## A-01 · Scanner de QR / chegada — **Fase A**

- **Propósito.** A primeira superfície depois de abrir o link/apontar a câmera. E o ponto de retorno: toda tela sem saída precisa oferecer "escanear outro QR". [Ver memória: scanner de QR em toda tela sem saída — mandar escanear sem dar como custa participação, e participação decide o negócio.]
- **Wireframe.** Chão escuro. Visor de câmera ao vivo ocupando a tela; moldura-alvo central discreta (cantos, não retângulo cheio); título curto "Aponte para o QR da festa" sobre o visor; rodapé com "Já tenho o link" (cola URL) e nada mais. Sem barra de abas (ainda não há evento).
- **Referência → pego / largo.** Utilitário, sem ref social. **Largo** qualquer "add friend"/scan-de-perfil.
- **Não-negociáveis.** Sessão escopada a UM evento só existe depois do QR resolver o `event_id`. Lugar/foto ainda não; só identificação do evento.
- **Reutiliza.** `ChaoConvidado(semStatus)`, `BotaoFlutuante`, `Moldura` (visor).

## A-02 · Missões (aba) — **Fase A**

- **Propósito.** Onde o convidado vê as missões fotográficas do evento e seu progresso. As missões aumentam a participação; a aba as torna visíveis sem transformar a câmera em menu.
- **Wireframe.** Cabeçalho "Missões · 1 de 4". Card grande da **missão de agora** (título do pack, ex.: "a mesa mais cheia", contador "toque pra fotografar" → abre câmera já na missão). Abaixo, lista/grade das demais: as feitas com miniatura da foto que a cumpriu + `Estrela` cheia; as abertas em estado neutro. Rodapé: `BarraDeAbas(ativa="missoes")`.
- **Referência → pego / largo.** "Explore Week" (journal) e os cards de highlights (memories) inspiram o card-da-vez + trilha de progresso. "AI Smart Albums" inspira a grade. **Largo** o "AI"/auto-organização generativa, ranking/leaderboard e qualquer gamificação de placar entre pessoas.
- **Não-negociáveis.** Zero string de domínio no componente — título vem de `texto(pack, missao.chaveTitulo)`. Sem GPS: se a missão tem lugar, é lista fechada. A reação/marca é `Estrela`, nunca coração.
- **Reutiliza.** `BarraDeAbas`, `Pilula`, `Estrela`, `Moldura`, `Cabecalho`.

## A-03 · Minhas (aba) — **Fase A**

- **Propósito.** As fotos que **este** convidado enviou. Ver, remover a própria mídia, e ver a cota de vídeo (grátis: 1). É o exercício concreto do que o token de sessão autoriza: subir, reagir, remover a própria mídia — nada além.
- **Wireframe.** Cabeçalho "Minhas · 14". Faixa de cota de vídeo ("1 vídeo · usado" / "1 vídeo grátis"). Grade das próprias fotos (3 colunas). Toque numa → abre `A-04` já com o ✕ de remover ativo (porque é dela). Estado vazio: "Suas fotos aparecem aqui assim que a primeira subir" + atalho pra câmera.
- **Referência → pego / largo.** A aba "My Uploads" (galeria Geniusee) e a grade de galeria de viagem. **Largo** o cabeçalho de perfil (avatar grande, seguidores, "Follow", bio, contagem de posts) — o convidado não tem perfil.
- **Não-negociáveis.** Remover só a **própria** mídia (o token não autoriza mexer na alheia). Cota de vídeo por convidado. Chaves de storage derivadas no servidor — nunca expostas aqui.
- **Reutiliza.** `BarraDeAbas`, `Pilula`, `Moldura`, grade do `TelaAlbum`.

## A-04 · Foto aberta (detalhe) — **Fase A**

- **Propósito.** Uma foto em tela cheia com sua reação, seus comentários e quem a enviou. É o destino de tocar numa foto no feed/álbum/minhas.
- **Wireframe.** Foto grande na proporção real (sem crop). Sobre/abaixo: primeiro nome de quem enviou + capítulo·horário (ex.: "Bia · 23h41 · Pista"). Linha de ações: `Estrela` + contador · `IconeComentario` + contador · `IconeCompartilhar` **só se a foto é do próprio convidado** (senão o ícone não existe — `autorizarCompartilhamento` nega `nao_e_autor`). `IconeMais` → sheet de denúncia (`A-06`). Se for a própria foto: ✕ remover. Comentários listados abaixo (primeiro nome + texto). Se antes do gate: sem reação e sem comentário, só a foto e o autor.
- **Referência → pego / largo.** O post-detail dos apps de feed (foto grande, ações, legenda). **Largo** coração (→ `Estrela`), "Follow", @handle clicável pra perfil, DM, contagem de likes como métrica de vaidade pública.
- **Não-negociáveis.** Gate honesto. Compartilhar só na foto do próprio autor. Sem link pra "perfil" de ninguém. Comentário mora na foto, não numa caixa paralela.
- **Reutiliza.** `CabecalhoPublicacao`, `AvatarAutor`, `Estrela`, `IconeComentario`, `IconeCompartilhar`, `IconeMais`, `Moldura`.

## A-05 · Comentar (sheet) — **Fase A**

- **Propósito.** Compositor de comentário sobre uma foto. Aberto por baixo, sobre `A-04`.
- **Wireframe.** Bottom-sheet: lista dos comentários existentes (primeiro nome + texto + horário) e, fixo embaixo, campo "Escreva um comentário…" + botão enviar. Fecha com arraste pra baixo.
- **Referência → pego / largo.** A thread de respostas ("36 replies", Geniusee) inspira a lista + composer. **Largo** avatares que linkam pra perfil, @menções que abrem contas, reações a comentários.
- **Não-negociáveis.** Só abre depois do gate. Sem PII crua em log. O autor é primeiro nome, não conta.
- **Reutiliza.** `AvatarAutor`, `BotaoPrimario`, campo de texto do shell.

## A-06 · Denúncia (sheet) — **Fase A**

- **Propósito.** O convidado sinaliza uma foto pra moderação. Alimenta a fila de revisão do anfitrião ([spec 011](./task-011-moderacao.md)).
- **Wireframe.** Sheet compacto a partir do `IconeMais`: "Sinalizar esta foto" + motivo curto opcional; confirmação discreta "Recebido, o anfitrião vai revisar". Sem expor contadores de denúncia ao convidado.
- **Referência → pego / largo.** O menu "…" dos apps. **Largo** "block user", "report account" — não há usuários/contas pra bloquear.
- **Não-negociáveis.** Moderação **degrada, nunca falha** o caminho crítico: a denúncia entra numa fila, não trava o upload. `n` denúncias pra segurar vem de `padroesDoEvento` (1 quando há menores). Auditável.
- **Reutiliza.** sheet de `A-05`, `BotaoSecundario`.

## A-07 · Fila de envio / offline — **Fase A** ⚠️ caminho crítico

- **Propósito.** Tornar visível e confiável a fila persistente de upload. O sinal cai, o browser dorme, o convidado sai da tela — sem fila persistente a foto some e a participação vai a zero. Isto **não é otimização**, é não-negociável.
- **Wireframe.** Dois estados: (a) **indicador** — a pílula "3 na fila" do cabeçalho da câmera, tocável; (b) **painel** — sheet listando cada item: miniatura + estado (enviando / na fila / falhou·tentar de novo / enviado ✓) + banner "Sem sinal — a gente reenvia sozinho quando voltar". EXIF já removido no cliente antes de entrar na fila.
- **Referência → pego / largo.** Sem ref social — mecânica própria da Albora. **Largo** qualquer "story upload" efêmero (aqui nada expira).
- **Não-negociáveis.** Fila **persiste** (sobrevive a recarregar/dormir). Upload é PUT presigned direto no storage — o servidor nunca toca os bytes. EXIF removido no cliente. Retry com backoff. Depende só de storage + Postgres; nada mais no caminho.
- **Reutiliza.** `Pilula`, sheet, `Moldura`, `Estrela`/ícone de estado (novo átomo de status se preciso).

## A-08 · Música (rota) — **Fase A**

- **Propósito.** A música do casal tocando no evento; o convidado vê o que está tocando ([spec 018](./task-018-musica-do-casal.md)). É a trilha do casal, não áudio social do convidado.
- **Wireframe.** Chão escuro. Capa/arte grande (da foto do evento, borrada com token), título da faixa + "escolha do casal", onda de áudio + play/pause + tempo. Nada de fila colaborativa nem "curtir música".
- **Referência → pego / largo.** O player de voice-note ("Sunday Morning", onda de áudio) inspira o layout do player. **Largo** gravar/postar áudio do convidado, comentários em áudio, playlist social.
- **Não-negociáveis.** IA generativa nunca toca a mídia. Sem captura de áudio do convidado nesta tela (isso é o recado dos anfitriões, `A-12`, e é recebido, não gravado aqui).
- **Reutiliza.** `Moldura`, controles novos de player (átomo).

## A-09 · Estados vazios — **Fase A**

- **Propósito.** Feed, álbum, minhas e missões antes de existir foto. O primeiro convidado do evento vê tela vazia; ela precisa convidar, não desanimar.
- **Wireframe.** Por aba: ilustração/token discreto + uma frase ("Seja o primeiro a fotografar") + atalho pra câmera. No feed antes do gate, o `AvisoGate` já cobre parte.
- **Referência → largo.** Onboardings ilustrados servem de tom, mas **largo** o "convide amigos"/growth-loop.
- **Reutiliza.** `AvisoGate`, `BotaoPrimario`, `BarraDeAbas`.

## A-10 · Confirmação da 1ª foto → convite do app (segunda porta) — **Fase B**

- **Propósito.** Depois do **primeiro** upload bem-sucedido, uma confirmação comemorativa que também convida a instalar o app — a "segunda porta" ([ADR 0008](../adr/0008-app-nativo-como-segunda-porta.md)). O convite aparece **aqui, na confirmação da 1ª foto, nunca antes**.
- **Wireframe.** Overlay/tela cheia: "Sua primeira foto entrou 🎉" + miniatura; abaixo, convite discreto "Quer receber o álbum e reagir mais fácil? Instale o app" com botão. Fechável — instalar é opcional, a web faz tudo.
- **Referência → pego / largo.** Os cards "Download the App" e o onboarding "Memories Shared". **Largo** o "Download the App" **sempre visível** (na referência ele fica na sidebar o tempo todo) — aqui ele só existe neste momento.
- **Não-negociáveis.** A 1ª foto nunca passa por loja nem tela de auth. O convite não bloqueia nada.
- **Reutiliza.** overlay, `BotaoPrimario`/`Secundario`, `Moldura`.

## A-11 · Parear (código de 4 dígitos) — **Fase B**

- **Propósito.** Passar a sessão da web pro app instalado. É a única coisa que o convidado digita além do nome.
- **Wireframe.** Na web: "Seu código: **4821**" grande + "abra o app e digite". No app: quatro casas + teclado. Sucesso → sessão migrada, mesmo evento.
- **Referência → largo.** Sem ref; **largo** login/senha/e-mail.
- **Não-negociáveis.** Token opaco, assinado, escopado a UM evento, não transferível. O código passa a sessão, não cria conta.
- **Reutiliza.** `CampoNome`-like (casas de dígito, átomo novo), `BotaoPrimario`.

## A-12 · Recado dos anfitriões — **Fase B**

- **Propósito.** Mensagem (áudio/texto) do casal pros convidados ([spec 019](./task-019-recado-dos-anfitrioes.md)). Recebida, não composta pelo convidado.
- **Wireframe.** Card no topo do feed/capa: avatar do casal + "um recado dos noivos" + player de áudio (onda + play) ou texto curto. Toque expande.
- **Referência → pego / largo.** Player de voice-note. **Largo** responder em áudio, thread de áudios.
- **Não-negociáveis.** Só o casal publica; o convidado só ouve/lê.
- **Reutiliza.** player de `A-08`, `AvatarAutor`.

## A-13 · Recap / "tocar memória" — **Fase C**

- **Propósito.** Um slideshow da noite pro convidado rever — coerência visual pela LUT do evento, idêntica em todas as fotos.
- **Wireframe.** Botão "Tocar memória" (na capa/álbum) → tela cheia, fotos passando com a mesma LUT, música do casal por baixo, sem cromo. Fim → "ver o álbum".
- **Referência → pego / largo.** "Play Memory"/"Play Memories" (memories, travel). **Largo** IA generativa (restilização, upscale, preenchimento) — proibido tocar a mídia; o visual é LUT no cliente, idêntico em tudo.
- **Não-negociáveis.** IA generativa nunca toca a mídia do convidado. Nada corta na vertical no slideshow.
- **Reutiliza.** `Moldura`, player de `A-08`.

---

# Superfície B — Anfitrião (web, chão claro, com login)

Lateral de 8 seções (`Lateral`): **Ao vivo · A parede · O álbum · Missões · Identidade · Moderação · O livro · Convidados**. Hoje só "Ao vivo" e "A parede" têm tela.

### Já no catálogo
`TelaPainel` (ao vivo, + variante menores) · `TelaModelosDaParede` (aceita/recusa).

---

## B-01 · Login / magic link — **Fase A**

- **Propósito.** O anfitrião **tem** login (o convidado nunca). Entrada por magic link ([ADR 0006](../adr/0006-hosting-platform.md), rota `entrar` existe).
- **Wireframe.** Chão claro, centrado: logo Albora, "Entre pra ver sua festa", campo e-mail, botão "enviar link". Estado "verifique seu e-mail". Sem senha.
- **Não-negociáveis.** Segredos nunca no repo; e-mail via Resend com domínio verificado. Nunca logar e-mail cru.
- **Reutiliza.** `BotaoPrimario`, `CampoNome`-like.

## B-02 · Criar evento (wizard) — **Fase A**

- **Propósito.** O primeiro uso do anfitrião: do nada até um evento com QR pronto. Multi-passo, uma decisão por passo.
- **Wireframe.** Passos: (1) Nome + data + `expected_guests`; (2) **Identidade** (`B-03`) com preview ao vivo; (3) **Missões** (escolher do pack); (4) **Parede** (`TelaModelosDaParede`); (5) **Peças** (`B-08`, gera QR). Barra de progresso; "voltar/continuar". Fim → Painel ao vivo.
- **Referência → pego / largo.** Onboardings multi-tela dão o ritmo "uma coisa por passo". **Largo** pedir dados pessoais dos convidados, criar contas pra eles.
- **Não-negociáveis.** Nenhuma string de domínio hardcodada — casamento é um pack. Nenhuma pergunta de idade em lugar nenhum.
- **Reutiliza.** `Cartao`, `Interruptor`, `Marcador`, `BotaoPrimario`, componentes de `B-03`/`B-08`.

## B-03 · Identidade (seção) — **Fase A**

- **Propósito.** O casal escolhe cores/fonte e vê o preview das telas do convidado mudarem ao vivo. É o coração do "um resolvedor, N renderizadores".
- **Wireframe.** Esquerda: controles (paleta/acento, fonte de título, raio). Direita: um `Aparelho` com `TelaCapa`/`TelaFeed` re-renderizando a cada mudança, provando que web/telão/PDF consomem o mesmo resolvedor.
- **Referência → largo.** Sem ref direta — é diferencial do produto. **Largo** temas prontos "dark tech"/glassmorphism/gradiente roxo (anti-padrões).
- **Não-negociáveis.** Toda cor sai de token; o preview usa `resolverTokens` real, não um mock. `brand/` manda sobre qualquer DESIGN.md. [Ver memória: brand/ é canônico.]
- **Reutiliza.** `Aparelho`, `TelaCapa`/`TelaFeed`, `Cartao`.

## B-04 · Missões (seção / editor) — **Fase B**

- **Propósito.** O anfitrião liga/desliga e ordena as missões do pack; opcionalmente ajusta título.
- **Wireframe.** Lista das missões do pack com `Interruptor` + arrastar pra ordenar; preview de como aparece na câmera (`A-02`/`TelaCamera`).
- **Referência → largo.** **Largo** missões "IA sugeridas", gamificação de placar.
- **Não-negociáveis.** Título via `texto(pack, chave)`; sem string de domínio no núcleo/JSX.
- **Reutiliza.** `Cartao`, `Interruptor`, `Lateral(ativa="Missões")`.

## B-05 · O álbum (seção, visão do anfitrião) — **Fase A**

- **Propósito.** O anfitrião vê o álbum completo e pode ocultar uma foto (curadoria leve, distinta do álbum do convidado).
- **Wireframe.** `Lateral(ativa="O álbum")` + grade grande filtrável por capítulo; hover/seleção revela "ocultar". Contadores reais.
- **Referência → pego / largo.** Grades de galeria. **Largo** "compartilhar publicamente", álbuns por pessoa.
- **Não-negociáveis.** Isolamento por `event_id`; nunca query cruzando eventos.
- **Reutiliza.** grade do `TelaAlbum`, `Lateral`, `Pilula`.

## B-06 · Moderação (fila) — **Fase B**

- **Propósito.** Revisar o que foi segurado: fotos denunciadas ou marcadas pelo classificador. Aprovar/ocultar.
- **Wireframe.** `Lateral(ativa="Moderação")` + fila de cards: foto + motivo (denúncia/classificador) + "manter/ocultar". Contador "0 na fila" quando limpo.
- **Referência → largo.** **Largo** ban de conta, histórico de reputação de usuário.
- **Não-negociáveis.** Classificador **fora** do caminho crítico (degrada). `n` denúncias pra segurar vem de `padroesDoEvento`. Auditável (ator, ação, decisão). Nunca PII crua em log.
- **Reutiliza.** `Cartao`, `Lateral`, `Moldura`.

## B-07 · Convidados (funil) — **Fase B**

- **Propósito.** Participação sobre `expected_guests` — o número que decide a H1. Funil e chegada agregados, não uma lista de contatos pra abordar.
- **Wireframe.** `Lateral(ativa="Convidados")` + números grandes (esperados / que fotografaram / % participação) + funil simples + "chegando agora" (últimas fotos). Sem lista nominal com "enviar mensagem".
- **Referência → pego / largo.** As telas "Send to"/"Suggestions"/"members" dão a ideia de audiência. **Largo** por completo o envio individual pra pessoas, perfis, status "online" — a Albora não manda mensagem pra convidado (ele não recebe e-mail/SMS).
- **Não-negociáveis.** O convidado nunca recebe e-mail/SMS/notificação até haver decisão própria. Métrica é agregada, sem expor PII.
- **Reutiliza.** cards de número do `TelaPainel`, `Lateral`, `Moldura`.

## B-08 · Peças (placa/card com QR) — **Fase A**

- **Propósito.** Gerar a peça impressa com o QR do evento (SVG→PDF), a porta física do convidado ([spec 009](./task-009-admin-e-pecas.md)).
- **Wireframe.** Preview da placa/card (QR nível H + URL legível + nome do evento, tudo por token) + "baixar PDF"/"baixar SVG". Validação de contraste do QR.
- **Referência → largo.** Sem ref social.
- **Não-negociáveis.** Chave/URL derivada no servidor; fonte embutida no CI; a marca do casal manda no visual da peça (mesmo resolvedor da tela e do telão — se divergir, a placa não combina com o telão).
- **Reutiliza.** `resolverTokens`, `Moldura`, `BotaoPrimario`.

## B-09 · O livro (curadoria) — **Fase C**

- **Propósito.** Selecionar fotos pro livro impresso. Diagramação **por slots**, nunca posicionamento livre — não é editor de canvas.
- **Wireframe.** `Lateral(ativa="O livro")` + páginas com slots pré-definidos; arrastar foto pra um slot; capítulos como seções. Preview do spread.
- **Referência → pego / largo.** Layouts "pinned"/highlights e as grades de álbum dão os arranjos de slot. **Largo** posicionamento livre, redimensionar/rotacionar caixa, camadas.
- **Não-negociáveis.** Slots, não canvas. Mesmo resolvedor de tokens do web/telão. Nada corta na vertical dentro do slot.
- **Reutiliza.** `Enquadramento` (perfis de slot), `Lateral`, `Moldura`.

## B-10 · Retenção / export / excluir — **Fase C**

- **Propósito.** Export pro casal (dia 330), delete (dia 365), e excluir conta/evento de verdade e rápido.
- **Wireframe.** `Lateral` (seção de conta) + estado da retenção (linha do tempo 330/365), "exportar agora", "excluir evento" com confirmação clara e sem fricção de retenção. Memórias automáticas opt-in, desligáveis num toque.
- **Referência → pego / largo.** "Archive Without Deleting" (travel) inspira export-sem-perder. **Largo** dark patterns de retenção ("tem certeza? você vai perder…").
- **Não-negociáveis.** Retenção cumprida por **job**, não por promessa. Excluir exclui de verdade. Migrations forward-only.
- **Reutiliza.** `Cartao`, `Lateral`, `BotaoPrimario`/`Secundario`.

---

# Superfície C — Parede / Telão (fullscreen, chão escuro, sem cromo)

### Já no catálogo
`TelaTelao` × 8 modelos (`polaroide, mural, colagem, ambiente, cheio, carrossel, dump, tbt`).

## C-01 · Vídeo na parede (sem cortar vertical) — **Fase B**

- **Propósito.** A parede e o feed reproduzem vídeo sem recortar 9:16 (roadmap B4).
- **Wireframe.** Mesmos 8 modelos, aceitando `<video>` no lugar do quadro; `cheio` continua o único que recusa em pé. Autoplay mudo, loop curto.
- **Não-negociáveis.** Nada corta na vertical — vale igual pra vídeo. A fila filtra verticais antes de sortear pro `cheio`.
- **Reutiliza.** `Enquadramento`, `TelaTelao`.

## C-02 · Pânico / takeover da parede — **Fase A**

- **Propósito.** O estado da parede quando o anfitrião aciona o pânico (`PATCH /api/parede/panico`, já existe). A parede precisa ter um estado "segurando" honesto.
- **Wireframe.** Tela cheia neutra com o nome do evento e um "voltamos já" discreto (tokens do casal), sem última foto exposta. Volta ao rodízio ao desligar.
- **Não-negociáveis.** Aciona sem recarregar; não vaza a foto que causou o pânico.
- **Reutiliza.** `Chao(fundo="escuro")`, tipografia do `TelaTelao`.

## C-03 · Momento especial na parede (opcional) — **Fase B**

- **Propósito.** Um takeover pontual (ex.: "agora: primeiro brinde") ou o recado do casal na parede.
- **Wireframe.** Card grande sobre o rodízio, por tempo limitado; volta sozinho.
- **Nota.** Mapeado como opção; só desenhar se o produto priorizar. Sem cromo, sem marca Albora na parede.

---

# Fluxos

## Fluxo do convidado

```
Escanear QR (A-01)
   └─> Entrada: nome + consentimento (TelaEntrada)      [consentimento versionado ANTES de capturar]
         └─> Capa do evento (TelaCapa)
               ├─> Câmera + missão (TelaCamera / A-02)
               │      └─> Enviar → Fila (A-07) ──> Confirmação
               │                                      └─(1ª foto)─> Convite do app (A-10) ─> Parear (A-11)
               ├─> Feed (TelaAntesDoGate │ TelaFeed)
               │      └─> Foto aberta (A-04) ─> Comentar (A-05) │ Denúncia (A-06)
               ├─> Álbum (TelaAlbum) ─> Foto aberta (A-04)
               ├─> Minhas (A-03) ─> Foto aberta (A-04, com remover)
               ├─> Música (A-08) │ Recado dos anfitriões (A-12)
               └─> Recap "tocar memória" (A-13)
```

O **gate** (definido pelo anfitrião) decide se o Feed mostra `TelaAntesDoGate` ou `TelaFeed`. Antes dele, reação/comentário não existem na tela.

## Fluxo do anfitrião

```
Login magic link (B-01)
   └─> Criar evento (B-02): Nome/data ─> Identidade (B-03) ─> Missões ─> Parede ─> Peças (B-08)
         └─> Painel ao vivo (TelaPainel)
               ├─> A parede (TelaModelosDaParede) ─> [Pânico C-02]
               ├─> O álbum (B-05)
               ├─> Missões (B-04)
               ├─> Moderação (B-06)      [alimentada por A-06 + classificador]
               ├─> Convidados / funil (B-07)   [sobre expected_guests]
               └─(pós-evento)─> O livro (B-09) ─> Retenção/export/excluir (B-10)
```

---

# Ondas de construção

Só Fase A vira `Tela*` no `/telas` agora. B e C ficam mapeadas, aguardando seu gatilho de fase.

| Onda | Fase | Telas |
|---|---|---|
| **1 — convidado A** | A | A-01 Scanner · A-02 Missões · A-03 Minhas · A-04 Foto aberta · A-05 Comentar · A-06 Denúncia · A-07 Fila de envio · A-09 Estados vazios (· A-08 Música) |
| **2 — anfitrião A** | A | B-01 Login · B-02 Criar evento · B-03 Identidade · B-05 O álbum · B-08 Peças · C-02 Pânico |
| **3 — pós-H1** | B | A-10 Convite app · A-11 Parear · A-12 Recado · B-04 Missões editor · B-06 Moderação · B-07 Convidados · C-01 Vídeo parede · C-03 Momento especial |
| **4 — escala** | C | A-13 Recap · B-09 O livro · B-10 Retenção/export |

Dentro da Onda 1, a prioridade é **A-07 (fila de envio)** — é o único item do caminho crítico de sábado 20h e o que, se quebrar, quebra irreversível.

---

# O que a referência tem e a Albora não (e por quê)

Expandindo a lista que já vive no `/telas`:

- **Perfil, seguidores, "Seguir", @handle clicável.** A Albora não é rede entre pessoas; o convidado não tem conta. O autor é primeiro nome, e não leva a lugar nenhum.
- **DM / caixa de mensagens paralela.** Comentário mora na foto. Uma caixa à parte é outro produto, com outra superfície de moderação.
- **Stories de contas.** A trilha de cima são os **capítulos da noite**, não pessoas.
- **"Download the App" sempre visível.** Só na confirmação da 1ª foto (segunda porta).
- **Coração / aliança / pombinha / coração-de-mãos.** `Estrela` da marca.
- **Gradiente roxo, glassmorphism, neon, dark-mode "tech", fonte script.** Anti-padrões bloqueantes; a cor é do casal, por token.
- **IA generativa sobre a foto** (restilização, upscale, preenchimento, "AI Smart Albums" gerando imagem). Proibido tocar a mídia; coerência sai de LUT no cliente.
- **Enviar/compartilhar individual pra pessoas, "Send to Grandma".** O convidado não recebe e-mail/SMS; a distribuição é o export do casal.
- **Notificação.** Desligada até ter decisão própria (ADR 0009).
- **Aba de planejamento** (cronograma/local/traje) e **selo de plano na tela do convidado.** Fase 4 / quem paga é o anfitrião.
```

