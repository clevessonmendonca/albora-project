# Auditoria — Plano e cobrança (`#/h/plano`, em `host-criar.js`)

Antes: listagem administrativa (plano de cada evento, tabela de preços, formas de pagamento e faturas, cada linha com botão pílula). Depois: jornada comercial por evento, com o Completo cobrado uma vez por evento (não é assinatura). Skill Impeccable usada: `layout.md` (uma coluna de leitura + aside, ordem mobile própria), `typeset.md` (Fraunces só em frase, numerais e preço), `distill.md` (tabela comparativa e cartões saíram), `craft-floor.md` (estados, foco, alvos), `critique.md` (hierarquia de ações).

## As 10 perguntas

| # | Pergunta | Evento gratuito | Evento pago |
|---|---|---|---|
| 1 | Identidade reconhecível | Sim: filete âmbar, Fraunces, tinta no botão | Sim: mesma assinatura, sem banner |
| 2 | Logo oficial | Sim (núcleo, na casca da conta) | Sim |
| 3 | Mascote/avatar | Parcial: só no estado vazio (`A.emptyState`); a tela não pede mascote | Idem |
| 4 | Âmbar correto | Sim: filete, numerais dos benefícios, filete do preço; nada sólido | Sim: filetes de uso e sublinhado dos links |
| 5 | Genérica ou personalidade | Sim: frase própria e "Seu evento hoje" com os números do evento | Parcial: o bloco de uso é mais utilitário que o gratuito |
| 6 | Quantidade de informação | Sim: preço e condição uma vez; benefícios em lista numerada | Parcial: cinco linhas de uso (decisão: mostra o que o plano entrega) |
| 7 | Hierarquia | Sim: frase, preço, botão; benefícios depois | Sim: situação do pagamento, uso, ação |
| 8 | Componente desnecessário | Não sobrou cartão nem tabela; chips viraram links | Idem |
| 9 | Ação principal evidente | Sim: "Ativar o Completo" (único botão cheio) | Sim: "Abrir o painel do evento" (pago) ou "Pagar agora"/"Tentar pagar de novo" |
| 10 | Nível de produto | Parcial: pagamento, desconto e fatura são simulados | Parcial: idem |

Hierarquia de ações: primária (uma por vista, botão cheio), secundária (link com filete: "Ver fatura deste evento"), terciária (link pequeno: "Gerenciar plano", ações das listas), destrutiva (texto vermelho só dentro do diálogo: "Confirmar mudança para o Grátis").

## Critério emocional (tela central: evento gratuito e diálogo de downgrade)

| # | Pergunta | Resposta |
|---|---|---|
| 1 | Acolhimento | Sim: "Para que nenhuma foto fique de fora." fala da festa, não do plano |
| 2 | Adequada a um casamento elegante | Sim: tipografia editorial, ar, sem banner promocional nem selo |
| 3 | Pessoas e memórias protagonistas | Parcial: o evento aparece em números (fotos, missões, telão); não há foto na tela, de propósito |
| 4 | Moderna sem ser fria | Sim: serifa quente e filete âmbar sobre papel |
| 5 | Várias gerações | Sim: corpo 16px+, frases curtas, alvos de 44px, sem jargão |
| 6 | Personalidade ou template | Parcial: o aside com preço em Fraunces é da casa; a lista numerada é mais convencional |
| 7 | Detalhes que reforçam Albora | Sim: filete âmbar, arco como metáfora (filete de uso), tom do texto |
| 8 | Animações com significado | Sim: só o preenchimento do filete e a entrada do diálogo; nada de celebração (o Completo ativo não usa `A.celebrate`, reservado aos 3 momentos do brief) |
| 9 | Conteúdo com o destaque merecido | Sim: o que o evento ganha vem antes do que muda; a oferta só aparece com campanha |
| 10 | Pessoas gostariam de revisitar | Parcial: é uma tela de decisão, não de visita; o evento pago mostra o valor entregue para justificar a volta |

## Decisões de growth (e o que ficou de fora de propósito)

- Sem escassez, contador regressivo, depoimento, "mais popular" ou benefício que não exista em `A.data.planos`.
- Retenção só com campanha válida (dado, não texto fixo). Sem campanha, o diálogo mostra apenas consequências e as três opções. Validação isolada em `servidorValidaOferta`: motivos `sem_campanha`, `inativa`, `plano_inelegivel`, `expirada`, `esgotada`, `campanha_invalida`, `ja_usada_neste_evento`, `ok`.
- A oferta não mostra quantos usos restam (seria escassez); mostra desconto, preço final, validade e que vale para um evento.
- O diálogo abre uma vez por tentativa (trava de reentrada); confirmar a mudança é um clique, sem segundo diálogo.
- Funil medido: `planos_visualizados` → `upgrade_clicado` → `checkout_iniciado` → `pagamento_concluido`; saída: `downgrade_tentado` → `oferta_exibida` → `oferta_aceita`/`oferta_recusada` → `downgrade_confirmado`; falhas em `erro_fluxo`. Propriedades sem PII e sem valores.
- `A.plan.nudge(contexto)` devolve '' para evento Completo, convidado, tarefa crítica e papel que não seja o dono: o upsell nunca interrompe quem não pode comprar.

## Sistema (3ª passada)

| Verificação | Resultado |
|---|---|
| `node tools/lint.mjs host-criar.js` | 0 (antes e depois) |
| `tools/audit.js` em 320, 375, 768, 1280, 1920 (evento gratuito e pago, tema claro e escuro) | sem `overflowX`, `tinyTargets` 0, `smallTargets` vazio, `contrast` vazio, `textMin` 12. Defeitos achados e corrigidos: links do filtro de faturas com 39px de largura e botões de remover cartão com 36px (agora 44) |
| Estados | Carregando, vazio e erro pela barra Protótipo (cabeçalho e seletor permanecem); erro de pagamento recuperável dentro do checkout; papel diferente do dono: aviso e controles desativados |
| Teclado | Diálogos usam `A.modal` (foco preso, Esc fecha, foco volta); menu "Gerenciar plano" é `A.menu`; seletor de evento é `select` nativo |
| Mobile | Ordem: frase, aside (hoje e preço com o botão), benefícios. Lista de outros eventos vira duas linhas; diálogo é folha inferior que rola |

## Pendências

- Nada na UI de outros módulos chama `A.plan.nudge` ainda (Pronto, painel e telão podem adotar; `host-evento.js` não foi tocado).
- Contagem de fotos dos eventos que não são o 1 é aproximada (ver matriz).
- Pagamento pendente/falho em evento já Completo: a política real (prazo, bloqueio) depende do backend; a tela só informa a situação.
