# Procedimento — conteúdo ilegal envolvendo menores

> **Status:** rascunho operacional — **revisão jurídica obrigatória antes do 1º evento**
> **Última revisão:** 2026-08-29
> **Origem:** [`spec 011`](../specs/task-011-moderacao.md) · [ADR 0012](../adr/0012-menores-sem-perguntar-idade.md) · [`security.md`](../security.md) §9
> **Não é moderação de festa** — é obrigação legal separada

---

## 1. Escopo

Este procedimento aplica-se quando há **indício ou certeza** de conteúdo que envolve exploração sexual de criança ou adolescente (CSAM), ou outro material ilegal envolvendo menor, em mídia enviada ao Albora.

**Fora do escopo:** foto imprópria entre adultos, nudez consensual, brigas — estes seguem moderação normal (pânico, denúncia, fila de revisão).

---

## 2. Princípios

| Princípio | Detalhe |
|---|---|
| **Preservar** | Não deletar evidência antes de orientação legal |
| **Bloquear acesso** | Remover da galeria, telão e URLs assinadas imediatamente |
| **Não investigar** | Equipe técnica não analisa o conteúdo além do necessário para bloqueio |
| **Escalar cedo** | Acionar fundador + advogado no mesmo dia |
| **Registrar** | Tudo documentado com horário UTC, ator, ações |

---

## 3. Detecção

| Fonte | Ação imediata |
|---|---|
| Denúncia de convidado | Entra na fila; se categoria indicar menor em risco, **escalar** |
| Classificador automático | Sinal de alto risco → segurar telão + galeria + alerta ops |
| Anfitrião / telão | Botão pânico + contato Sea |
| Autoridade / terceiro | Registrar canal e pedido; não destruir dados |

**Sinal de escalada:** qualquer suspeita de CSAM, não apenas confirmação.

---

## 4. Resposta — primeira hora

### 4.1 Quem age

| Papel | Responsabilidade |
|---|---|
| **Ops de plantão** (Sea) | Executar bloqueio técnico, preservar logs, abrir incidente |
| **Fundador** | Decisão de comunicação externa |
| **Advogado** | Orientação sobre comunicação a autoridades e preservação |

### 4.2 Passos técnicos (ordem)

1. **Pânico no evento** — pausa telão (`events.panic = true`).
2. **Ocultar mídia** — status de moderação impede novas URLs (`POST /api/media/urls` recusa).
3. **Não apagar** objeto no R2 nem linhas no Postgres até orientação jurídica.
4. **Congelar sessão** — registrar `guest_session_id`, `upload_id`, `event_id`, timestamp, hash da chave (não logar PII crua).
5. **Revogar URLs** — assinaturas expiram; não reemitir.
6. **Isolar evento** se múltiplos uploads suspeitos — considerar slug rotation após bloqueio.

### 4.3 Passos legais (com advogado)

> Placeholders — preencher após parecer.

| ☐ | Ação | Responsável | Prazo |
|---|---|---|---|
| ☐ | Avaliar comunicação ao **Safernet** / canal nacional | Advogado | |
| ☐ | Avaliar comunicação à **polícia** / MP | Advogado | |
| ☐ | Comunicação ao **anfitrião** (sem compartilhar material) | Fundador | |
| ☐ | Registro interno de incidente LGPD se aplicável | Ops | |

**Referências legais (Brasil):** ECA Art. 18; Marco Civil Art. 21; Lei 8.069; possível dever de comunicação — **confirmar com advogado**.

---

## 5. Preservação de evidência

| Artefato | Onde | Retenção provisória |
|---|---|---|
| Objeto original + thumb | R2 `events/{event_id}/...` | Até orientação legal |
| Metadados upload | Postgres (`uploads`, auditoria) | Idem |
| Logs de acesso | Plataforma / CF | Mínimo exigido pelo advogado |
| Denúncias | Fila moderação | Export seguro, acesso restrito |

**Nunca:** enviar arquivo por WhatsApp, e-mail não criptografado, ou canal público.

---

## 6. Comunicação

### 6.1 Interna

- Canal: **[definir — ex. grupo ops + jurídico]**
- Template: "Incidente ILM-{id} — evento {slug} — mídia bloqueada — preservação ativa — aguardando advogado"

### 6.2 Externa

Somente após orientação jurídica. Anfitrião recebe fatos operacionais, **não** o material.

---

## 7. Pós-incidente

| ☐ | Item |
|---|---|
| ☐ | Retro escrito (48 h) — o que funcionou, gaps |
| ☐ | Atualizar classificador / regras de denúncia se necessário |
| ☐ | Revisar se evento deve ser encerrado antecipadamente |
| ☐ | Arquivar incidente com retenção definida pelo advogado |

---

## 8. Relação com moderação normal

| Situação | Procedimento |
|---|---|
| Foto embaraçosa / nudez adulta | Moderação — pânico, ocultar, fila |
| Menor em foto de festa normal | ADR 0012 — padrões altos, sem identificar idade |
| **Material ilegal com menor** | **Este documento** |

---

## 9. Contatos (preencher antes do 1º evento)

| Função | Nome | Contato |
|---|---|---|
| Ops plantão Sea | | |
| Fundador | | |
| Advogado | | |
| Safernet / canal nacional | https://new.safernet.org.br/denuncie | |

---

## 10. Checklist de prontidão

| ☐ | Item |
|---|---|
| ☐ | Advogado leu e aprovou este procedimento |
| ☐ | Contatos §9 preenchidos |
| ☐ | Ops treinou bloqueio técnico (§4.2) em staging |
| ☐ | Runbook referenciado em [`security.md`](../security.md) §9 |

---

## 11. Changelog

| Data | Mudança |
|---|---|
| 2026-08-29 | Procedimento N5 criado (rascunho pós-discovery) |
