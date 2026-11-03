# Auditoria de arte: Fornecedor white-label e páginas públicas (`vendor.js`, rotas `#/f` e `#/p`)

Método: cada tela aberta no navegador em 1360 e 375 de largura, com o portal Aurora (claro, cor terracota) e o Noite Clara (escuro). As dez perguntas: 1 identidade, 2 logo oficial, 3 mascote/avatar, 4 âmbar correto (cromo ≠ cor do evento), 5 personalidade, 6 quantidade de informação, 7 hierarquia, 8 componente desnecessário, 9 ação principal, 10 nível de produto.

Impeccable usado: `critique.md`, `craft-floor.md` (cartões iguais, kicker, métrica-herói banidos), `layout.md`, `typeset.md`, `operate.md` (tabela densa e ordenável), `polish.md`, `distill.md`. Hook de design sem pendências.

Princípio white-label adotado: no portal a marca principal é a do fornecedor (monograma ou logo enviada, cor dele em `--ac`); a Albora aparece só como "feito com Albora" com o símbolo oficial (`A.mark`) e some no plano Agency. Nas telas que são da Albora (onboarding, páginas públicas) vale a logo oficial `A.logo`. Mascote: nenhum no fornecedor (direção de arte).

## 1. Rail e topo do portal (todas as telas `#/f/:vid/*`)
1. Identidade: sim. O nome em Fraunces com monograma em anel na cor do fornecedor; antes era a logo Albora.
2. Logo oficial: sim, no lugar certo: só o símbolo no rodapé do rail, "feito com Albora".
3. Mascote/avatar: monograma do fornecedor (avatar do negócio), sem mascote.
4. Âmbar: sim. O ponto do item ativo, o contador e o anel usam `--ac` do fornecedor, não a cor do casal.
5. Personalidade: sim: cada portal tem cara própria (terracota claro, azul escuro).
6. Informação: sim. O seletor "Plano Studio, Administrador" substituiu o cartão que repetia o nome.
7. Hierarquia: sim. Marca, plano, navegação, rodapé.
8. Desnecessário: parcial. O endereço no topo é útil só no desktop; some no celular, onde entra o nome.
9. Ação principal: não aplicável (navegação).
10. Produto: sim.

## 2. Eventos (`#/f/:vid/eventos`)
1. Sim, com a cor do fornecedor em filete e ponto "ao vivo". 2. Não aplicável. 3. Não. 4. Sim. 5. Parcial: densa e correta, sem ornamento. 6. Sim: antes uma lista de cartões com selo, data e contagem; agora uma tabela em filete com cinco colunas. 7. Sim: nome em peso, resto em texto pequeno e numerais tabulares. 8. Parcial: a coluna Cliente repete o filtro por cliente, mas permite ordenar. 9. Sim: "Criar evento para um cliente" é o único primário. 10. Sim. Ordenável pelos títulos das colunas (`aria-sort`); no celular some tudo menos nome e situação, e entra um seletor "Ordenar". Cota de eventos ativos no arco da marca.

## 3. Clientes e equipe (`#/f/:vid/equipe`, `?aba=clientes`)
1. Parcial: lista em filete com monograma. 2. Não aplicável. 3. Monograma de pessoa (iniciais). 4. Sim, aba ativa em `--ac`. 5. Não: tela utilitária. 6. Sim. 7. Sim. 8. Parcial: a linha de convite por e-mail ocupa espaço mesmo sem uso; fica por ser a ação da tela. 9. Sim: "Enviar convite" / "Adicionar cliente". 10. Parcial: faltam busca e ordenação; o limite do plano aparece com link.

## 4. Insights (`#/f/:vid/insights`)
1. Sim. 2. Não. 3. Não. 4. Sim. 5. Sim, agora: o número herói (participação média) em Fraunces gigante com o arco da marca. 6. Sim: antes três cartões de métricas iguais, agora uma frase e um número. 7. Sim. 8. Não. 9. Parcial: "Exportar planilha" é secundário (simulado). 10. Sim. A tabela abaixo tem barras de 2 px em `--ac`.

## 5. Cobrança (`#/f/:vid/cobranca`)
1. Sim. 2. Não aplicável. 3. Não. 4. Sim: coluna do plano mais escolhido com filete `--ac`. 5. Sim: o plano atual declarado em título ("Plano Studio") e os planos como comparação tipográfica; antes eram três cartões iguais. 6. Sim: sete linhas de comparação. 7. Sim. 8. Parcial: a coluna Agency e a Starter só importam para troca; ficam. 9. Parcial: cada coluna tem um botão (Mudar para / Assinar); apenas o plano atual vira texto. 10. Sim. Funciona a 375 px (colunas estreitas, rótulos curtos, botões que quebram linha).

## 6. Checkout simulado (`#/f/:vid/checkout`)
1. Parcial. 2. Não aplicável. 3. Não. 4. Sim. 5. Não: tela transacional. 6. Sim. 7. Sim. 8. Não. 9. Sim: um primário por etapa. 10. Sim. Defeito achado e corrigido: o QR do PIX ficava invisível no tema escuro.

