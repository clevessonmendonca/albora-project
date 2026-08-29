# Runbook — dia do evento

> **Status:** operacional — usar no 1º casamento real e iterar
> **Última revisão:** 2026-08-29
> **Público:** anfitrião, cerimonialista, MC, suporte Albora
> **Complementa:** [`../flows.md`](../flows.md) · [`plano-implementacao-produto.md`](../plano-implementacao-produto.md) N1/N7

---

## 1. Objetivo

Maximizar **participação na primeira hora** e **zero incidente no telão**, sem exigir operação Sea no salão.

**Meta interna (não prometer ao cliente):** ≥30% `qr_scan` de `expected_guests` na 1ª hora após anúncio.

---

## 2. Checklist — 7 dias antes

| ✓ | Item | Como verificar |
|---|---|---|
| ☐ | Peças impressas (placa A4 + cards por mesa) | PDF do admin baixado |
| ☐ | **Prova QR** — 3 celulares, luz baixa, 15–45cm | Ver §3 abaixo |
| ☐ | Plano pago se telão/ZIP/vídeo | `plan=celebration` no admin |
| ☐ | `expected_guests` preenchido | Painel convidados |
| ☐ | Missões escolhidas (8–12) | Editor missões |
| ☐ | Identidade (cores/fonte) aplicada | Preview peças |
| ☐ | Gate de interação configurado | Padrão: após cerimônia |
| ☐ | "Há menores" ligado se aplicável | ADR 0012 |
| ☐ | Telão pareado e testado 10 min | `/wall-display` + cache |
| ☐ | MC/cerimonialista tem roteiro §5 | PDF ou WhatsApp |
| ☐ | HTTPS produção testado | Captura + fila em celular real |

---

## 3. Prova física do QR (bloqueante)

**Por quê:** QR ilegível = participação zero. Concorrente Olhares vende "como PIX" — nosso QR precisa funcionar igual ou melhor.

### Procedimento

1. Imprimir **1 placa A4** e **2 cards** na gráfica escolhida (não só laser de escritório).
2. Testar com **3 aparelhos:**
   - iPhone ≥3 anos
   - Android entry-level
   - Aparelho com película/tela usada
3. Condições:
   - Distâncias: 15 cm, 30 cm, 45 cm
   - Luz: ambiente escuro simulando 22h (corredor com luz fraca)
   - Superfícies: matte e glossy se houver dúvida
4. Registrar:
   - Tempo até `page_open`
   - Falhas (qual aparelho / qual papel)
5. **Passa** se 3/3 aparelhos scaneiam em ≤5s em 30 cm com luz baixa.

### Se falhar

- Aumentar contraste QR no PDF (admin)
- URL legível como fallback abaixo do QR
- Trocar papel (evitar glossy reflexivo)
- Não ir para o casamento sem passar

---

## 4. Checklist — dia D (anfitrião)

### Manhã / montagem

| ✓ | Item |
|---|---|
| ☐ | Placas nas mesas (centro ou tent card, **não só entrada**) |
| ☐ | Cards de missão visíveis |
| ☐ | Telão ligado, `/wall-display` fullscreen, rede estável |
| ☐ | Moderação: fila revisão vazia ou equipe designada |

### Antes do jantar / pista (anúncio)

| ✓ | Item |
|---|---|
| ☐ | MC lê roteiro §5 (≤45s) |
| ☐ | Primeiro `qr_scan` observado (opcional: contador no telão) |

### Durante festa

| ✓ | Item |
|---|---|
| ☐ | Olhar painel participação 1×/hora (`/admin/e/[id]/guests`) |
| ☐ | Se foto inadequada no telão: pânico ou ocultar (<5s) |
| ☐ | Após cerimônia: **liberar gate** interação se ainda fechado |

### Encerramento

| ✓ | Item |
|---|---|
| ☐ | Avisar convidados: fotos continuam subindo offline |
| ☐ | CTA instalar (já no produto após 1ª foto) — não forçar |

---

## 5. Roteiro microfone (MC)

### Versão A — padrão (~40s)

> "Galera, uma coisa rápida: tem QR Code na mesa. Não precisa baixar nada — é igual PIX. Aponta a câmera, tira uma foto da festa e manda. As fotos aparecem lá no telão. Tem missões nos cards — quem participar ajuda a contar a história da festa. Vamos encher esse álbum juntos?"

**Se plano grátis (sem telão):** omitir "aparecem no telão" → substituir por "caem num álbum de todo mundo".

**Se gate fechado:** não mencionar feed/stories/comentários.

### Versão B — missão única (~20s)

> "Missão número um: foto com quem veio com você na mesa. QR na mesa, trinta segundos. Valendo."

### Versão C — reforço meia-noite (~15s)

> "Quem ainda não mandou foto — QR na mesa, trinta segundos, sem app. A gente quer ver a pista agora."

---

## 6. Troubleshooting no salão

| Sintoma | Causa provável | Ação |
|---|---|---|
| QR não lê | Contraste/papel/luz | URL legível manual; trocar placa reserva |
| "Foto não sobe" | Rede fraca | Normal — fila sobe depois; pedir manter app aberto 30s |
| Telão parou | Rede | Cache 50 continua; reconectar WiFi |
| Foto ruim no telão | Moderação | Pânico → ocultar → fila revisão |
| Convidado pede app | Opcional | CTA após 1ª foto; nunca obrigatório |

**Suporte:** canal acordado com casal (WhatsApp Sea) — **não** expor no telão.

---

## 7. Pós-evento (D+1)

1. Enviar mensagem noivos com link acervo + contagem fotos (template branding §4.8)
2. Retro 48h — [`experimentos-validacao.md`](../product/experimentos-validacao.md) § retro
3. Publicar clip TikTok se autorizado

---

## 8. Changelog

| Data | Mudança |
|---|---|
| 2026-08-29 | Runbook criado pós-discovery produto |
