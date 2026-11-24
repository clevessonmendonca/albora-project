# Matriz — host-criar (entrada, criação e cobrança do anfitrião)

Módulo: `host-criar.js`. Rotas (prefixo `#/h`): `/h`, `/h/entrar`, `/h/novo/1..3`, `/h/novo/pronto`, `/h/plano`.
Inventários: A (telas 1–4: `LST`, `ENT`, `NEW`, `COB`) e C seção 1 (`F1`–`F43`). Quando A e C descrevem a mesma coisa, a linha leva os dois IDs.
Legenda de implementação: **Funcional** (faz o que diz e persiste), **Simulado** (comportamento fingido e rotulado na tela), **Depende de integração** (só existe na versão real; o protótipo mostra o resultado esperado).

## Lista de eventos (`/admin` → `#/h`)

| ID / funcionalidade | Tela atual | Nova tela | Implementação | Nota de decisão |
|---|---|---|---|---|
| F1 Título "Seu painel" + e-mail | `/admin` | `#/h` "Seus eventos", saudação com o primeiro nome; e-mail na barra superior e no menu da conta | Funcional | Título passa a dizer o que a tela é (D1). |
| F2 / LST-02 Contador "N eventos" | `/admin` | `#/h` (texto "N eventos", muda com busca e filtro, `role=status`) | Funcional | Contador agora reflete o filtro. |
| F3 / LST-02 "+ Novo evento" | `/admin` | `#/h` botão primário no cabeçalho → `#/h/novo/1` (some no estado vazio, onde o CTA é "Criar meu primeiro evento") | Funcional | Um só primário por tela. |
| F4 / LST-03 Cartão do evento (nome, tipo, data) | `/admin` | `#/h` **lista editorial**: capa (ou monograma em Fraunces na cor do evento) + nome em Fraunces grande + tipo, data, local, plano → `#/h/e/<id>/hoje` | Funcional | Corrige P-08/D7: o nome é o título, não o slug humanizado. Arte: sem cartões; cada linha é um filete com a capa do evento como âncora visual. |
| F5 / LST-03 Selo de status (ao vivo/agendado/encerrado) | `/admin` | `#/h` à direita da linha: **dias que faltam em Fraunces grande** (antes), "Ao vivo agora" (durante) ou "Foi há N dias" (depois); plano em texto | Funcional | Responde à fase da barra Protótipo para o evento 1; eventos criados usam a data real. |
| F6 / LST-04 Sugestão de segundo evento por pack | `/admin` | — | Removido | Depende de `pack.sugereAntes`, sem dado no protótipo e sem decisão de produto; o caminho "Novo evento" fica sempre visível. Registrado em Lacunas. |
| F7 / LST-05 Rodapé "Crie o portal do fornecedor" | `/admin` | `#/h` rodapé; o botão procura a entrada de fornecedor no mapa do protótipo e navega; se ainda não existir, avisa por toast | Funcional (depende do módulo de fornecedor) | Mantido como link discreto. |
| F8 / LST-06 "Sair" sem confirmação (e duas formas de sair) | `/admin` + menu da conta | Uma forma só: "Sair" no menu da conta e no rodapé do trilho; sai direto e avisa por toast | Funcional | Unifica as duas saídas (diagnóstico F8). Sem confirmação porque entrar de novo é um clique. |
| Busca (não existia) | — | `#/h` campo "Buscar por nome, tipo ou local" (sem acento) | Funcional | Pedido do brief; filtra sem recarregar a página. |
| Ordenar (não existia) | — | `#/h` seletor: mais próximos / criados por último / nome | Funcional | Ao vivo sempre primeiro em "mais próximos". |
| Filtrar (não existia) | — | `#/h` filtros em texto Todos / Preparando / Ao vivo / Encerrados com contagem (sublinhado âmbar no ativo) | Funcional | — |
| Estado vazio ("Bem-vindo", `LST-01`) | `/admin` | `#/h` com a barra Protótipo em "Vazio" ou sem eventos, com o mascote | Funcional | Texto "em poucos passos". |
| Estado de carregamento e erro | `loading.tsx` / `error.tsx` | `#/h` "Carregando" e "Erro" da barra Protótipo (com "Tentar de novo") | Funcional | Estados completos nas duas telas de lista. |
| Vazio com filtro (não existia) | — | `#/h` "Nenhum evento encontrado" + "Limpar busca e filtros" | Funcional | — |
| Rascunho: "continuar de onde parei" (não existia, D14) | — | `#/h` linha em filete com nome e passo do rascunho ("N de 3"): "Continuar de onde parei" / "Descartar" (com confirmação) | Funcional | — |
| Redirect sem sessão (`redirect("/admin/sign-in")` sem `next`) | `/admin` | `#/h` sem login → `#/h/entrar?next=…` | Funcional | Agora preserva o destino. |