## 7. Marca (`#/f/:vid/marca`) e etapa 2 do onboarding
1. Sim. 2. Parcial: o selo mostra o símbolo oficial; a logo do fornecedor é a enviada por ele. 3. Monograma como fallback de logo. 4. Sim: a prévia usa a cor e a fonte escolhidas, o resto do painel não muda. 5. Sim. 6. Parcial: o formulário é longo (nome, cor, fundo, estilo, logo, selo). 7. Sim. 8. Não. 9. Sim: "Salvar marca". 10. Sim. Agora há duas prévias ao vivo (portal público e painel da equipe), com checagem de contraste que bloqueia cor ilegível.

## 8. Onboarding (`#/f/novo`, rascunho, "portal criado")
1. Sim. 2. Sim: logo oficial `A.logo` no topo (é a Albora recebendo o fornecedor). 3. Monograma grande do fornecedor ao concluir. 4. Sim. 5. Parcial. 6. Sim. 7. Sim: antes círculos numerados, agora o arco da marca marca o progresso por etapa. 8. Não. 9. Sim: um primário por etapa. 10. Sim.

## 9. Ajustes do portal (`#/f/:vid/ajustes`)
1. Parcial. 2. Não. 3. Não. 4. Sim. 5. Não: formulário utilitário. 6. Parcial: dados, pacotes e zona de perigo numa rolagem. 7. Sim. 8. Não. 9. Sim: "Salvar alterações". 10. Parcial: falta ancoragem entre as seções.

## 10. Vitrine pública (`#/f/v/:slug`)
1. Sim: identidade do fornecedor (título gigante, monograma, cor, fonte por estilo). 2. Sim: "feito com Albora" com `A.mark` no rodapé, discreto. 3. Não. 4. Sim: `--ac` dele; o botão fica na cor do fornecedor (já checada em contraste). 5. Sim: editorial, par de imagens deslocadas e pacotes como lista tipográfica; antes título + três cartões. 6. Sim. 7. Sim. 8. Não. 9. Sim: "Falar com a gente". 10. Sim. As imagens são ilustrações do protótipo.

## 11. Páginas públicas (`#/p/fornecedores`, `#/p/privacidade`, `#/p/15-anos`)
1. Sim: logo oficial no topo. 2. Sim. 3. Não. 4. Sim. 5. Parcial: sóbrias por desenho. 6. Sim: o rótulo acima do título (kicker) saiu das três; privacidade ganhou data em texto simples. 7. Sim. 8. Parcial: a lista de planos no marketing é a mesma tabela da cobrança; é o que se quer. 9. Sim: "Criar meu portal". 10. Sim.

## Ainda fraco
- Equipe e Ajustes seguem utilitários, sem trabalho tipográfico próprio.
- A prévia do painel é um recorte (rail), não a tela inteira.
- A cor do fornecedor sobre noite só é validada em 3:1; textos pequenos em `--accent-text` dependem da mistura com `--fg`.

## 3ª passada: sistema, mobile-first, white-label e emoção

Lint (`node tools/lint.mjs vendor.js`): 47 ocorrências (30 espaço, 17 fonte) → **0**. Auditoria renderizada nas 17 rotas do módulo (portal, onboarding, vitrine, páginas públicas) em 320, 375, 768, 1280 e 1920: sem `overflowX`, `tinyTargets` 0 (só o input de arquivo `sr-only`, de propósito), `contrast` vazio, `textMin` 12. Único `smallTargets` restante: o `<input type=search>` de 24 px de altura dentro do `label.search` de 44 px, componente do núcleo (a área clicável inteira é o rótulo). Estados carregando, vazio e erro nas rotas centrais, sem overflow nem alvo pequeno.

Antes → depois
- **Tabela de Eventos, estratégia mobile explícita**: abaixo de 760 px é uma lista em filete (nome em peso, "tipo · cliente · data" abaixo, situação à direita; o cabeçalho some e o seletor "Ordenar" faz o papel dos títulos). De 760 px para cima volta a ser tabela com `aria-sort`. O CSS é mobile-first (a tabela é o acréscimo). O link do nome (`vd-nm`) tinha 19 px e agora 44; os botões de ordenar do cabeçalho (39 x 44) têm mínimo de 44 de largura; "ações" de cliente deixou `btn-sm`.
- **Comparação de planos**: uma tabela de quatro colunas a 320 px não cabe com leitura. Abaixo de 760 px cada plano é um bloco (nome, preço, linhas rótulo/valor, botão); de 760 px para cima segue a tabela. Mesmos botões e rádios nas duas formas, só uma aparece.
- **Alvos ≥44**: itens do menu lateral (42 → 44), "feito com Albora" no portal e na vitrine, links do rodapé (viraram `nav` com gap), logo Albora das páginas públicas, índice da privacidade, abas.
- **Espaço e tipo**: todo valor sai de `--space-N`, `--gutter`, `--section` ou `--fs-*`; títulos grandes da vitrine e do número herói derivam de `--fs-display` e `--fs-hero`. Estilos soltos (`style="gap:12px"` etc.) viraram classes `vd-*`. Opacidade em texto removida (contagem das abas de situação).
- **Tabbar do celular**: o núcleo escreve os rótulos em 11 px; o portal sobrepõe para `--fs-xs` (12). Pedido ao núcleo abaixo.
- **Vitrine**: título e cidade agrupados (sem margem negativa), o texto entra com leve subida em 320 ms e as fotos aparecem com fade em 200/320 ms, tudo desligado com `prefers-reduced-motion`.

