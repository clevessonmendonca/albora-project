# Design

| Artefato | O que é |
|---|---|
| [`fluxos-principais.html`](./fluxos-principais.html) | Protótipo funcional dos oito fluxos. Abra no navegador |

O sistema de design vive em [`../../DESIGN.md`](../../DESIGN.md). Este diretório guarda o que se **vê**.

## O protótipo funciona de verdade

Não é maquete estática. Rodando nele:

- **Câmera do aparelho** via `getUserMedia`, com obturador, flash e grade de terços. Permissão negada cai no seletor de arquivos sem tela de erro — a nuance N5.1 acontecendo ao vivo
- **Editor de foto** no padrão Instagram: oito filtros com miniatura da própria foto, intensidade contínua, e ajustes de Luz, Calor, Contraste e Vinheta. O 35 mm roda em canvas; os outros sete são CSS
- **Telão** com carrossel real e a fila de três faixas implementada — nunca exibida (50%), recente (25%), popular com decaimento (25%)
- **Cinco modelos de telão** que nunca cortam na vertical: Polaroide, Mural, Colagem, Ambiente, Cheio
- **Quatro modelos de identidade** que trocam acento, tipografia, filtro recomendado e modelo de telão de uma vez — a tese do [ADR 0003](../adr/0003-runtime-token-resolution.md) visível
- **Chão do evento** noite/papel, com o acento se re-derivando para não reprovar contraste
- **Landing por vertical** — casamento, 15 anos, formatura — trocando vocabulário e acento pelo pack
- **Admin como janela de macOS**, com barra lateral, ferramentas unificadas e inspetor

As fotos de exemplo são **geradas em canvas**: luz quente com um contraluz frio, bokeh com anel, silhuetas, vinheta e grão. Seguem a direção de imagem do §5.5 do doc de branding.

Nada sai do navegador — a foto que você tirar não é enviada a lugar nenhum.

## Estado, em 2026-08-09

**Pausado por decisão.** O protótipo comunica os fluxos e as decisões; o acabamento visual ainda tem margem.

**O teto conhecido:** as imagens são abstratas. As referências que guiaram a direção — Aesop, LEEMA, Le Labo — são 80% fotografia de gente em luz boa. Trocar os gradientes gerados por **oito a dez fotos reais de festa** muda mais a percepção da página do que qualquer ajuste de CSS restante. É o próximo passo de maior retorno, e depende de material, não de código.

**Não construído:** vídeo no herói com play/pause (§3.2 do doc de landing pede, e precisa de arquivo real), galeria pós-evento, botão de pânico na tela do telão, aviso de rotação de slug invalidando material impresso.
