# Esboço — controlador vs. operador (LGPD)

> **Status:** rascunho para revisão jurídica — **não substitui parecer**
> **Última revisão:** 2026-08-29
> **Origem:** [`plano-implementacao-produto.md`](../product/plano-implementacao-produto.md) N4 · [`architecture.md`](../architecture.md) Anexo A · [`security.md`](../security.md) §5.3
> **Bloqueia:** 1º evento real (parecer assinado)

---

## 1. Objetivo deste documento

Dar ao advogado insumos estruturados para definir:

1. Quem é **controlador** e quem é **operador** (Art. 5º, VI e VII, LGPD) em cada relação de dados do Albora.
2. Quem responde a **pedidos de titular** (acesso, correção, exclusão, portabilidade).
3. Base legal para **fotos de terceiros** e **presença de crianças** em eventos sociais.
4. Cláusulas mínimas de **DPA** (contrato operador) e **termos ao anfitrião**.

Este esboço reflete o desenho técnico atual; a redação final é do advogado.

---

## 2. Atores e dados tratados

| Ator | Papel provável | Dados principais |
|---|---|---|
| **Casal / anfitrião** | Contrata o serviço; define convidados, regras da festa, liga "há menores" | Conta (e-mail), billing, configuração do evento, decisões de moderação |
| **Convidado** | Usa sem login; envia mídia | Nome opcional, token de sessão opaco, consentimento versionado, mídia + metadados técnicos (sem EXIF/GPS) |
| **Terceiro na foto** | Não interage com o produto | Imagem capturada por outro convidado |
| **Sea / Albora** | Plataforma SaaS | Processa dados em nome do evento; infra, moderação automática, retenção |

**Dados que o produto evita por desenho:** idade, login persistente entre eventos, GPS (EXIF removido no cliente), reconhecimento facial.

---

## 3. Hipótese de papéis (para validação jurídica)

### 3.1 Evento como unidade de tratamento

Cada `event_id` isola dados (RLS forçado). A hipótese operacional:

| Tratamento | Controlador provável | Operador provável |
|---|---|---|
| Mídia de convidados no evento X | Anfitrião(ões) do evento X | Albora (Sea) |
| Conta e billing do anfitrião | Anfitrião | Albora |
| Logs técnicos e auditoria de plataforma | Albora | Suboperadores (CF, Neon, R2, Resend) |
| Export Drive do casal (opt-in) | Anfitrião | Albora + Google (suboperador) |

**Pergunta ao advogado:** co-controladoria entre noivos e cerimonialista contratado? Como refletir no painel multi-papel ([ADR 0013](../adr/0013-host-event-roles.md))?

### 3.2 Pedidos de titular — roteamento proposto

| Pedido | Primeiro contato | Ação técnica Albora |
|---|---|---|
| Convidado remove **própria** foto | Self-service no produto | Já implementado |
| Pessoa **aparece** na foto e não enviou | Anfitrião (denúncia `aparece_na_foto`) | Ferramentas admin; sem auto-remoção |
| Exclusão total do evento | Anfitrião | Job retenção D365; export antes se aplicável |
| Acesso/portabilidade | **Definir com advogado** — depende de controlador | Export ZIP / Drive conforme plano |

**Risco sem parecer:** prazo legal correndo enquanto equipe improvisa quem responde ([`security.md`](../security.md) §9).

---

## 4. Crianças e adolescentes

Alinhado ao [ADR 0012](../adr/0012-menores-sem-perguntar-idade.md):

- **Não coletamos idade** em lugar nenhum.
- Proteções altas são **padrão para todos**; interruptor "há menores" sobe o piso sem identificar pessoa.
- Consentimento do upload cobre **quem envia**, não **quem aparece**.

**Perguntas ao advogado:**

1. Base legal para tratamento de imagem de criança em festa privada quando o anfitrião é controlador?
2. Texto nos termos sobre dever do anfitrião sobre convidados e quem aparece nas fotos.
3. Art. 14 LGPD — consentimento parental é exigido, dispensável ou coberto por outra base neste contexto?

---

## 5. Operador — obrigações técnicas já implementadas

Para anexar ao DPA:

| Obrigação | Implementação |
|---|---|
| Segurança | RLS, presign, domínio de mídia separado, CSP |
| Suboperadores | Cloudflare, Neon, R2, Resend — lista a manter |
| Retenção | Job D330 export / D365 delete |
| Incidente | [`security.md`](../security.md) §9; procedimento menores em [`procedimento-conteudo-ilegal-menores.md`](./procedimento-conteudo-ilegal-menores.md) |
| Auditoria | Append-only; ações sensíveis registradas |
| Apoio ao controlador | Ferramentas admin, export, remoção |

---

## 6. Entregáveis esperados do parecer

| # | Entrega | Consumidor |
|---|---|---|
| 1 | Definição formal controlador/operador por fluxo | Termos de uso, contrato anfitrião |
| 2 | Modelo de resposta a pedido de titular | Suporte / ops |
| 3 | Cláusulas DPA (operador) | Contrato comercial |
| 4 | Posição escrita sobre imagem de crianças | ADR 0012, landing, termos |
| 5 | Responsável por notificação ANPD (se aplicável) | Runbook incidente |

---

## 7. Checklist antes do 1º evento

| ☐ | Item |
|---|---|
| ☐ | Parecer assinado arquivado |
| ☐ | Termos de uso e política de privacidade publicados com redação aprovada |
| ☐ | Fluxo de pedido de titular documentado para suporte |
| ☐ | DPA ou cláusula operador no contrato/plano pago |

---

## 8. Changelog

| Data | Mudança |
|---|---|
| 2026-08-29 | Esboço N4 criado para insumo ao advogado |
