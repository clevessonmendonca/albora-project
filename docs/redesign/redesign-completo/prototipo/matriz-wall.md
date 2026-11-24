# Matriz de cobertura: Telão (módulo `wall.js`, prefixo `#/t`)

Fontes: `../inventario/B-convidado-telao-app.md` §§ 7 e 8 (telão e conexão) e `../inventario/A-painel-anfitriao.md` telas 25 a 27 e `TEL-01` a `TEL-03`. A coluna "Implementação" usa Funcional, Simulado ou Depende de integração.

Contrato com o painel (outros módulos), tudo em `A.store`: `telaoModelo` (id do modelo, lista de ids ou `rodizio`), `telaoPausado`, `panico`, `telaoFotosNovas` (fotos que chegam depois). Funções expostas: `A.wall.gerarLink(evento)`, `A.wall.codigoPainel(evento)`, `A.wall.autorizar(codigo, evento)`, `A.wall.pareado()`, `A.wall.desligar()`.

| ID / funcionalidade | Tela atual (rota) | Nova tela (rota do protótipo) | Implementação | Nota de decisão |
|---|---|---|---|---|
| A tela 25 / `TEL-01` Telão em tela cheia, fora do shell | `/wall-display` | `#/t/display` | Funcional | Tela própria (`.wall`), fundo noite fixo, sem rail. |
| B7 Estado `pareando` (código e QR na TV) | `/wall-display` mostra `WallPairingScreen` | `#/t/parear` | Funcional (autorização simulada) | Código de 6 caracteres (alfabeto sem 0, 1, I, O), validade de 10 min com contagem e renovação sozinha. QR da TV removido da tela. Passos reduzidos a uma frase (onde ir e o que digitar); abertura com a marca animada oficial (`splash-animado.svg`) e código gigante em Fraunces. |
| B8 Pareamento: método "código na TV" | `/wall-pair` (celular) + TV | `#/t/parear` + `A.wall.autorizar` | Simulado | O painel (outro módulo) chama `A.wall.autorizar(codigo)`; a TV detecta e liga sozinha. Botão rotulado "Simular: autorizar pelo painel". |
| B8 Método "digitar código do painel" | sem equivalente na TV | `#/t/parear` (Outras formas de ligar) | Simulado | Códigos de demonstração `FESTA2` (plano Completo) e `FESTA3` (evento no plano Grátis). `A.wall.codigoPainel()` gera um código para o painel exibir. |
| B8 Método "link de uso único" (`WallLinkSender`, TEL-03 origem) | `/admin/e/{id}/...` | `A.wall.gerarLink()` + `#/t/link/:token` | Funcional (o botão de gerar é do módulo do painel) | Gerar um link novo invalida o anterior; validade 20 min; uso único. Segredo no fragmento `#` não se aplica ao roteador por hash, registrado como limitação. |
| A tela 27 / `TEL-03` Conectando por link | `/wall-link` estado `abrindo` | `#/t/link/:token` | Funcional | Spinner com `role=status`, depois liga e vai para o telão. `amostra` é um token que sempre vale (demonstração). |
| B8 `/wall-link` estado `invalido` (410/422) | "Este link não vale mais" | `#/t/link/expirado` (ou token usado/substituído) | Funcional | Diz o motivo (já usado, passou de 20 min, substituído por link novo) e como gerar outro (3 passos) com atalho para o painel e para o código. Correção do problema 6: o erro de rede mostra "Tentar de novo" sem queimar o link. |
| B8 `/wall-link` estado `erro` (rede) | "Verifique a internet..." sem botão | `#/t/link/:token` com estado Erro do protótipo | Funcional | Botão "Tentar de novo". O link continua válido. |
| A tela 26 / `TEL-02` `/wall-pair` (celular, "Ligar o telão") | `/wall-pair` | Dissolvida em `#/t/parear` + painel | Movido | O campo de código no celular vira "Compartilhar › Telão" do painel (módulo do painel) chamando `A.wall.autorizar`. Mensagens: formato, inválido/expirado e plano (403 explicado: "O telão entra no plano Completo"; antes caía em erro genérico). |
| B8 estados `/wall-pair`: `connected`, `no-session`, `rejected`, `error` | `/wall-pair` | `#/t/parear` (Telão ligado) e mensagens inline | Funcional / Simulado | `no-session` não existe aqui porque o pareamento passou para o painel (que já exige login). |
| B8 problema 10: nada mostra quais telões estão ligados nem como desligar | sem tela | `#/t/parear` ("Este telão já está ligado") e controle "Desligar este telão" | Funcional | Desligar tem `A.confirm` com a consequência. Lista de vários telões fica no painel. |
| B7 `exibindo`: cena de fotos | `/wall-display` | `#/t/display` | Funcional | Fotos de `A.data.photos` aprovadas com `telao:true`, mais `telaoFotosNovas` e chegadas simuladas durante a festa. |
| B7 Modelo `polaroide` | idem | `#/t/display` | Funcional | Moldura clara, `contain`, leve balanço. |
| B7 Modelo `mural` | idem | `#/t/display` | Funcional | Mosaico de 6 que se completa em sequência. Fundo desfocado da própria foto nas faixas laterais. |
| B7 Modelo `colagem` (célula vazia, problema 3) | idem | `#/t/display` | Funcional | 5 fotos sobrepostas sem célula vazia; posições por quantidade de fotos disponíveis. |
| B7 Modelo `dump` | idem | `#/t/display` | Funcional | Grade 3 x 3 com entrada rápida. |
| B7 Outros 7 modelos (`tbt`, `grade`, `destaque`, `mosaico`, `ambiente`, `carrossel`, `cheio`) | idem | Não incluídos | Não implementado | O protótipo cobre os 4 modelos padrão do rodízio, como pedido. `cheio` é o único que corta e ficaria de fora de qualquer forma. |
| B7 Regra "nunca cortar foto em pé" | idem | `#/t/display` | Funcional | Foto sempre em `contain` ou em caixa com a proporção da própria foto; letterbox preenchido por desfoque da própria imagem. |
| B7 Rotação 8 s e escolha da próxima foto | `ROTACAO_MS` fixo | `#/t/display` | Funcional | Prioriza foto nova e menos exibida. Sem controle de tempo por foto (continua inexistente no produto). |
| B7 Troca de modelo vinda do painel (problema 9: só aparecia com outro item novo) | admin `telaoModelos` | `A.store.telaoModelo` lido a cada segundo | Funcional | A troca aparece em até 1 s, também entre abas. |
| B7 `telaoModelo` = rodízio | `modelosDoRodizio` | `telaoModelo: 'rodizio'` ou lista | Funcional | Sem o "volta para os 11 modelos" silencioso: modelo inválido cai em polaroide. |
| B7 Transição (um único fade) | `wall-entrar` | `#/t/display` | Funcional | Crossfade de 0,9 s entre cenas; `prefers-reduced-motion` desliga balanço, pop e fade. |
| B7 Estado "Conectando…" (problema 2) | `exibindo` com `carregou=false` | `#/t/display` (estado Carregando do protótipo) | Funcional | Spinner e texto. |
| B7 Sem estado de erro/offline (problema 2) | inexistente | `#/t/display` (estado Erro do protótipo) | Funcional | "Sem conexão com o evento. Tentando de novo." com botão. |
| B7 Estado "Aguardando fotos" | `exibindo` sem item | `#/t/display` (Vazio do protótipo ou sem fotos) | Funcional | Mostra QR de exemplo e instrução. O QR é de exemplo e não escaneia. |
| B7 Estado pânico ("Telão pausado") (problemas 1 e 13) | botão de pânico sempre visível; toggle cego | `#/t/display` com `panico:true` | Funcional | O pânico só liga e desliga no painel e grava estado explícito. A tela neutra mostra o arco da marca (sol baixo, respirando), o nome do evento e "Já voltamos". Sem botão de pânico na TV. |
| B7 Pausar/retomar na TV (Espaço ou P, problema 11) | botão fixo a 85% | Barra de controles e teclado | Funcional | Pausa mostra tela "Telão em pausa". Atalho ignora o foco em botão ou campo. |
| B7 Relógio, contador "N fotos, M pessoas" (problema 8) | overlays pequenos a 70% | `#/t/display` | Funcional | Tipografia maior (`clamp` em vmin), contraste cheio, sombra de leitura. |
| B7 Crédito do autor (primeiro nome) | só alguns modelos | `polaroide` | Funcional | Rodapé "nome + há N min". Grades não mostram crédito. |
| B7 Vídeo `muted loop` | idem | Não incluído | Não implementado | Fotos do protótipo são ilustrações; sem vídeo. |
| B7 Controle discreto, Esc e clique para sair da tela cheia | só pausa | Barra de controles e atalhos (`?`) | Funcional | Barra aparece com mouse, clique ou Tab. Botões: Pausar, Próxima foto, Tela cheia, Atalhos, Voltar ao painel, Desligar. API de tela cheia pode ser bloqueada pelo navegador (aviso). |
| B7 Dicas de ensaio antes da festa | inexistente | Chip "Ensaio: fotos de exemplo" | Funcional | Aparece só na fase Antes. |
| B7 Dados: SSE, polling, URL assinada de 15 min (achados 14 e 6) | `use-wall-stream` | Não aplicável | Depende de integração | Protótipo lê `A.data` e `A.store`. |
| B7 Crachá de pareamento por cookie de 12 h | `albora_parede` | `A.store.telaoPareado` | Simulado | Sem expiração de 12 h. |
| A tela 25: link "Abrir telão" no painel | menu do painel | Link para `#/t/display` (módulo do painel) | Funcional | Entrada pelo painel. |
| A 3.22 problema: três caminhos sem ajuda única | `/wall-pair`, `/wall-link`, `/wall-display` | `#/t/parear` reúne código, código do painel e link | Funcional | Uma só tela da TV explica os três métodos. |