## Entrar (`/admin/sign-in` → `#/h/entrar`)

| ID / funcionalidade | Tela atual | Nova tela | Implementação | Nota de decisão |
|---|---|---|---|---|
| F9 / ENT-01 E-mail + "Enviar link" | `/admin/sign-in` | `#/h/entrar` campo com rótulo, validação inline ("Esse e-mail parece incompleto…"), botão sempre ativo | Simulado (envio) | O botão desabilitado sem explicação virou erro escrito. Nenhum e-mail sai de verdade. |
| F10 / ENT-02 "Verifique seu e-mail" + reenviar | `/admin/sign-in` | `#/h/entrar` passo "Verifique seu e-mail": e-mail citado, "Reenviar" com contagem de 30 s, "Trocar e-mail" | Simulado | Resolve "reenviar é só voltar ao formulário" (sem contador). |
| F11 Link "Abrir link (dev)" | `/admin/sign-in` | `#/h/entrar` botão "Abrir o link do e-mail (simulado)" + "Simular um link vencido" | Simulado | Faz o papel do clique no e-mail; rotulado como simulado. |
| F12 / ENT-03 "Entrar com Google" | `/admin/sign-in` | `#/h/entrar` abre janela "Entrar com Google (simulado)" com "Continuar como …" ou "Simular uma falha" | Simulado / Depende de integração | O SSO real redireciona ao Google; aqui há a janela que simula as duas saídas. |
| F13 / ENT-04 "Confirmar acesso" (`?m=token`) | `/admin/sign-in?m=` | `#/h/entrar?m=ok` botão "Entrar no painel"; o acesso só é gravado no clique | Simulado | Mantém a regra de não gastar o link antes do clique. |
| F14 `?next=` filtrado | `/admin/sign-in?next=` | `#/h/entrar?next=/h/…` aceita só caminhos `/h…`, bloqueia `//`, `:` e `\` | Funcional | — |
| ENT-05 Erros de link/envio | `/admin/sign-in` | Link vencido: "Este link não vale mais" + "Pedir um novo link" (e-mail já preenchido). Envio com falha: faixa de erro com a barra em "Erro" | Simulado | Toda mensagem diz o que houve e o que fazer; corrige "confirmação com erro não preenche o e-mail". |
| `?error=google` ignorado (diagnóstico D12) | `/admin/sign-in?error=google` | `#/h/entrar?error=google` faixa "Não conseguimos entrar com o Google…" com o que fazer | Funcional | Correção do problema do inventário. |
| Fallback "Carregando…" cru | `/admin/sign-in` | `#/h/entrar` com a logo oficial (`A.logo`) e layout próprio | Funcional | A marca falsa (disco com "a") foi trocada pela logo oficial. |
| F38–F40 Rotas de SSO e magic link do convidado (sem UI) | `/auth/**` | Só a janela simulada do Google acima | Depende de integração | O convidado nunca entra por aqui; `guest-magic` fica no módulo do convidado. |

## Assistente de criação (`/admin/new` → `#/h/novo/1..3`)

Arte (2ª passada): **3 passos** (1 Tipo e nome · 2 Quando e onde · 3 Visual), seguindo `04-arquitetura.md` §6; cada passo tem uma decisão dominante, **prévia viva grande** à direita (faixa no topo no celular) e progresso no **arco da marca**. A revisão é um **resumo recolhível dentro do passo 3** ("Revisar antes de criar"; abre sozinho se houver erro ou "criar sob" de fornecedor). Logo oficial no topo.

