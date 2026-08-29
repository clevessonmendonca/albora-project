# Plano de implementação — produto (pós-discovery)

> **Status:** fonte de verdade para **o que fazer e em qual ordem** após auditoria agosto/2026
> **Última revisão:** 2026-08-29
> **Substitui:** tentativa de abrir features novas antes do 1º casamento real
> **Complementa:** [`../roadmap.md`](../roadmap.md) (código/ops) · [`../specs/README.md`](../specs/README.md) (contratos técnicos)

---

## 1. Princípio rector

> O produto web **já excede** o MVP documentado. O gargalo não é "falta feature" — é **validar H1** (≥40% participação) e **operar o 1º evento** sem falha reputacional.

**North Star:** `sessoes_com_upload / expected_guests`

**Critério social (ADR 0009):** funcionalidade social só permanece se `uploadsDepoisDoFeed > uploadsAntesDoFeed` em 3 eventos.

---

## 2. NOW — Bloqueia o 1º casamento real

Prioridade absoluta. Nada em NEXT compete com isto.

| ID | Entrega | Tipo | Dono | Referência | Prova de pronto |
|---|---|---|---|---|---|
| **N1** | Prova física QR (3 celulares × papel real) | Ops | Produto + anfitrião | [`../runbooks/dia-do-evento.md`](../runbooks/dia-do-evento.md) §2 | 100% scan em 15–45cm, luz baixa |
| **N2** | Deploy produção (CF + R2 + Neon + Resend) | Eng/Ops | Infra | `roadmap.md` A5, ADR 0006 | Magic link recebido; convidado em HTTPS |
| **N3** | Carga 150 uploads / 20 min em infra prod | Eng | QA | `roadmap.md` A4, `runbooks/carga.md` | Gate verde |
| **N4** | Jurídico: controlador vs. operador LGPD | Legal | Fundador | `architecture.md` anexo A | Parecer escrito |
| **N5** | Procedimento menores (ADR 0012) | Produto + legal | Produto | ADR 0012, spec 011 | Doc assinado antes evento |
| **N6** | Casamento #1 instrumentado | Ops | Todos | [`experimentos-validacao.md`](./experimentos-validacao.md) E1 | Funil completo + gravação TikTok |
| **N7** | Runbook dia-D + roteiro microfone | Produto | Produto | `runbooks/dia-do-evento.md` | Anfitrião recebe PDF 1 página |
| **N8** | Fechar data casamento #1 | Comercial | Fundador | produto §8 Fase 0 | Data no calendário |

---

## 3. NOW — Ajustes de produto/código (pequenos, alto impacto H1)

| ID | Ajuste | Problema | Escopo | Spec sugerida |
|---|---|---|---|---|
| **P1** | **Estado do gate na capa** — copy explícita ("Interação abre após a cerimônia" / "Feed liberado") | Convidado abre feed antes do gate e frustra | UI convidado `/cover` | `task-021-gate-capa-copy.md` |
| **P2** | **Fila falha visível** — após N retries, CTA "Tentar de novo" sempre visível em `/my-photos` e fila global | Foto some em silêncio (reviews Dots) | `@albora/core` fila + UI | `task-022-fila-falha-visivel.md` |
| **P3** | **Corrigir copy moderação na landing** — galeria publica + telão protegido | Contradiz produto real | `landing/` | `task-023-copy-moderacao-landing.md` |
| **P4** | **Seção landing convidado-veterano** — "Esteve num casamento Albora?" | Maior intenção, zero copy | `landing/` | `task-024-landing-convidado-veterano.md` |
| **P5** | **Wizard: `expected_guests` obrigatório com hint** — "Quantos convidados presentes? Usamos para participação" | Denominador H1 errado | Admin wizard | Verificar se já ok; senão spec |
| **P6** | **Checklist pré-evento no admin** — peças impressas, telão pareado, gate, menores, microfone | Anfitrião esquece passo | Admin `/admin/e/[id]` | `task-025-checklist-pre-evento.md` |

**Regra:** P1–P3 antes do casamento #1. P4–P6 desejável, não bloqueante.

---

## 4. NEXT — Após H1 ≥40% (3 casamentos)

| ID | Entrega | Tipo | Dependência |
|---|---|---|---|
| **X1** | Publicar case Operação Casamento (TikTok) | Marketing | N6 + métrica real |
| **X2** | Kit fornecedor completo | Produto | [`kit-fornecedor.md`](./kit-fornecedor.md) |
| **X3** | 20 abordagens cerimonialista | Comercial | X1 |
| **X4** | Experimento CTA install (pós-upload vs entrada) | Produto | Casamentos 2–3 |
| **X5** | Decisão comentários (manter/cortar) | Produto | Métrica O4 no painel |
| **X6** | Concierge WhatsApp "suas fotos" D+3 | Produto/Ops | Opt-in manual, 1 evento |
| **X7** | App loja (EAS production) | Eng | spec 017 — **não antes de H1** |
| **X8** | OAuth Google Drive Production | Eng | spec drive-export |
| **X9** | Fake door / MVP livro export pago | Produto | D+30 pós-evento |

---

## 5. LATER — Escala (Fase 2–3)

| ID | Entrega | Nota |
|---|---|---|
| **L1** | Portal fornecedor + split pagamento | Fase 3 |
| **L2** | Curadoria automática livro (classificação, não geração) | ADR 0007 |
| **L3** | Pack 15 anos — marketing próprio `/15-anos` | Só após case casamento |
| **L4** | ML moderação thumb | Nice-to-have; gate heurístico ok |
| **L5** | WhatsApp Business API entrega individual | Tier 1 produto §7 |

---

## 6. FUTURE — Condicionado (não priorizar)

- Save the date, convite, site, RSVP (Fase 4 — 3 condições produto §8)
- Lista de presentes / fintech
- Feed vertical vídeo estilo TikTok
- Notificações push genéricas
- Agrupamento facial

---

## 7. O que **não** fazer (recusas reafirmadas)

| Ideia | Motivo |
|---|---|
| Feature parity Olhares preço | Race to bottom |
| Site casamento grátis | Perde para incumbents |
| "Nenhum aplicativo" na landing | Contradiz ADR 0009 |
| Comentários em escala antes métrica upload | Custo moderação |
| Tráfego pago noivaa antes case | CAC proibitivo |

---

## 8. Mapa para specs técnicas

Novas specs a criar (quando eng pegar):

| Spec | Origem |
|---|---|
| `task-021-gate-capa-copy.md` | P1 |
| `task-022-fila-falha-visivel.md` | P2 |
| `task-023-copy-moderacao-landing.md` | P3 |
| `task-024-landing-convidado-veterano.md` | P4 |
| `task-025-checklist-pre-evento.md` | P6 |

Specs existentes que **permanecem** na fila eng: 012 (carga), 017 (app), drive-export, 015 (share polish).

---

## 9. Métricas de revisão (retro 48h pós-evento)

1. Participação = `sessoes_com_upload / expected_guests`
2. Maior queda no funil (`qr_scan` → … → `upload_ok`)
3. Verbatim convidados/noivos (3 frases)
4. Incidente telão/moderação (sim/não)
5. Pagaria R$ 199 de novo? (sim/não/por quê)

Template completo: [`experimentos-validacao.md`](./experimentos-validacao.md) § retro.

---

## 10. Changelog

| Data | Mudança |
|---|---|
| 2026-08-29 | Plano criado pós-discovery. Prioriza ops + ajustes copy/UX sobre features novas. |
