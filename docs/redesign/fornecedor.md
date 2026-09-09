# Redesign — fornecedor e portal white-label

> **Para o agente/dev que vai implementar.** Este documento traduz o fluxo comercial e operacional do fornecedor. A referência visual canônica é [`prototipos/fornecedor-completo.html`](./prototipos/fornecedor-completo.html). O HTML usa estado demonstrativo e JavaScript apenas para revisão dos fluxos; **não porte esse JavaScript para o produto**.

## Objetivo e escopo

Dar ao fornecedor uma entrada comercial clara e um portal simples de operar: entender o produto, criar um evento, personalizar sua identidade, acompanhar a festa e administrar equipe, plano e cobranças. O fluxo não mistura três papéis distintos:

- **Fornecedor:** vende e opera a experiência para uma carteira de eventos; é o alvo deste documento.
- **Anfitrião:** organiza um evento específico; segue o fluxo de [`painel.md`](./painel.md).
- **Staff Álbora:** opera a plataforma; segue [`console.md`](./console.md).

O protótipo cobre landing, onboarding, portal, carteira, detalhe do evento, identidade, equipe, cobranças, checkout e confirmação. A primeira versão exploratória foi descartada; use somente `fornecedor-completo.html` como referência.

## Fluxo canônico

1. **Landing:** explica em linguagem direta que o Álbora reúne QR, fotos e mensagens dos convidados, missões, telão e álbum. A ação principal é **Criar meu primeiro evento**.
2. **Onboarding:** três etapas curtas — dados do evento, direção visual e confirmação. O fornecedor vê a identidade enquanto escolhe e pode refiná-la depois.
3. **Portal:** mostra o que merece atenção, ações frequentes, evento ao vivo e carteira. Quando tudo está resolvido, o estado “tudo em dia” substitui listas de pendências vazias.
4. **Eventos:** permite filtrar a carteira por momento, abrir um evento e acessar fotos, QR/kit, telão e entrega.
5. **Marca:** configura nome, link e direção visual da operação. A implementação deve incluir cores, tipografia, capas e prévia das superfícies conforme [`identidade.md`](./identidade.md).
6. **Equipe:** convida pessoas, atribui papéis, edita e revoga acesso com confirmação e retorno visível.
7. **Cobranças:** apresenta plano atual, recorrência, próxima cobrança, recibos e gerenciamento da assinatura.
8. **Checkout:** mantém plano, recorrência, forma de pagamento, e-mail, resumo e confirmação na mesma jornada. O usuário nunca sai para um link externo sem contexto.

## Planos e valor

Todos os planos entregam o núcleo do produto: QR/link, participação, fotos, mensagens, missões, álbum, exportação básica e acesso sem aplicativo. Os níveis maiores vendem capacidade e operação — mais eventos, equipe, identidade, insights, white-label e suporte — sem retirar o resultado essencial dos planos menores.

Os nomes, limites e preços exibidos no protótipo são proposta de embalagem e precisam ser confirmados com a fonte comercial antes da implementação. Nunca duplique esses valores em componentes; use a configuração de catálogo/billing.

## Relação com o código atual

- Landing atual: `apps/web/app/landing/**` e a entrada pública do fornecedor.
- Portal atual: `apps/web/features/vendor-portal/**`.
- Criação/configuração do fornecedor: `apps/web/app/admin/vendor/**` e `apps/web/app/api/admin/vendor/**`.
- Identidade: `apps/web/app/api/vendors/[vendorId]/brand-tokens/route.ts` e componentes `vendor-brand-*`.
- Assinatura do fornecedor: `POST /api/vendors/[vendorId]/subscription`, consumido pelo checkout dedicado em `/admin/vendor/checkout`; `VendorSubscribeButton` leva ao fluxo e impede nova oferta quando a assinatura está ativa ou pendente.
- Equipe: `/admin/vendor/[vendorId]/team` usa `features/vendor-portal/hooks/use-vendor-team.ts` e o client service correspondente; as APIs em `/api/vendors/[vendorId]/members/**` delegam para o caso de uso auditado. Limites vêm de `VENDOR_PLAN_TEAM_LIMIT`, no domínio, e a escrita usa lock por fornecedor para impedir corrida.
- Checkout de evento: `POST /api/billing/checkout`, consumido pelo passo final da criação de evento. O checkout de assinatura do fornecedor trata retorno com e sem `invoiceUrl`, erro recuperável e ativação posterior pelo webhook.
- Billing: reutilizar `apps/web/lib/billing/**`; webhook continua sendo a fonte de verdade para ativação.

Cada ação de mutação deve chamar o comando/use case existente. Quando não houver comando, implementar comando, autorização, auditoria e estados de erro antes de expor o controle.

## Direção visual e imagens

O layout usa composição editorial, verde profundo, fundos claros, formas circulares e fotografia documental. As imagens foram geradas especificamente para demonstrar convidados participando da festa, sem texto ou marca embutidos:

- `prototipos/assets/fornecedor/celular-na-festa.webp` — entrada/captura pelo convidado;
- `prototipos/assets/fornecedor/pista-multigeracional.webp` — narrativa da landing e telão;
- `prototipos/assets/fornecedor/convidados-fotografando.webp` — álbum, evento ao vivo e mosaico.

Na implementação, trate essas imagens como direção de arte do protótipo. Preserve `object-fit`, ponto focal por breakpoint, texto alternativo para imagens informativas e `alt=""` para imagens puramente decorativas. Carregue abaixo da dobra sob demanda e mantenha dimensões estáveis para evitar layout shift.

## Responsividade e acessibilidade

- Desktop, tablet e celular têm composição própria; não reduza o desktop por escala.
- Cards, tabelas de comparação e navegação devem reorganizar conteúdo sem corte horizontal. Em telas estreitas, comparação vira cartões/linhas por plano ou região rolável com indicação e cabeçalhos persistentes.
- Texto nunca pode cruzar fotografias ou formas sem contraste previsível.
- Alvos interativos têm pelo menos 44 × 44 px, foco visível, nome acessível e estado anunciado além da cor.
- Diálogos prendem o foco, fecham com `Esc`, devolvem foco ao acionador e usam confirmação clara para ações destrutivas.
- Respeitar `prefers-reduced-motion`; animação serve para orientar mudança de estado.
- Estados obrigatórios: carregando, vazio, falha, pagamento pendente, pago, cancelado, assinatura ativa e plano sem permissão.

## Próxima implementação

1. Criar as páginas reais do fornecedor reutilizando o shell e os dados de `features/vendor-portal`.
2. Implementar o onboarding sobre os comandos existentes de fornecedor e evento.
3. ✅ Checkout dedicado em `/admin/vendor/checkout`, com plano, forma de pagamento, resumo, retorno do provedor e estado pendente protegido contra duplicidade.
4. ✅ Provider de billing reutilizado; o webhook permanece como fonte de verdade da ativação.
5. ✅ Métricas e carteira ligadas aos dados agregados reais, com estado vazio honesto.
6. ✅ Equipe implementada com convite por magic link, papéis, remoção confirmada, limite por plano, autorização de administrador e auditoria anterior ao acesso agregador.
7. Implementar recibos e gerenciamento da assinatura. A marca já usa a API real de `brand-tokens`.
8. Cobrir o caminho completo em E2E quando o ambiente de billing de teste estiver disponível; componentes críticos já têm testes de teclado, erro e ausência de URL externa.