| ID / funcionalidade | Tela atual | Nova tela | Implementação | Nota de decisão |
|---|---|---|---|---|
| F15 / NEW-01 Tipo de evento | Passo 1 de 5 | `#/h/novo/1` (parte de cima) lista de 6 tipos em filete, nomes em Fraunces (radiogroup, setas e 1..6) | Funcional | Sem ícones, sem cartões com foto). Trocar tipo volta momentos e missões desligadas ao padrão (com aviso por toast). |
| F15 / NEW-06 "Ajustar missões" | Passo 4 | `#/h/novo/1` link "Ajustar" → folha "Missões e momentos" (liga/desliga missões do pack, cria missão própria, remove com desfazer; **os momentos da festa moram na mesma folha**) | Funcional | Participação deixou de ser passo (04-arquitetura §6). Momentos saíram do passo de data para não competir com a decisão. |
| F22 / NEW-06 Passo "Participação" | Passo 4 | — (consolidado na folha acima) | Funcional | Missões do pack já vêm ligadas por padrão. |
| F16 Atalhos de teclado | Wizard | `#/h/novo/*` Enter continua, Esc/Backspace volta, 1..N escolhe tipo (passo 1) ou estilo (passo 3), setas dentro dos grupos; ignorados em campos e overlays | Funcional | Dicas visíveis no rodapé (some no celular). |
| F17 / NEW-02 Nome (obrigatório, 60, contador) | Passo 2 | `#/h/novo/1` (abaixo do tipo) campo grande em Fraunces com exemplo do pack e contador | Funcional | Nome em Fraunces grande; mesmo passo do tipo. |
| F17 / NEW-02 Data e hora | Passo 2 | `#/h/novo/2` data (só de amanhã em diante) e hora (padrão 18:00 explicado) | Funcional | Primeiro bloco do passo 2. |
| F17 / NEW-02 Convidados esperados | Passo 2 | `#/h/novo/2` convidados 1–999 | Funcional | Junto do local. |
| F17 / NEW-02 Local + CEP (ViaCEP) | Passo 2 | `#/h/novo/2` CEP com máscara, busca simulada (5 CEPs de exemplo), preenche o local sem apagar o que o usuário digitou, degrada com mensagem | Simulado | A consulta é fingida; o comportamento (atraso, respostas atrasadas ignoradas, falha) é o real. |
| NEW-04 Fuso/idioma não editáveis | Passo 2 | `#/h/novo/2` texto "Fuso: Brasília (GMT-3)" | Funcional | O fuso agora fica visível, mas continua fixo. Editar é lacuna. |
| F17 Lista de momentos do pack | Passo 2 | Folha "Missões e momentos" (chips editáveis: remover com desfazer, adicionar com Enter ou botão, sem repetir, máximo 12) | Funcional | Momentos sugeridos por tipo (dado do pack). **Mudou de lugar** (do passo de data para a folha aberta em `#/h/novo/1`). |
| F18 / NEW-03 "Criar sob" + e-mail obrigatório | Passo 2 | `#/h/novo/3` seletor "Criar sob" (Minha conta ou fornecedor) dentro do resumo recolhível; fornecedor exige e-mail validado e explica o papel | Funcional | **Mudou de lugar** (do passo de data para o resumo do passo 3): é contexto da criação, não decisão da festa. Lista de fornecedores vem de `A.data.vendors` se existir, senão de dois exemplos locais. |
| F19 Validação só após tentar | Wizard | `#/h/novo/*` erro inline, `aria-invalid`, foco no 1º erro, também ao criar (leva ao passo com erro: nome 1, data e convidados 2, e-mail 3) | Funcional | `canAdvance` sempre true deixou de existir. |
| F20 / NEW-05 Capa (upload) | Passo 3 | `#/h/novo/3` escolher/trocar/remover (com desfazer); valida tipo e tamanho; redesenha em canvas (tira EXIF/GPS); guarda reduzida no navegador | Funcional | Erro por tipo/tamanho com instrução. Foco da capa vira Topo/Centro/Base. **Sem foto, a capa é o monograma da festa** em Fraunces (antes, ilustração genérica). |
| F20 Paleta extraída da foto | Passo 3 | `#/h/novo/3` opção "Cor da sua foto" (média da foto, escurecida até contraste 4,5:1) | Funcional | Simplificação: uma cor, não várias. |
| F20 / NEW-05 5 estilos | Passo 3 | `#/h/novo/3` radiogroup com o nome na fonte do estilo (1..5); muda fonte e cantos na prévia | Funcional | — |
| F20 / NEW-05 Par de cores, 6 combos, personalizada | Passo 3 | `#/h/novo/3` 6 combos + foto + personalizada (duas cores) + **selo de contraste** (texto, ícone e razão) | Funcional | Selo é adição do redesign: nada só por cor, avisa quando o texto fica ilegível. |
| F21 `LivePreview` | Passos 3 e demais (folha no celular) | **Todos os passos**: prévia ao vivo grande com abas Convidado / Telão / Álbum, ao lado (desktop) ou em faixa no topo (celular); a capa muda com o tipo, o nome, a data, o local, o estilo, as cores e a foto | Funcional | Antes só aparecia no passo 3. Telão e álbum mostram foto vertical inteira. Fotos são ilustração. |
| F23 / NEW-07 Revisão em passo próprio | Passo 5 | `#/h/novo/3` resumo recolhível "O que vai ser criado" com "editar" por linha (leva ao passo certo) e aviso de campo faltando | Funcional | Fica dentro do passo 3 (recolhível), como no fluxo anterior. Inclui linha "Visual". |
| F24 Navegação (StepRail, voltar, sair) | Wizard | `#/h/novo/*` Voltar, Continuar, "Sair" salva o rascunho e avisa; progresso no arco ("Passo N de 3") | Funcional | O trilho de passos clicável foi trocado pelo arco; voltar a um passo anterior é por Voltar ou por "editar" na revisão. |
| D14 Rascunho persistido (não existia) | — | `#/h/novo/*` salva a cada alteração ("Rascunho salvo neste navegador."); `#/h/novo/1` oferece "Continuar de onde parei" / "Começar do zero" (com confirmação) | Funcional | Autosave com texto de estado, sem botão Salvar. |
| F25 / NEW-08 Criar (`POST /api/admin/events`) | Passo 5 | `#/h/novo/3` "Criar evento" (também com Enter): o evento entra em `A.data.events` (persistido em `eventosExtras`) e abre o Pronto | Simulado (servidor) | Data real vira fase e contagem corretas. Erro: com a barra em "Erro", a faixa explica e mantém o rascunho. |
| F25 Missões livres via `PUT …/challenges` | Passo 5 | Gravadas junto do evento (`missoes`) | Simulado | — |
| Passo "Identidade" com telão (4 modelos) | Passo 3 | — | Removido | Escolha de modelo do telão fica em Compartilhar › Telão; a criação usa os 4 modelos. |
| Loading do assistente | — | `#/h/novo/*` com a barra em "Carregando" mostra esqueleto | Funcional | — |

