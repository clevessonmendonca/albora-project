# Plano: painel do anfitrião (mobile first)

Rascunho para decisão. Nada deste plano foi implementado.

## 1. Diagnóstico do que existe hoje

- **Duas linguagens.** O shell estilo Arc (canvas quente, sidebar solta, ilha arredondada) só existe a partir de 901 px. No celular o painel é outro: barra inferior flutuante e conteúdo em cartões. Quem usa os dois vê dois produtos.
- **Menu lateral colorido.** O canvas é um tom âmbar misturado ao cinza. No claro parece "creme"; no escuro vira marrom sujo e a sidebar perde contraste com a ilha. A cor do menu compete com as cores que importam (acento do evento, status, alertas).
- **A ilha arredondada gasta espaço** em telas de 1024–1280 px e adiciona uma borda a mais sem função.
- **Navegação rasa.** Tudo é "uma página por seção"; não há detalhe lateral (foto, convidado), então abrir algo troca de tela e perde o contexto.
- **Moderação é o gargalo da festa** (fila de revisão ao vivo) e hoje é uma lista de botões "Aprovar/Ocultar", pensada para mouse.
- **Não verificado:** toque real, teclado virtual, leitor de tela, Safari.

## 2. Princípios

1. **Mobile primeiro.** Cada tela nasce em 375 px com polegar: ação principal ao alcance, alvos ≥ 44 px, nada que dependa de hover. Desktop é o mesmo layout com mais colunas, não outro design.
2. **Um shell, três tamanhos.** Mesmos itens, mesma ordem, mesmos nomes em todos.
3. **Neutro por padrão, cor com significado.** Superfícies neutras (claro e escuro); cor só para acento do evento, estado e alerta.
4. **Contexto preservado.** Detalhe abre em painel/sheet, não troca de página.
5. **O que acontece ao vivo vem primeiro.** Durante a festa, a tela inicial é a fila e o telão.

## 3. Decisão pendente: o menu lateral

| Opção | Descrição | Prós | Contras |
|---|---|---|---|
| **A. Neutra e plana (recomendada)** | Sidebar na mesma superfície do conteúdo, separada por linha fina. Sem canvas colorido e sem ilha. Item ativo em pílula com o acento do evento. | Funciona igual no claro e no escuro; mais espaço; menos ruído | Menos "marca" que o Arc |
| B. Rail de ícones | 72 px com ícones, expande ao passar o mouse ou por botão | Máximo de espaço para fotos | Menos descobrível; rótulos escondidos |
| C. Manter canvas, mas neutro | Canvas cinza neutro (sem âmbar), sidebar solta | Mantém a sensação de "app" | Ainda tem dois planos de fundo; no escuro o contraste é fraco |

Regras comuns: no escuro usar neutros reais (sem tinta âmbar), com 3 degraus de elevação (fundo, superfície, superfície elevada) e borda de 1 px; o tema herdado do evento aparece só no item ativo, em chips e no cartaz.

## 4. Estrutura por tamanho

| Largura | Navegação | Conteúdo |
|---|---|---|
| < 640 px | Barra inferior com 4 itens (Hoje, Fotos, Convidados, Mais). "Mais" abre sheet com Estilo, Compartilhar, Ajustes, Comunidade, Inspiração, Plano | 1 coluna; ação principal fixa embaixo da tela; cabeçalho compacto com evento e estado |
| 640–900 px | Rail de ícones de 72 px | 2 colunas onde couber; detalhe em sheet lateral |
| ≥ 900 px | Sidebar de 256 px (opção A) | 2–3 colunas, painel de detalhe à direita (inspetor) |

Itens e nomes são idênticos nos três tamanhos.

## 5. Plano por tela

**Hoje**
- Antes: contagem regressiva + checklist "No caminho até a festa" como lista de tarefas com progresso; cartaz do convite menor, no topo.
- Durante: foto ao vivo, três números e fila de revisão primeiro; controles (telão, pausa, regras) em sheet no celular e em coluna à direita no desktop.
- Depois: passos numerados (entregar, álbum, livro, agradecer) com um passo ativo por vez no celular.

**Fotos (a maior mudança)**
- Masonry de 2 colunas no celular, 4+ no desktop; filtros em chips roláveis; busca fixa.
- **Revisão em modo cartão:** uma foto por vez, deslizar para aprovar ou ocultar, toque para ver o motivo; mesmos atalhos no teclado (A, O, setas) no desktop.
- Seleção múltipla com barra de ações fixa embaixo.
- Detalhe da foto em sheet (celular) ou inspetor (desktop), com autor, horário, motivo da fila e histórico.

**Convidados**
- Lista com busca fixa; filtros em chips; linha com avatar, nome, estado e fotos.
- Ficha do convidado em sheet/inspetor (fotos, reações, missões, bloquear).

**Estilo e Compartilhar**
- Prévia fixa no topo no celular e à direita no desktop; escolhas abaixo, uma seção por vez.
- Compartilhar: QR e link como cartão principal; telão e convite em seções abaixo.

**Ajustes e Plano**
- Lista de seções no celular (padrão "Ajustes do iOS": lista que abre página); duas colunas no desktop.

## 6. Fundamentos antes das telas (onda 0)

1. **Tokens:** neutros claro e escuro revisados; remover o tint âmbar do canvas; elevação em 3 níveis; escala de espaçamento e raios únicos.
2. **Shell responsivo único** (sidebar, rail e barra inferior a partir do mesmo markup de itens).
3. **Componentes compartilhados:** Sheet/Inspetor, Controle segmentado, Linha de lista, Cartão de número, Chips roláveis, Barra de ações fixa.
4. **Auditoria automática** (`tools/audit.js`) rodando por tamanho (375, 768, 1280) e tema (claro, escuro).

## 7. Ordem de entrega

| Onda | Entrega | Pronto quando |
|---|---|---|
| 0 | Fundamentos e shell neutro (decisão da seção 3) | 375/768/1280 e claro/escuro sem regressão na auditoria |
| 1 | Hoje nos três estados | Uma ação primária visível sem rolar no celular |
| 2 | Fotos + revisão por cartão + detalhe | Aprovar 10 fotos em menos de 30 s no celular |
| 3 | Convidados + ficha | Achar e bloquear um convidado em 3 toques |
| 4 | Estilo + Compartilhar | Prévia sempre visível ao escolher |
| 5 | Ajustes e Plano | Mesmo padrão de lista → página |
| 6 | QA: claro/escuro, teclado, leitor de tela, Safari, dispositivo real | Lista "não verificado" zerada ou registrada |

## 8. Riscos

- **Gesto de deslizar** conflita com rolagem horizontal e o gesto "voltar" do iOS: exige zona de segurança nas bordas e botões equivalentes sempre visíveis (acessibilidade).
- **Mexer em tokens** afeta guest, fornecedor e console: a onda 0 precisa de captura de tela antes e depois.
- **Protótipo sem build:** mudanças grandes em CSS injetado por JS têm ordem frágil (já causou bugs); manter blocos novos no fim de cada módulo.
- **Regras do produto não mudam:** guest sem login, isolamento por evento e hex só em token continuam valendo.

## 9. Perguntas em aberto

1. Menu lateral: **A, B ou C** (seção 3)?
2. Revisão de fotos por **deslizar** entra no escopo ou fica só nos botões?
3. Barra inferior no celular: **4 itens + Mais** (proposta) ou manter 5?
4. Começar pela **onda 0** (recomendado) ou pela tela de Fotos?
