# Auditoria de arte: Telão (`wall.js`, rotas `#/t`)

Método: cada tela aberta no navegador (1360 x 860; o telão é vmin, então a escala acompanha a TV). As dez perguntas: 1 identidade, 2 logo oficial, 3 mascote/avatar, 4 âmbar correto, 5 personalidade, 6 quantidade de informação, 7 hierarquia, 8 componente desnecessário, 9 ação principal, 10 nível de produto. "Antes" é o estado da 1ª passada; "Agora" é o que ficou depois da correção.

Impeccable usado: `critique.md` (triagem de genérico), `craft-floor.md` (kicker e cartões banidos, estados, tipografia), `layout.md` (ritmo e espaço), `typeset.md` (código em Fraunces, escala), `animate.md` (um só momento autorado: a marca que se traça na abertura), `distill.md` (cortar passos e cromo).

## 1. Parear: código na TV (`#/t/parear`)
1. Identidade: sim. Fundo noite, Fraunces e a marca animada; antes era um painel qualquer com disco "a".
2. Logo oficial: sim. `splash-animado.svg` (arco que se traça, sol e nome) no lugar do disco genérico.
3. Mascote: não aparece, correto para o telão.
4. Âmbar: sim. Só a marca animada e o acento do evento; nenhum botão âmbar.
5. Personalidade: sim. O código em Fraunces com espaçamento largo é o objeto da tela.
6. Informação: sim. Antes eram três passos numerados; agora uma frase ("abra Compartilhar › Telão e digite este código").
7. Hierarquia: sim. Código gigante, validade pequena, instrução, o resto escondido.
8. Desnecessário: parcial. O bloco "Protótipo (simulado)" é obrigatório pelo brief, mas virou nota discreta em vez de caixa tracejada.
9. Ação principal: sim. Digitar o código no painel; na TV não há botão competindo.
10. Nível de produto: sim. Parece tela de TV de verdade a 3 metros.

## 2. Telão ligado e "Este telão já está ligado"
1. Sim, mesma tela escura. 2. Sim: estrela animada oficial (`A.star`) na confirmação; marca de abertura no estado "já ligado". 3. Não, correto. 4. Sim. 5. Parcial: confirmação curta e correta, sem gesto próprio além da estrela. 6. Sim, título, uma frase e um botão. 7. Sim. 8. Não. 9. Sim, "Abrir o telão agora" é o único primário (liga sozinho em 1,6 s). 10. Sim.

## 3. Conectar por link (`#/t/link/:token`): conectando, link inválido, sem internet
1. Sim. 2. Sim: marca de abertura no "conectando"; o inválido e o erro não levam logo para não parecer marketing. 3. Não, correto. 4. Sim. 5. Parcial: o inválido ficou sóbrio demais, mas é uma tela de falha e deve ser. 6. Sim: antes eram 3 passos numerados, agora uma frase com o caminho. 7. Sim. 8. Parcial: o botão "Abrir o painel" é secundário e útil em celular, mas não em TV; fica como quieto. 9. Sim: "Conectar pelo código". 10. Sim; cada motivo (usado, 20 min, substituído) diz o que fazer.

## 4. Exibindo: cena de fotos (`#/t/display`, polaroide, mural, colagem, dump)
1. Parcial. A foto é a identidade; a moldura papel da polaroide e as cores do evento dão assinatura, os demais modelos são neutros por regra (a foto manda).
2. Não aplicável: nenhuma marca durante a exibição, de propósito (marca só na abertura/aguardando).
3. Não, correto.
4. Sim. A etiqueta "Agora" passou de `--ev` para `--ac` (acento legível do evento sobre noite).
5. Parcial. Cinco modelos contidos; falta personalidade extra, mas o brief pede "quase nenhum cromo".
6. Sim. Contador e relógio em pastilha escura com cor --fg-2 (sem opacidade, 3ª passada); só crédito do autor e hora.
7. Sim. Foto inteira (nunca corta vertical), tudo mais some.
8. Não. A barra de controles só aparece com mouse, clique ou Tab.
9. Não aplicável (tela passiva). Atalhos: Espaço, N, F, ?.
10. Sim.

## 5. Aguardando as primeiras fotos
1. Sim. 2. Sim: estrela animada oficial (marca animada na abertura/aguardando). 3. Não, correto (antes era um ícone genérico). 4. Sim. 5. Sim, o QR sobre papel é o objeto e a estrela dá vida. 6. Sim: título, uma linha, QR, aviso de QR de exemplo. 7. Sim. 8. Não. 9. Sim, escanear o QR. 10. Sim. Defeito achado e corrigido: o QR estava invisível (cor herdada do tema noite sobre fundo papel).

## 6. "Telão em pausa"
1. Sim. 2. Sim, o arco da marca como assinatura (sol no topo, sem ícone de pausa). 3. Não, correto. 4. Sim. 5. Sim: antes o ícone de pausa genérico; agora o arco da logo. 6. Sim: título e uma frase. 7. Sim. 8. Não. 9. Não aplicável; retomar é no painel ou com Espaço. 10. Sim.

## 7. "Já voltamos" (pânico)
1. Sim. 2. Sim, arco da marca com o sol baixo "respirando" (o sol ainda não nasceu). 3. Não. 4. Sim. 5. Sim: o nome do evento em Fraunces e a promessa curta. 6. Sim. 7. Sim. 8. Não. 9. Não aplicável (só o painel liga e desliga). 10. Sim. Respeita `prefers-reduced-motion` (a respiração desliga).