## Tela Pronto (`ReadyStep` → `#/h/novo/pronto`)

| ID / funcionalidade | Tela atual | Nova tela | Implementação | Nota de decisão |
|---|---|---|---|---|
| F26 / NEW-09 Herói "{nome} está pronto." | Pronto | `#/h/novo/pronto?id=…` **mascote espiando + estrela** (`A.mascot`, `A.star`, `A.celebrate`) ao lado do título e da data | Funcional | Sem id, mostra o último evento criado (ou o primeiro). O título deixou de usar a cor do evento. |
| F27 / NEW-09 "Ir para meu evento" | Pronto | Botão de linha "Abrir o painel" no fim da página → `#/h/e/<id>/hoje` | Funcional | O painel abre normalmente com o evento novo. O primário da tela é o WhatsApp. |
| F28 "Ver como convidado" | Pronto | Botão → `#/g/<slug>` | Funcional | — |
| F28 "Compartilhar" (WhatsApp) | Pronto | Mensagem pronta visível + **"Mandar por WhatsApp" (único CTA principal)** + "Copiar mensagem" | Simulado (WhatsApp) | Texto da mensagem aparece, em vez de só o botão. |
| F29 / NEW-09 Upload silencioso da capa | Pronto | Item "Capa do convite" do checklist → "Adicionar foto" (mesma validação) | Funcional | Deixa de ser silencioso: o usuário vê o que subiu. |
| F30 QR inline, link e copiar | Pronto | **Placa impressa** (nome, QR, link, "Aponte a câmera") à esquerda; link visível + "Copiar link" ao lado da mensagem (QR ilustrativo, avisa que não escaneia) | Funcional / Simulado (QR) | QR e link na própria tela, sem ir ao painel (04-arquitetura §6). Arte: o QR é o objeto que vai para a mesa. |
| F30 "Baixar placa com QR" | Pronto | "Baixar placa com QR" mostra toast do que seria baixado | Simulado | O PDF real é do módulo Compartilhar. |
| F31 `AccessEmailStep` (flag ADR 0020) | Pronto | — | Removido | Quem criou já está dentro; o envio de acesso por e-mail fica atrás da flag do produto e não é um passo do protótipo. |
| F32 "Abrir portal do fornecedor" | Pronto | Aparece só se criado sob fornecedor; navega pelo mapa do protótipo | Funcional (depende do módulo de fornecedor) | — |
| F33 / NEW-09 "Ativar o Completo — R$ 199" | Pronto | "Ativar Completo · {preço de `A.data.planos`}" → checkout simulado (forma de pagamento, total, "Pagar (simulado)", recusa simulável) | Simulado / Depende de integração | Preço e itens vêm do catálogo único (D13). Sucesso gera fatura e muda o plano do evento. |
| F34 Checklist "Já pronto: X de 4" | Pronto | "O que falta": 5 itens (link e QR, capa, missões, telão, equipe) com contagem real e ação em cada pendente | Funcional | Corrige "telão e QR marcados prontos por constante": telão só fica pronto quando ligado (hoje sempre pendente aqui). |
| CTAs concorrentes no Pronto | Pronto | Um primário (Mandar por WhatsApp); o resto é botão de linha ou link | Funcional | — |

