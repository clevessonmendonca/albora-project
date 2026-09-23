# Onda 5 — Compartilhar (registro de execução)

**Goal:** Juntar num lugar só tudo que faz o convidado chegar.

**Spec:** `docs/superpowers/specs/2026-09-22-painel-anfitriao-redesign-design.md` (§5.4), commit `8868ba42`.

## A decisão de rota

Compartilhar **não** ganhou rota nova, ao contrário de Experiência. `/qrcode` já era a casa natural — o QR é a maior peça do destino, e a página já montava toda a geração de SVG, nome do evento e URL do convidado. Criar `/compartilhar` significaria duplicar essa montagem ou mover código sem ganho. O rótulo da navegação e o caminho da rota não precisam coincidir; Início já é a rota base e Fotos já é `/album`.

## O que mudou de lugar

Os controles ao vivo guardavam duas coisas que não são controle de operação: **as peças para imprimir** e **os links do evento**. Vieram para Compartilhar. Somadas à música e ao telão da Onda 4, `event-controls.tsx` perdeu ~120 linhas e voltou a ser só o que é: pânico, gate, menores, modo endurecido e plano.

`EventLink` era uma função privada dentro de `event-controls.tsx`. Virou componente próprio para poder ser reusada — e, na mudança, trocou o "copiado" inline por **toast**.

## O toast que faltava no painel inteiro

O `ToastContainer` do design system **nunca esteve montado no admin**. Só o lado do convidado o tinha (`app/e/[slug]/layout.tsx`). Todo feedback de sucesso no painel era texto inline reescrito arquivo a arquivo — a dívida que a Onda 0B-2 mapeou mas não fechou, porque cada caso precisava de decisão de conteúdo.

Montá-lo no `AdminShell` custou duas linhas e destrava a spec §8 ("Sucesso é toast") para todas as ondas seguintes. O `EventLink` é o primeiro consumidor, e trata a falha de clipboard com mensagem própria em vez de silêncio.

## Resultado

Três commits. Suíte em 2785 testes, typecheck e lint limpos, 8 guards.

Uma limpeza de arrasto: com os links fora, as props `slug` e a variável `origin` de `EventControls` ficaram órfãs. Saíram junto, com o caller ajustado.

## Pronto quando

- Uma tela responde "como faço o convidado chegar": link, convite de WhatsApp, QR e peças.
- Copiar um link avisa por toast, e avisa também quando o navegador recusa a cópia.
- Os controles ao vivo não guardam mais nada que não seja operação de festa.
- Suíte verde.
