# Runbook — prova física do QR

> **Status:** operacional — bloqueante antes do 1º casamento real
> **Última revisão:** 2026-08-29
> **Público:** anfitrião, cerimonialista, produto Sea
> **Origem:** [`plano-implementacao-produto.md`](../product/plano-implementacao-produto.md) N1 · [`dia-do-evento.md`](./dia-do-evento.md) §3
> **No admin:** `/admin/e/[eventId]/pre-event#prova-qr-fisica` — folha imprimível para registrar resultados

---

## 1. Por quê isto é bloqueante

QR ilegível ou lento = participação zero na primeira hora. Concorrentes vendem "como PIX"; nosso QR precisa funcionar **igual ou melhor** em condições reais de festa: luz baixa, mesa reflexiva, celular com película usada.

**Critério de aprovação:** 3/3 aparelhos scaneiam em ≤5 s a 30 cm, com luz baixa simulando 22 h.

---

## 2. Materiais

| Item | Detalhe |
|---|---|
| Placa A4 | PDF do admin (`/admin/e/[id]/qrcode`) — **impressão da gráfica escolhida**, não só laser de escritório |
| Cards por mesa | Mínimo 2 unidades para teste de superfície |
| 3 celulares | iPhone ≥3 anos · Android entry-level · aparelho com película/tela usada |
| Ambiente | Corredor ou sala com luz fraca (simular salão às 22 h) |
| Cronômetro | Tempo até abrir a capa do evento (`page_open`) |

---

## 3. Procedimento

### 3.1 Preparação

1. Baixar PDF das peças no admin e enviar à gráfica (ou imprimir prova local **antes** da tiragem final).
2. Conferir URL legível abaixo do QR no PDF — é fallback se a câmera falhar.
3. Abrir a folha registrável no admin (`Pré-evento → Prova física do QR`) e imprimir, ou usar a tabela deste runbook.

### 3.2 Matriz de teste

Para **cada** peça (placa A4 + 1 card), testar:

| Aparelho | 15 cm | 30 cm | 45 cm | Luz baixa (30 cm) | Passou? |
|---|---|---|---|---|---|
| iPhone | ☐ ≤5 s | ☐ ≤5 s | ☐ ≤5 s | ☐ ≤5 s | ☐ |
| Android entry | ☐ ≤5 s | ☐ ≤5 s | ☐ ≤5 s | ☐ ≤5 s | ☐ |
| Película usada | ☐ ≤5 s | ☐ ≤5 s | ☐ ≤5 s | ☐ ≤5 s | ☐ |

**Superfícies:** se houver dúvida sobre papel, repetir em matte e glossy.

**Registrar falhas:** anotar aparelho, distância, tipo de papel e sintoma (não abre / abre lento / abre app errado).

### 3.3 O que conta como sucesso

- Câmera nativa (iOS/Android) reconhece o QR **sem** app de terceiros.
- Página do evento abre em HTTPS (produção, não localhost).
- Tempo até a capa visível ≤5 s em 30 cm, luz baixa, nos 3 aparelhos.

---

## 4. Se falhar

| Sintoma | Ação |
|---|---|
| QR não lê | Aumentar contraste no PDF (admin); confirmar tamanho mínimo do módulo |
| Reflexo no glossy | Trocar acabamento para matte ou laminado fosco |
| Só lê de perto | Verificar resolução da impressão (≥300 dpi); não reduzir QR abaixo do tamanho do preview |
| URL manual funciona, QR não | Regenerar peças; abrir ticket interno se persistir em 2 gráficas |
| Abre site errado | Conferir slug do evento antes de imprimir tiragem final |

**Não ir para o casamento sem passar.** Participação na H1 depende disto.

---

## 5. Registro

Preencher e arquivar (WhatsApp interno ou pasta do evento):

- Data da prova
- Responsável (nome)
- Gráfica / tipo de papel
- Resultado: **APROVADO** / **REPROVADO**
- Observações

Modelo imprimível: seção **Prova física do QR** em `/admin/e/[eventId]/pre-event`.

---

## 6. Changelog

| Data | Mudança |
|---|---|
| 2026-08-29 | Runbook N1 criado; folha registrável no admin pré-evento |
