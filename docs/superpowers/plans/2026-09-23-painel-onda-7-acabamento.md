# Onda 7 — Acabamento (registro de execução)

**Goal:** Passar o painel por um pente fino, e ser honesto sobre o que esse pente não alcança.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§10), commit `8868ba42`.

## O método, e seu limite

A spec pede contraste, foco visível, desempenho e revisão dos quatro estados ponta a ponta. Metade disso exige olhar pixel renderizado, e o painel de browser desta sessão não renderiza o app — reproduzido em página que ninguém tocou, com erro de chunk no console.

Então o que foi feito é a metade verificável por leitura: **auditoria contra doze critérios duros**, cada violação com arquivo e linha. É o mesmo método que já pegou, nas ondas anteriores, o emoji na interface, os dois componentes que sumiam em silêncio e a rota `/pre-event` órfã. Não substitui olhar; encontra o que olhar não encontraria de qualquer jeito.

## Resultado da auditoria

Oito categorias limpas: imagem sem `alt`, ordem de cabeçalho, estado distinguido só por cor, estado vazio ausente, emoji em texto de interface, hex hardcodado, `aria-current` no item ativo, e `return null` além do já conhecido.

Nove defeitos reais, todos corrigidos:

| Defeito | Onde | Por que importa |
|---|---|---|
| Alvo de toque abaixo de 44px | `sign-out-button`, `missions-editor` (Remover prazo), `pre-event-checklist` (dois links de ação) | O Sair era o único botão do cabeçalho sem o padrão que o resto do painel segue |
| Controle sem nome acessível | `cover-image-editor` | Input `sr-only` disparado por outro botão: quem navega por teclado chegava num "escolher arquivo" sem nome |
| Rótulo indistinguível em lista | `event-music` | Vários botões "Usar" idênticos; o leitor de tela lista todos sem diferenciar qual sugestão |
| Verbo sem objeto | `inicio-do-evento`, `hub-experiencia` | "Abrir" pelado. O passo agora carrega o rótulo inteiro no `aria-label`; o Recado virou "Escrever" |
| Seção some em silêncio | `encerrar-evento` | Em rascunho sumia inteira, sem dizer que existe e quando aparece |
| Erro de português | `qr-proof-sheet` | "scaneiam" contra "escaneiam", usado corretamente em outras quatro telas |

## O que esta onda não cobriu, e não tem como cobrir daqui

- **Contraste medido.** Os tokens são fixos e nenhum componente usa hex, mas contraste de texto sobre capa com imagem só se mede renderizando.
- **Composição.** Espaçamento, ritmo, hierarquia visual a 375px e a 1280px.
- **Desempenho.** LCP e INP precisam de medição real; o orçamento de bundle existente cobre a rota do convidado, não a do anfitrião.
- **Os quatro estados ponta a ponta.** A spec pede revisar rascunho, antes, durante e depois com dado real. Dá para montar cenário no banco e navegar — mas sem renderização, a revisão seria de DOM, não de tela.

## Resultado

Um commit, nove arquivos. Suíte em 2790 testes, isolamento em 445, typecheck e lint limpos, 8 guards.
