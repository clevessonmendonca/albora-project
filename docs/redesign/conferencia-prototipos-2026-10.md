# Conferência dos protótipos — outubro de 2026

Referências fornecidas: `Albora-Prototipo (2).html`, `Albora-Criar-Evento-Prototipo (2).html`,
`Albora-Convidados-Prototipo (1).html` e `Albora-Dia-do-Evento-Prototipo.html`.
O HTML orienta composição e navegação; tokens, autorização, dados e comandos continuam os do produto.

## Implementado nesta rodada

- Criação: cinco etapas, navegação lateral no desktop, progresso no celular, tipos com ícones,
  escolha da capa na identidade, revisão editável e logo do design system.
- Prévia móvel usa `BottomSheet`, com foco e fechamento acessíveis; seu botão não cobre conteúdo.
- Entrada do convidado: fotografia, título centralizado e fluido, mensagem e ação principal contida.
- Dia do evento: controle do telão, revisão na coluna principal e instruções/QR na lateral.
- Atalhos de telão na Home levam a `/ao-vivo`; rótulos não são truncados na coluna estreita.

## Evidência e limites

As cinco etapas da criação foram renderizadas com CSS compilado e verificadas quanto a
overflow horizontal em 320, 375, 768, 1024 e 1440 px. Entrada, identidade e blocos da Home
foram capturados em 375, 768 e 1440 px, com fontes e imagens locais.

São capturas de componentes com dados de exemplo. Não substituem validação autenticada
de ponta a ponta, nem certificam todas as rotas. A central ao vivo ainda precisa de
conferência no navegador com evento real. Conectividade física do telão e histórico
operacional do protótipo não foram simulados.

## Reproduzir as capturas

Com Node 22, dependências instaladas e Google Chrome:

```sh
PREVIEW=1 pnpm exec vitest run apps/web/features/guest/preview-harness.test.tsx apps/web/features/admin/components/client/onboarding/preview-harness.test.tsx
node tools/preview/montar.mjs
node tools/preview/capturar.mjs convidado-entrada.html painel-blocos.html criacao-identidade.html
```

Saída padrão: `/tmp/albora-preview`. `PREVIEW_DIR` permite outro diretório.
Os harnesses não escrevem arquivos no CI sem `PREVIEW=1`.

## Próxima conferência

Comparar álbum, lista de convidados, convite/QR e estados pós-evento com as respectivas
telas do protótipo. Validar permissões, estados vazios, erros e navegação em sessão real.
O redesign completo não está marcado como concluído.
