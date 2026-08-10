# 0004 — Sessão anônima do convidado, sem provedor de identidade

- **Status:** Accepted
- **Data:** 2026-08-09
- **Relaciona-se com:** [0002](./0002-event-as-tenancy-boundary.md)

## Contexto

A hipótese que decide o negócio é aritmética: **≥40% dos convidados presentes enviam ao menos uma foto.** Abaixo de 25%, a tese está errada e o projeto para. Cada tela entre o QR Code e a câmera derruba esse número, e login é a tela mais cara de todas — pede identidade a alguém que está numa festa, de salto, com um copo na mão, às 22h, sem motivação nenhuma para se cadastrar em nada.

O usuário principal do produto, portanto, **não tem conta**. Isso não é uma lacuna a preencher na Fase 2; é a decisão de produto que torna o produto possível.

A consequência de segurança é que não existe identidade verificada por trás de quem sobe mídia. Precisamos de uma credencial que autorize sem autenticar.

## Decisão

**Um token de sessão opaco, assinado, escopado a exatamente um evento, emitido após o consentimento.**

```
QR → consentimento (1 tela, 1 checkbox, versão e data registradas)
   → POST /api/sessions → guest_session + token
   → cookie HttpOnly, SameSite=Lax
```

**O token autoriza exatamente três coisas** no evento ao qual está preso: subir mídia, reagir, remover a própria mídia. Não lê dado de outro convidado além de mídia aprovada; não abre nada no admin; não é transferível entre eventos.

**Opaco, não um JWT com claims legíveis.** Não há segredo a proteger dentro dele, mas também não há razão para publicar estrutura interna a um público que inclui o irmão adolescente da noiva. Referência a estado no servidor permite a próxima propriedade.

**Revogável por evento.** Se um QR vazar em rede social durante a festa, o anfitrião rotaciona sem derrubar quem já está subindo foto. Sem revogação, a única resposta a um QR vazado seria encerrar o evento no meio.

**Rate limit por sessão e por IP roda antes de qualquer trabalho caro**, inclusive antes de emitir presigned URL. Circuito no portão, não na saída: um request condenado não deve queimar nada.

**A chave de storage é derivada no servidor** a partir do `event_id` da sessão. O cliente nunca a informa, nem no presign nem no confirm. É o único ponto do sistema onde um cliente não autenticado pede permissão de escrita direta no storage, e por isso o único lugar onde essa regra não admite exceção.

**O consentimento é pré-requisito da emissão**, versionado e datado. Sem consentimento não há sessão; sem sessão não há upload.

## Consequências

**Positivas** — o caminho crítico fica em quatro toques. Nenhum dado pessoal é coletado além de nome opcional e, se o convidado optar explicitamente, um canal de contato. Isso reduz a superfície de LGPD a quase nada por construção, em vez de por política: não se vaza o que não se coleta.

**Custo** — sem identidade, "remover minha foto" depende do token. Convidado que limpa cookies ou troca de aparelho perde a capacidade de remover pela própria mão e precisa pedir ao anfitrião. É um caminho de suporte real e precisa existir no admin, não ser descoberto durante um evento.

**Abuso é contido por escopo, não por identidade.** Alguém com o QR pode subir lixo. As defesas são rate limit, moderação (fila de aprovação obrigatória quando há telão), classificador antes da liberação para o telão, e revogação. Nenhuma delas depende de saber quem é a pessoa — o que é bom, porque nunca vamos saber.

**A tentação a resistir:** a cada feature nova — notificação, multi-evento, "suas fotos" — vai parecer que login resolveria. Ele resolve, e ao custo da H1. O app instalado é o lugar onde identidade opcional passa a existir; o fluxo web do convidado, nunca.