## Cobrança e plano (`/admin/billing` → `#/h/plano`)

| ID / funcionalidade | Tela atual | Nova tela | Implementação | Nota de decisão |
|---|---|---|---|---|
| F35 Cabeçalho "Cobranças" + voltar | `/admin/billing` (órfã) | `#/h/plano` "Plano e cobrança" (`t-title`) com o evento em foco num seletor discreto (`?e=<id>`); no trilho da conta e no menu da conta | Funcional | Resolve a rota órfã. Sem migalhas (o trilho já situa). |
| COB-01 Texto introdutório | `/admin/billing` | Frase em Fraunces ("Para que nenhuma foto fique de fora.") + "O Completo é pago uma vez por evento… Sem mensalidade." | Funcional | Remove o vocabulário interno (D8). Pagamento único por evento; assinatura mensal é só do fornecedor (outro módulo). |
| F36 / COB-02 Lista de faturas | `/admin/billing` | `#/h/plano` "Faturas": lista em filete (descrição + evento, data, forma, valor, situação Paga/Pendente/Não concluída/Vencida) com filtro Todas/Pagas/Em aberto (links, não pílulas) | Funcional | Vínculo cobrança ↔ evento visível. |
| F36 "Ver fatura" (link externo) | `/admin/billing` | "Ver fatura" (por linha e "Ver fatura deste evento") abre janela com os dados + "Baixar PDF (simulado)" | Simulado | Sem link externo. |
| Pagar fatura em aberto (não existia) | — | "Pagar agora" / "Tentar de novo" na fatura e na linha do evento → mesmo checkout (retoma a fatura aberta, não cria outra) | Simulado | Um só caminho de pagamento. |
| F37 `GET /api/admin/billing` + estados (C/E/V/S) | `/admin/billing` | `#/h/plano` com Carregando / Vazio / Erro (com "Tentar de novo") da barra Protótipo; cabeçalho e seletor ficam | Funcional | — |
| **Evento gratuito: jornada de valor (novo)** | — | Composição editorial: frase, "Seu evento hoje" (fotos x limite com filete, missões ativas, telão pareado, lidos de `A.store`/`A.data`), preço em Fraunces com condição de pagamento, benefícios numerados (só os itens de `A.data.planos`, com o equivalente no Grátis) e **uma** ação primária "Ativar o Completo" | Funcional / Simulado | Checkout com loading, erro recuperável (recusa/indisponível) e sucesso. Preço, itens e limite do Grátis vêm de `A.data.planos`. |
| **Evento pago: gestão (novo)** | — | Plano atual, situação do pagamento (Pago / Pendente / Não concluído com caminho "Pagar agora"/"Tentar pagar de novo"), uso vs. disponível em filetes (fotos, missões, telão, álbum e livro, exportação), valor entregue; primária "Abrir o painel do evento", secundária "Ver fatura deste evento", terciária "Gerenciar plano" (menu) | Funcional / Simulado | Downgrade não é cancelamento de assinatura: é mudança do plano de um evento já pago, sem devolução. |
| Plano atual e trocar (não existia) | — | Ativar via checkout; voltar ao Grátis só pelo diálogo (ver abaixo) | Funcional / Simulado | O plano é por evento. |
| **Outros eventos (novo)** | — | Lista em filete (nome, data, plano + situação, UMA ação: "Ver o Completo", "Gerenciar", "Pagar agora" ou "Tentar de novo"). Celular: nome em linha cheia, plano e ação na linha de baixo; desktop: 3 colunas | Funcional | Substitui a tabela de preços única e os cartões idênticos. |
| Tabela de preços única (D13) | 3 arquivos divergentes | Preço e itens lidos só de `A.data.planos`; a comparação Grátis x Completo mora nos benefícios ("No Grátis: …") e no diálogo de downgrade | Funcional | A tela Pronto e o checkout leem a mesma fonte. A tabela comparativa foi removida (informação aparece uma vez). |
| **Downgrade com retenção honesta (novo)** | — | "Voltar ao Grátis" (menu Gerenciar plano) não executa: abre UM diálogo por tentativa, "Que tal continuar guardando cada momento?": consequências reais (limites do Grátis x Completo), "Continuar com o Completo" (primária), "Confirmar mudança para o Grátis" (texto vermelho), "Voltar sem alterar" | Funcional / Simulado | Sem escassez, contador ou depoimento. O valor pago não ser devolvido é premissa herdada da 1ª versão: confirmar com o produto. |
| **Oferta de retenção (novo)** | — | Só aparece com campanha válida em `A.store` `retencao:campanha` ({id, plano, tipo, valor, validade, limite, status}); validada por `servidorValidaOferta(evento, campanha)` (plano, status, validade, limite, tipo/valor, uso por evento) que devolve o motivo. Mostra desconto, preço final, condições e prazo; aceita = crédito para o próximo Completo (aplicado no checkout); registro em `retencao:log` (exibida/aceita/recusada) | Funcional (simulado) / Depende de backend | Padrão: nenhuma campanha. Semântica (crédito no próximo evento) é decisão de produto proposta aqui; no real a validação e o limite vivem no servidor. |
| **Analytics `A.track` (novo)** | — | Emissor local (`analytics:log`, sem PII nem valores): planos_visualizados, upgrade_clicado, checkout_iniciado, pagamento_concluido, downgrade_tentado, oferta_exibida, oferta_aceita, oferta_recusada, downgrade_confirmado, erro_fluxo; vista no painel de simulação | Funcional (local) / Depende de backend | Filtro de propriedades bloqueia nome, e-mail, cartão, forma, valor e preço. |
| **Painel de simulação (novo)** | — | `<details>` no fim da tela: configurar/limpar campanha, mudar situação do pagamento do evento, ver analytics e registro da oferta | Simulado | Rotulado "só no protótipo"; não aparece para o usuário final. |
| **API `A.plan` (novo)** | — | `A.plan.upgrade(eventId)`, `A.plan.downgrade(eventId)`, `A.plan.nudge(contexto[, {eventId, critico, superficie}])` → bloco HTML sóbrio ou '' (evento Completo, convidado, tarefa crítica, não-dono). Contextos: apos-criar, limite-gratis, antes-da-festa, telao, recurso-exclusivo | Funcional | Outros módulos podem chamar; o clique leva a `#/h/plano?e=<id>&de=<contexto>`. Nenhum módulo chama ainda. |
| Forma de pagamento (não existia) | — | Lista em filete (cartão Visa final 4242, Pix): tornar padrão, adicionar cartão (só 4 dígitos), remover (confirmação; não deixa remover a última) | Simulado | Nenhum dado de cartão real é pedido ou guardado. |
| Papéis (não existia) | — | Casal e cerimonialista veem a tela com aviso e botões desativados | Funcional | Só o dono troca plano e pagamento (regra proposta; confirmar com o produto). |