## 8. Carregando e erro (display e parear)
1. Parcial: neutros, sem marca. 2. Não: ficam sem logo; o spinner é do sistema. 3. Não. 4. Sim. 5. Não: são telas utilitárias por natureza. 6. Sim. 7. Sim. 8. Não. 9. Sim, "Tentar agora/de novo" no erro. 10. Parcial: poderiam ter o arco como carregamento; não fiz para não competir com a abertura.

## O que mudou, resumo
Disco "a" removido; marca animada oficial na abertura, ligado e aguardando; `A.arc` em pausa e pânico; passos numerados cortados para uma frase; nota de protótipo deixou de ser caixa; `--ev` de cromo virou `--ac`; HUD discreto; QR do aguardando consertado.

## Ainda fraco
- Sem vídeo nem os outros 7 modelos de exibição (limite herdado).
- O arco de pausa não anima percurso (só respira); um percurso real do sol exigiria JS próprio.
- A abertura animada reinicia a cada re-render do pareamento (a cada 10 min, quando o código troca).

## 3ª passada: sistema, mobile-first e emoção

Lint (`node tools/lint.mjs wall.js`): 23 ocorrências (12 espaço, 1 fonte, 10 duração) → **0**. Auditoria renderizada (`AUDIT.run()` em parear, link amostra/expirado e display, em 320, 375, 768, 1280x720, 1920x1080, e 2560x1080 ultrawide): sem `overflowX`, `tinyTargets` 0, `smallTargets` 0, `contrast` vazio, `textMin` 12. Estados carregando, vazio e erro conferidos em parear e display (sem overflow nem alvos pequenos).

Antes → depois
- **Contraste**: o "há 48 min" da polaroide tinha 2,55:1 (o tema noite herdado dava `--fg-3` claro sobre papel). A polaroide agora redefine `--fg-2/--fg-3` com os mesmos tokens do tema papel: cerca de 8:1, sem `opacity`. Tirei toda opacidade de texto: contador, relógio e dica viraram pastilhas escuras (80% noite) com `--fg-2`, legíveis sobre qualquer foto; o ícone de erro usa `--fg-2` em vez de `opacity:.55`.
- **Espaço e tipo**: todo padding, gap e margem sai de `--space-N` ou de `clamp(var(--space-a), N vmin, var(--space-b))`; textos usam `--fs-*` nos limites do `clamp` (a escala segue a menor dimensão da tela, então 720p, 1080p e ultrawide mantêm a mesma proporção). Nota "Protótipo" subiu de 12,5 px para `--fs-xs`.
- **Movimento**: o JS só usa `--dur-1/2/3`. Lentos por natureza, múltiplos documentados em `--wl-in` (3 x 320 ms, foto que entra), `--wl-out` (2 x 320, a que sai), `--wl-sway` (25 x 320, balanço da polaroide), `--wl-breathe` (16 x 320, sol do arco). Entrada em cascata do mural com `--dur-1` e da colagem com `--dur-2`.
- **Ultrawide**: a colagem passou a viver numa caixa 16:9 centralizada (unidades `cqw/cqh`), então 2560x1080 não espalha as polaroides nas pontas. Polaroide e mural nunca cortam: `object-fit: contain`, com o fundo borrado preenchendo o espaço. Altura do polaroide em `cqh`, não mais `vh`.
- **Alvos**: a barra de controles e os botões de protótipo deixaram `btn-sm` (36 px) e viraram `btn` (44 px). O "Esc/Clique" da dica quebra linha em 320 em vez de cortar com reticências.
- **Mobile e baixa altura**: em largura <480 o código de pareamento aperta o espaçamento entre letras; em altura <500 a tela alinha ao topo e encolhe a marca, para o CTA não sumir.
- **Halo de vela**: o fundo do telão e do pareamento ganha o halo do DESIGN.md §6 (`--ac` a 9%, no alto), a "fonte de luz" que dá volume sem gradiente decorativo.

### Critério emocional (telão)
1. Acolhimento: sim. "Ligue este telão", "Telão ligado" e "Já voltamos" falam como gente, sem jargão.
2. Adequada a um casamento elegante: sim. Fraunces grande, noite quente, halo de vela, polaroide em papel; nada de neon.
3. Pessoas e memórias protagonistas: sim. A foto inteira ocupa a tela; o resto some (HUD discreto em pastilha).
4. Moderna sem ser fria: sim. O balanço lento da polaroide e a entrada com leve escala dão calor.
5. Várias gerações: sim. Texto grande, legível a 3 m, uma frase por tela.
6. Personalidade ou template: sim. O código em Fraunces com espaçamento largo e a marca animada são do Albora.
7. Detalhes reforçam a identidade: sim. Arco como assinatura de pausa e "já voltamos"; estrela animada na confirmação.
8. Animações com significado: sim. A foto que chega "respira" para dentro; o sol do arco respira porque ainda não nasceu; nada de confete.
9. Conteúdo com o destaque merecido: sim. Contador e relógio quase invisíveis; autor e hora só na legenda.
10. Revisitar: parcial. Falta o modelo de vídeo e uma transição de "cena" mais autoral (limite herdado).

### Pendências desta passada
- O modelo mural em ultrawide tem células largas (a foto é contida, nunca cortada, mas sobra fundo borrado); um mural com colunas fixas por proporção exigiria nova lógica de grade.
- Observei uma vez o telão em "Aguardando" por alguns segundos com o `A.data.photos` do núcleo vazio (modelo do `host-evento.js` recalculando); some sozinho e não é do telão.
- Telas em segundo plano congelam as animações CSS; a verificação visual foi feita com a aba à frente.
