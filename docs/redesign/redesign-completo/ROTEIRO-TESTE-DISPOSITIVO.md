# Roteiro de teste em dispositivo real: painel do anfitrião

O que a varredura automática (`tools/audit.js`) **não** cobre. Tudo aqui precisa de um aparelho, um navegador ou um leitor de tela de verdade. Tempo estimado: 40 min.

## Antes de começar

1. No Mac, suba o protótipo: `cd docs/redesign/redesign-completo/prototipo && python3 -m http.server 5180 --bind 0.0.0.0`.
2. No celular, na mesma rede Wi-Fi, abra `http://<IP-do-Mac>:5180/#/h/e/e1/hoje`. Descubra o IP em Ajustes do Mac > Wi-Fi.
3. Painel Protótipo (aba lateral): fase **antes**, tema **claro**. Marque cada item abaixo como ✅ ou ❌ e anote o aparelho e a versão do sistema.

Aparelhos mínimos: 1 iPhone com Safari, 1 Android com Chrome. Se só houver um, comece pelo iPhone.

## 1. Toque e gestos (iPhone e Android)

| # | Teste | Esperado |
|---|---|---|
| 1.1 | Fase **durante**. Fotos > "Para revisar" > abrir uma foto. Deslizar para a **direita** com o dedo | Foto acompanha o dedo, rótulo "Aprovar" aparece, passa de 90 px e a próxima entra |
| 1.2 | Mesma tela, deslizar para a **esquerda** | Rótulo "Ocultar", foto sai, próxima entra |
| 1.3 | Arrastar menos de 90 px e soltar | Foto volta ao lugar, nada muda |
| 1.4 | Começar o arrasto **na borda esquerda** da tela (iPhone) | Faz o "voltar" do sistema, não aprova nem oculta |
| 1.5 | Arrastar para **cima/baixo** sobre a foto | Rola a página, sem aprovar |
| 1.6 | Foto **já aprovada**: deslizar | Só navega entre fotos |
| 1.7 | Botões Aprovar/Ocultar na mesma tela | Funcionam, com alvo confortável para o polegar |
| 1.8 | Toasts de "Desfazer" | Aparecem acima da barra inferior, sem cobrir botões |

## 2. Teclado virtual e folhas

| # | Teste | Esperado |
|---|---|---|
| 2.1 | Convidados > "Convidar pessoas" > tocar no campo de e-mail | Teclado de e-mail abre; o campo e os botões fixos do rodapé **não** ficam escondidos atrás do teclado |
| 2.2 | Digitar um e-mail e um nome | Prévia do e-mail atualiza a cada letra |
| 2.3 | Tocar em "Abrir no meu e-mail" | App de e-mail abre com para, assunto e texto preenchidos |
| 2.4 | Tocar em "Mandar por WhatsApp" (com número de celular) | WhatsApp abre na conversa do número, com o texto |
| 2.5 | Tocar em "Copiar link" | Toast "Link copiado" e o link cola em outro app |
| 2.6 | Cadastro do fornecedor (`#/f/novo`) com teclado aberto | Botão "Continuar" alcançável |
| 2.7 | Girar o aparelho (paisagem) em Hoje, Fotos e a folha de convite | Sem conteúdo cortado nem barra inferior cobrindo ações |

## 3. Leitor de tela

VoiceOver (iPhone: Ajustes > Acessibilidade) e TalkBack (Android).

| # | Teste | Esperado |
|---|---|---|
| 3.1 | Navegar a barra inferior | Lê "Hoje, Fotos, Convidados, Mais"; o item atual é anunciado como atual |
| 3.2 | Abrir "Mais" | Lista lida na ordem; "Estilo" presente |
| 3.3 | Lightbox de foto em revisão | Lê autor, estado e botões Aprovar/Ocultar; **o gesto de deslizar tem alternativa por botão** (obrigatório) |
| 3.4 | Folha "Convidar pessoas" | Foco vai para a folha; campos com rótulo; prévia não é lida como duplicata |
| 3.5 | Contagem regressiva do Hoje | Anunciada sem repetir a cada segundo |
| 3.6 | Toasts | Lidos uma vez, sem roubar o foco |
| 3.7 | Filtros e abas em pílula | Estado "selecionado" é anunciado |

## 4. Safari (macOS e iOS)

| # | Teste | Esperado |
|---|---|---|
| 4.1 | Desktop: o shell estilo Arc (canvas, sidebar, ilha arredondada) | Sem borda cortada, `overflow: clip` ok |
| 4.2 | Fotos em masonry (colunas) | Fotos não quebram no meio entre colunas |
| 4.3 | Barras fixas (rodapé da folha, botão "Ver como fica") | Respeitam a área segura do iPhone (home indicator) |
| 4.4 | Tema escuro e `color-mix` | Cores iguais ao Chrome; sem fundo preto/branco chapado |
| 4.5 | Telão em tela cheia (`#/t/display`) | Fotos sem corte, fundo desfocado renderiza |

## 5. Desempenho e conexão

| # | Teste | Esperado |
|---|---|---|
| 5.1 | Fotos com 48 itens, rolar rápido no celular | Sem travar; masonry estável |
| 5.2 | Hoje "durante" aberto por 2 min | Novas fotos entram sem pulos de layout |
| 5.3 | Modo avião após carregar | Telas já abertas continuam navegáveis |

## Como registrar

Para cada ❌: tela, passo, aparelho, versão do sistema e uma captura de tela. Abra uma issue por área (gesto, teclado, leitor de tela, Safari). Bloqueantes para o produto real: 1.4, 2.1, 3.3 e 4.3.

## Fora do escopo deste roteiro

Conteúdo do guest (câmera, microfone, vídeo nas histórias) e envio real de e-mail/WhatsApp. O protótipo só abre o app do anfitrião; o Albora não envia nada ao convidado.