## Casca e estados globais

| ID / funcionalidade | Tela atual | Nova tela | Implementação | Nota de decisão |
|---|---|---|---|---|
| F41 `AdminShell` (conta) | `/admin` | Casca de conta (trilho + barra inferior no celular) em `#/h` e `#/h/plano`; sem trilho de evento | Funcional | Entrada e criação ficam fora do trilho do evento. |
| F42 `MenuDaConta` (tema, ajuda, sair) | Dentro do evento | Menu da conta em `#/h`: eventos, plano e cobrança, tema, sair | Funcional | Ajuda fica com o módulo do painel. |
| F43 `AppNav` mobile | Dentro do evento | Fora do escopo (módulo do painel); aqui há barra inferior própria de 4 itens | Funcional | — |
| Mapa do protótipo e ⌘K | — | 5 entradas no mapa + 3 comandos (novo evento, plano e cobrança, sair) | Funcional | — |

## Lacunas e limitações

- **2ª passada de arte**: o assistente mantém 3 passos (decisão do arquiteto: menos etapas e cliques); a revisão é um resumo recolhível no passo 3. O rascunho guarda `passo` (até 3).
- A faixa de prévia no celular mostra só a capa e o título (as abas Telão e Álbum ficam ocultas); no desktop as três abas aparecem.
- A tela Pronto usa a página inteira sem o trilho do evento (como antes).
- **Plano (`#/h/plano`)**: contagem de fotos do evento 1 vem de `A.data.photos`; dos demais, do total-base (48) menos as removidas em `hv.ph.<id>` (aproximação; o modelo de fotos é do módulo do painel). "Hoje" da validade da campanha é o relógio do protótipo (14/11/2026). Álbum e livro e exportação só mostram disponibilidade; não geram nada. Política real de pagamento pendente/falho em evento já Completo (prazo, bloqueio) não existe nos dados: a tela só informa a situação.

