# Matriz — host-config (Estilo, Compartilhar, Ajustes, Comunidade, Inspiração, Ajuda)

Rotas do protótipo: `#/h/e/:id/estilo`, `#/h/e/:id/compartilhar`, `#/h/e/:id/ajustes[/:section]` (evento, privacidade, equipe, exportar, plano), `#/h/e/:id/comunidade[/:postId]`, `#/h/e/:id/inspiracao`, `#/h/ajuda`.
Legenda de implementação: **F** = Funcional (persiste em `A.store`, chaves `hc:*`) · **S** = Simulado e rotulado na tela · **I** = Depende de integração (simulado).

| ID / funcionalidade | Tela atual (rota) | Nova tela (rota do protótipo) | Impl. | Nota de decisão |
|---|---|---|---|---|
| IDE-01 nome, convidados esperados, fuso | `/identity` | `/ajustes/evento` (nome, esperados); fuso **removido** | F | Dados do evento saíram da identidade (P-08). Fuso não entrou: o protótipo tem um único fuso fictício. |
| IDE-02 4 presets (Amanhecer…Jardim) | `/identity` | `/estilo` > Identidade (5 estilos × 6 combos) | F | Unificado no vocabulário do assistente (resolve P-08). "Jardim" some (sage é anti-padrão). |
| IDE-03 cor da festa + contraste | `/identity` | `/estilo` > Paleta > "Cor personalizada" | F | Selos de contraste vindos do motor central (`A.theme.resolve` + `A.contrast`): botão do convidado, detalhes no escuro e cor no claro, todos ≥4,5:1 por construção. O botão "Escurecer até ficar legível" saiu: o motor ajusta o tom sozinho e a tela explica o ajuste (3ª passada). |
| IDE-04 foco da capa V/H 25/50/75 | `/identity` | — | — | Não implementado (ver lacunas). |
| IDE-05 jeito de escrever / clima da noite | `/identity` | `/estilo` (fonte vem do estilo) | F | "Jeito de escrever" virou parte do Estilo; "clima" removido: convidado é sempre escuro, telão sempre noite. |
| IDE-06 prévia "Ficou assim" | `/identity` | `/estilo` coluna direita fixa: Convidado, Telão e Álbum juntos | F | Prévia multi-superfície ao vivo no desktop (as três ao mesmo tempo, cores resolvidas por `A.theme.scope`). No celular a prévia sai da primeira tela: botão "Ver como fica" abre um sheet com abas Convidado, Telão e Álbum (3ª passada). |
| IDE-07 modelos de telão (checkbox, validação) | `/identity` | `/estilo` > Modelos de telão | F | Pelo menos 1 ligado (erro com instrução). Plano Grátis só Polaroide (explicado). |
| IDE-08 salvar identidade | `/identity` | `/estilo` | F | Salvar → autosave com toast; sem botão (regra "nunca os dois"). |
| IDE-09 imagem de capa (upload/remover) | `/identity` | — | — | Não implementado (ver lacunas); a prévia usa ilustração. |
| MIS-01 ligar/desligar, ordenar, modo livre | `/missions` | `/estilo` > Missões | F | Lista única com switch, subir/descer (teclado), numeração romana recalculada. Sem arrastar. |
| MIS-02 prévia "Na câmera" | `/missions` | `/estilo` prévia Convidado (1ª missão ligada) | F | |
| MIS-03 missões personalizadas (criar, editar, remover) | `/missions` | `/estilo` > Missões | F | Criar com validação; renomear em modal; remover com "Desfazer". Prazo e emoji removidos (simplificação). |
| MIS-04 "Salvar missões" | `/missions` | `/estilo` | F | Autosave; some "alterações pendentes sem aviso" (P-05). Reflete em `A.data.missions` (evento e1). |
| REC-01 texto do recado | `/guestbook` | `/estilo` > Recado | F | Contador 0/280, autosave. |
| REC-02 áudio (aceite, gravar, remover) | `/guestbook` | `/estilo` > Recado | S | Gravação simulada (12 s), aceite obrigatório, remover com "Desfazer". |
| REC-03 "aparece a partir de" | `/guestbook` | `/estilo` > Recado (select por momento) | F | Opções por momento da festa (+ "agora" e "só quando eu publicar"). |
| REC-04 criar / salvar e publicar | `/guestbook` | `/estilo` | F | Os dois botões viram um só estado ("rascunho / publicado / aparece em…") por causa do seletor. |
| REC-05 prévia "como o convidado vê" | `/guestbook` | — | — | Recado não aparece na prévia Convidado (ver lacunas); há linha de status. |
| (gate) CTL-04 interação social | `EventControls` em `/evento` | `/estilo` > Interação social | F | Padrão "depois de Cerimônia", escolhido pelo casal; 3 modos. Sem `datetime-local` solto: o gatilho é um momento. Notificação fica desligada. |
| (menores) CTL-03 "Há menores" | `EventControls` | `/estilo` > Controle de menores | F | Desligar pede confirmação com consequência; só dono/casal editam; link em Privacidade. "Modo endurecido" não entrou (fora do escopo pedido). |
| QR-01 headline editorial | `/qrcode` | removido | — | Texto editorial cortado (P-04). |
| QR-02 aviso de rascunho | `/qrcode` | — | — | Fluxo de publicação é de outro módulo. |
| QR-03 cartão do QR | `/qrcode` | `/compartilhar` herói: placa em escala com o QR | S | QR ilustrativo, **não escaneia**, avisado na tela. |
| QR-04 link + copiar + ver como convidado | `/qrcode` | `/compartilhar` > Convite | F | Aponta para `#/g/:slug`. |
| QR-05 capa do evento + data | `/qrcode` | removido | — | Era cartão duplicado; capa vive em Estilo. |
| QR-06 imprimir / PNG / PDF | `/qrcode` | `/compartilhar` > "Só o QR" (fundo branco/transparente) e baixar peça | S | Fundo branco ou transparente; downloads simulados com toast que diz o arquivo. |
| CTL-10 peças (placa, card mesa, card missão, ZIP) | `EventControls` em `/evento` | `/compartilhar` herói: seletor Placa/Card de mesa/Card de missão | S | Prévia em escala por peça. Guardrails: QR ≥ 30 mm e contraste ≥ 7:1 bloqueiam o download com motivo; "usar a cor da Placa em todo o kit". |
| CTL-11 links do evento (convidado, WhatsApp, telão) | `/evento` | `/compartilhar` (link no herói, Telão, Mensagem para o grupo) | F | WhatsApp: mensagem editável + copiar; abrir é **I** (toast). |
| CTL-02 telão (pausar/ativar) | `EventControls` | `/compartilhar` > Telão (status grande, desconectar) | F | Pausar virou "Desconectar telão" com confirmação. |
| TEL-01 `/wall-display` | `/wall-display` | botão "Abrir telão" → `#/t/display` | F | Tela da TV é de outro módulo. |
| TEL-02 `/wall-pair` (código) | `/wall-pair` | `/compartilhar` > Telão método 1; "Parear agora" → `#/t/parear` | F/S | Código com "gerar outro"; a digitação na TV é simulada por botão rotulado. |
| TEL-03 `/wall-link` (link de uso único) | `WallLinkSender` | `/compartilhar` > Telão método 2 | F | 20 min com contagem regressiva; gerar novo invalida o anterior (confirmação); estados ativo/usado/expirou/substituído; "avançar 20 min" é atalho de protótipo. Resolve P-telão (3 caminhos sem ajuda única). |
| (histórico) o que está ligado | — | `/compartilhar` > Telão | F | Lista de conexões/links + resumo de modelos, interação e menores. |
| AJU-01 hub de 8 cartões | `/evento` | `/ajustes` (índice em texto à esquerda, painel único, campos em linha) | F | Leitura de documento (2ª passada); mobile = lista → detalhe. |
| AJU-02 / CTL-* "controles do evento" | `/evento` | distribuídos: Estilo, Compartilhar, Ajustes | F | Publicar, Moderação, Música, Assinar: fora do escopo/outros módulos. |
| (evento) nome, data, hora, local, tipo | — (não existia) | `/ajustes/evento` | F | Novo: edita e reflete em `A.data.events`; aviso do que muda, confirmação ao trocar tipo. Data fica no store (a contagem do núcleo não lê). |
| CST-01/02 consentimento (versões, aceites) | `/consent` | `/ajustes/privacidade` | F | Linguagem de casal; publicar nova versão (datada) com opção de pedir novo aceite; histórico; só totais. |
| (retenção) | — | `/ajustes/privacidade` e `/ajustes/exportar` | F | Dias 330/365 calculados a partir da data; aviso por e-mail 30 dias antes (switch). |
| EQP-01 lista de membros | `/team` | `/ajustes/equipe` | F | Mostra "Você" pelo papel simulado. |
| EQP-02 convidar por e-mail | `/team` | `/ajustes/equipe` | S | Validação de e-mail e duplicado; e-mail não sai (rotulado). |
| (equipe) remover / trocar papel / reenviar | — (não existia) | `/ajustes/equipe` | F | Novo; remover pede confirmação; trocar papel com "Desfazer". |
| (equipe) vazio para cerimonialista | `/team` (tela em branco) | `/ajustes/equipe` | F | Estado explicado (P-09). |
| CTL-05 entrega das fotos | `EventControls` | `/ajustes/exportar` > Entrega ao convidado | S | Switch + quando enviar + "Enviar agora" simulado. |
| (exportar) arquivo / Drive / livro PDF | Home/Ajustes (Drive não verificado) | `/ajustes/exportar` | S / I | Drive: conectar, reautenticar, desconectar, exportar agora; tudo simulado. Livro e ZIP: simulados. |
| (apagar evento) | — (não existia) | `/ajustes/exportar` | F/S | Digitar "apagar" para confirmar; só dono; **nada é apagado** no protótipo (toast avisa). |
| (plano) | `/billing`, CTL-08 | `/ajustes/plano` | F | Só resumo e link para `#/h/plano` (outro módulo). |
| COM-01 texto "Entre anfitriões" | `/comunidade` | `/comunidade` | F | Banner explica privacidade (P-comunidade). |
| COM-02 chips de assunto | `/comunidade` | `/comunidade` | F | Filtro persistente + busca (novo). |
| COM-03 começar conversa | `/comunidade` | `/comunidade` (modal) | F | Validação; "Desfazer". |
| COM-04 lista, paginação | `/comunidade` | `/comunidade` | F | 6 conversas de exemplo marcadas "Exemplo fictício"; "Ver conversas mais antigas". Vazio, carregando e erro. |
| COM-05 thread, responder, apagar | `/comunidade/[postId]` | `/comunidade/:postId` | F | Apagar com confirmação; conversa inexistente/oculta tem estado. |
| (comunidade) denunciar / bloquear / ocultar | — (não existia) | `/comunidade/:postId` menu "⋯" | S | Denúncia oculta a mensagem para você; bloquear autor com confirmação e "Desfazer". Moderação real é do console. |
| INS-01 chips de tema | `/inspiracao` | `/inspiracao` | F | |
| INS-02 cartões + Salvar | `/inspiracao` | `/inspiracao` | F | Agora existe a visão "Salvas (n)" (era problema do inventário). |
| INS-03 vazio | `/inspiracao` | `/inspiracao` | F | Vazio por tema e vazio de salvas. |
| (inspiração) "usar no evento" | — (não existia) | `/inspiracao` | F | Aplica missão, modelo de telão, estilo, recado, mensagem ou gate, com "Desfazer"; liga Inspiração a Estilo. |
| Glossário (7 termos) | menu da conta > Ajuda (sheet) | `/h/ajuda` seção Glossário | F | 12 termos, com busca, em duas colunas; Ajuda deixou de ter abas (2ª passada): é uma página de leitura com índice por âncoras e o mascote na abertura. |
| Menu da conta | `MenuDaConta` | `A.acts['account-menu']` (núcleo) → rotas de Ajustes e Ajuda | F | Os destinos do menu existem; o menu em si é do núcleo. Tema e sair: núcleo. |
| (FAQ) | — | `/h/ajuda` seção Perguntas frequentes | F | Nova. |
| CTL-07 "Preciso de ajuda" (ticket) | `EventControls` | `/h/ajuda` seção Falar com o suporte | S | Cria "HC-nnnn", lista os pedidos; urgência em linguagem de festa (sem P0/P1/P2). |
| Tour de primeiro acesso | tour 6 passos | `/h/ajuda` seção Tour; cartão não modal que navega e destaca o menu | F | 7 passos; Esc/Sair; marca "feito". |
| Command palette | não existia no painel | núcleo + `A.map` e 2 ações | F | Registrei telas e ações ("Fazer o tour"). |