### White-label: `--ac` pelo motor central
O portal (`shell`), a vitrine, as prévias da Marca, o onboarding e o "portal criado" usam `A.theme.scope(corDoFornecedor, chão)`; o chão é o tema do anfitrião no portal e o "claro/escuro" escolhido pelo fornecedor na vitrine e nas prévias. O rótulo dos botões é `var(--on-ac)` (nada de `--papel` fixo) e o foco usa `--accent-text`. O verificador da página Marca deixou de bloquear: o motor ajusta qualquer cor até ficar legível, e a mensagem diz o ajuste ("No portal usamos uma versão um pouco mais escura...").

Teste com 5 cores de fornecedor (medido no navegador; botão = rótulo sobre o preenchimento, texto/link = `--accent-text` sobre o fundo, foco = mesmo token). Portal claro, portal escuro e vitrine clara/escura deram o mesmo resultado nas colunas relevantes:

| Cor | Portal claro: botão / texto-link / traço | Portal escuro e vitrine escura: botão / texto-link / traço |
|---|---|---|
| âmbar #D46632 | 4,98 / 4,56 / 3,53 | 4,98 / 5,41 / 5,41 |
| azul-petróleo #245B73 | 7,20 / 7,20 / 7,20 | 5,92 / 4,68 / 3,23 |
| vinho #6B1F34 | 10,85 / 10,85 / 10,85 | 6,34 / 4,69 / 3,01 |
| amarelo claro #F2D64B | 5,78 / 4,65 / 3,05 (o motor escurece para #A39137) | 12,57 / 13,64 / 13,64 |
| magenta #E0116F | 4,53 / 4,53 / 4,53 | 4,53 / 4,66 / 4,21 |

Todos cumprem botão ≥4,5, texto/link e foco ≥4,5 e traço (anel do monograma, ponto de situação, filete) ≥3. Custo honesto: o amarelo claro vira um ocre apagado no fundo claro, porque o motor prioriza legibilidade; para manter o amarelo vivo o fornecedor teria de escolher fundo escuro.

### Critério emocional (vitrine do fornecedor e portal)
1. Acolhimento: sim. A vitrine abre com o nome do negócio em Fraunces grande, cidade e uma frase dele; "Falar com a gente" é um convite, não um formulário.
2. Adequada a um casamento elegante: sim. Ar, papel e um par de imagens deslocadas; sem cartões nem ornamento.
3. Pessoas e memórias protagonistas: parcial. As imagens são ilustrações do protótipo (aviso já presente); com fotos reais do fornecedor ganharia.
4. Moderna sem ser fria: sim. A entrada suave e o monograma em anel na cor dele dão calor.
5. Várias gerações: sim. Corpo em 16 px, alvos de 44 px, linguagem sem jargão.
6. Personalidade ou template: sim na vitrine; parcial em Equipe e Ajustes, que seguem utilitários (pendência anterior mantida).
7. Detalhes reforçam a identidade: sim. "Feito com Albora" com o símbolo oficial discreto; o resto é do fornecedor.
8. Animações com significado: sim. Só a entrada da vitrine (texto sobe, fotos aparecem); nada decorativo.
9. Conteúdo com o destaque merecido: sim. O número herói da participação e o nome do portal.
10. Revisitar: parcial. O portal é ferramenta; o que se revisita são os números e o álbum final, que não são deste módulo.

### Pendências desta passada
- Pedidos ao núcleo: rótulos da `.tabbar` em `--fs-xs`; `.nav a` com `min-height:44px`; `.search input` com alvo de 44; escopo `[data-theme="papel"]` para superfícies claras dentro do tema noite (a polaroide do telão redefine `--fg-*` localmente por isso).
- A Marca não bloqueia mais cor ilegível (o motor corrige); a mensagem informa o ajuste.


## Atualização — 25/10/2026

Busca e ordenação de pessoas implementadas. Ajustes com navegação por seção e rascunho na aba. Corrigido contraste do hover no tema escuro.

Evidências atuais: [relatório da continuação](../10-continuacao-prototipo.md), [JSON de validação](evidencias/validacao-continuacao.json). Os resultados anteriores são históricos.