- Sugestão de segundo evento por pack (F6/LST-04) não foi implementada.
- O fuso é só exibido (Brasília); não dá para editar.
- A busca de CEP é um dicionário de 5 CEPs; a lista de fornecedores usa `A.data.vendors` se o módulo de fornecedor a criar, senão dois nomes locais; "Criar sob" não cria vínculo real.
- Rascunho, eventos criados, capas, faturas e métodos ficam no `localStorage` (`crRascunho`, `eventosExtras`, `crCapas`, `crPlanos`, `crFaturasNovas`…). **O armazenamento é compartilhado com os outros módulos**: um "Reiniciar dados" ou `localStorage.clear()` em outra aba apaga tudo isto (aconteceu durante os testes).
- Eventos criados aqui entram em `A.data.events` com campos extras (`dataIso`, `capa`, `momentos`, `missoes`, `vendorId`); as telas dos outros módulos só os mostram se lerem esses campos. Missões, fotos e convidados do novo evento começam vazios nas telas que leem `A.data.missions/photos/guests` (dados globais do evento 1).
- Telão e equipe sempre aparecem como pendentes no Pronto (não há estado de "telão ligado" compartilhado).
- Capa: guarda uma imagem reduzida (720 px, JPEG) no navegador; não há recorte nem foco além de Topo/Centro/Base.
- Sem confirmação de e-mail real, pagamento, WhatsApp nem download de placa ou PDF: tudo simulado e rotulado.
- Não testado com leitor de tela; a navegação por teclado foi exercitada por eventos de teclado programados, não por uso manual. Contraste foi medido só no selo de cores do evento.