## Lacunas e limitações

- **Capa do evento**: upload/remover imagem (IDE-09) e enquadramento V/H (IDE-04) não foram implementados; a prévia usa ilustração.
- **Recado na prévia Convidado**: o texto do recado não aparece na prévia; só a linha de status.
- **Arrastar para reordenar missões** não existe; só botões subir/descer (acessíveis por teclado).
- **Fuso horário** e **"modo endurecido"** não entraram. **Publicar**, **Moderação**, **Música do casal** e **Assinar** pertencem a outros módulos.
- **Data do evento**: editável e persistida, mas a contagem regressiva do núcleo (`A.when`) não a lê; nome, hora, local, tipo e esperados refletem em `A.data.events`.
- Missões por evento: só o evento `e1` espelha em `A.data.missions` (global); `e2`/`e3` ficam só no store do módulo. Equipe é global (não por evento).
- A TV (`#/t/display`, `#/t/parear`) é de outro módulo: o status "conectado" daqui é simulado por botões rotulados e não sincroniza com aquela tela.
- Sem validação visual do QR (não escaneia). Todas as exportações, downloads, Drive, e-mail e WhatsApp são simulados e dizem isso na tela.
- Estados: "carregando" e "erro" funcionam em todas as telas; "vazio" só muda Comunidade e Inspiração (editores ignoram).
- 2ª e 3ª passadas: o cromo usa `--ac`; `--ev` não aparece mais no módulo (prévias usam `A.theme.scope`; o QR "Cor do evento" lê `ev.cor` e é checado por `A.contrast`). Detalhes em `auditoria-host-config.md`.
- Na Ajuda não há mais abas, então a escolha de aba não persiste; o índice rola até a seção.
- No celular, o editor vem primeiro e a prévia fica no sheet "Ver como fica" (abas Convidado, Telão, Álbum); o sheet mostra o estado do momento em que abriu e atualiza se o modelo do telão mudar nele.
- Verificação feita por script de interação no navegador (sem erros de console) e por capturas em 375 e 1280. Teclado: navegado por foco/atalhos padrão; o tour usa cartão não modal (sem armadilha de foco).