## Revisão de arte (2ª passada)

- Marca: o disco "a" foi trocado pela marca animada oficial (`splash-animado.svg` no pareamento e na conexão por link; `A.star` em "Telão ligado" e "Aguardando as primeiras fotos"). Nenhum mascote.
- "Já voltamos" e "Telão em pausa" usam `A.arc` (sol baixo e sol no topo), sem ícone genérico. Pausa e pânico seguem funcionais e distintos.
- Pareamento: três passos viraram uma frase; "Outras formas de ligar" continua com link de uso único e código do painel. Texto de protótipo saiu da caixa tracejada e virou nota discreta.
- Cromo do telão (`wl-new`) usa `--ac`, não `--ev`. Contador e relógio usam a cor `--fg-2` sobre pastilha escura, sem opacidade (3ª passada).
- Correção: o QR do estado "Aguardando" estava invisível (cor herdada do tema noite); agora tinta sobre papel.

## Lacunas e limitações

- Sete dos onze modelos de telão não foram feitos (só polaroide, mural, colagem e dump).
- Sem vídeo, sem reações no telão, sem controle de tempo por foto (também inexistente no produto).
- O pareamento real exige dois aparelhos; aqui a autorização é simulada (botão rotulado) ou vem do módulo do painel via `A.wall.autorizar`.
- O link usa o roteador por hash, então a regra "segredo no fragmento e limpar a URL" não se aplica.
- Tela cheia depende do navegador (pode ser negada em iframe).
- Fotos são ilustrações geradas (`A.photo`), não fotos reais.
- O módulo do painel precisa chamar `A.wall.gerarLink`, `A.wall.codigoPainel` e `A.wall.autorizar` para completar o ciclo; sem isso só a TV funciona sozinha.
