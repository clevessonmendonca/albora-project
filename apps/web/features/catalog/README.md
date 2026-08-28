# `features/catalog/`

Catálogo de referência visual das telas do convidado — o lugar para olhar o
design de uma tela isolada, com dados mockados, sem passar pelo fluxo real
(QR → consentimento → gate → API).

## O que é

- Golden-master de UI: cada `*-screen.tsx` é uma composição estática dos
  componentes de `@albora/ui-web`, útil para revisar layout/identidade
  visual sem depender de evento, sessão ou banco.
- Ponto de partida para prototipar um design novo antes de portá-lo para a
  página real (`apps/web/features/<superfície>/components/client/`).

## O que NÃO é

- **Não é código de produção.** Nenhuma tela aqui é servida a um convidado
  real; nada em `apps/web/app/**` renderiza um `*-screen.tsx`.
- **Não é a especificação da página real.** Um mock aqui pode divergir da
  página em produção — divergir não é bug do catálogo, é o catálogo fazendo
  seu papel de rascunho. Antes de tratar uma tela deste diretório como spec
  pendente de port, confira a página real primeiro: ela pode já ter
  evoluído para além do mock.
- **Não substitui teste de comportamento.** Os testes aqui (`*.test.tsx`)
  cobrem a composição visual do mock, não o fluxo funcional do convidado.
