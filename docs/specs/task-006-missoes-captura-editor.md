# Task 006 — Missões, captura e editor

> **Origem:** [`../flows.md` §3.4 e §3.6](../flows.md) · [ADR 0007](../adr/0007-ai-policy-luts-not-generation.md)
> **Depende de:** 005.

## Objetivo

Fechar o caminho crítico: **cinco toques** do QR à foto no telão.

## Escopo

**Entra**

- Lista de missões do evento, com envio livre como caminho de primeira classe
- Captura via `<input capture>` — câmera nativa, não `getUserMedia`
- Editor: oito filtros paramétricos, intensidade contínua, quatro ajustes
- Filtro recomendado pelos noivos: selo e primeiro lugar, **nunca pré-aplicado**
- Legenda e "onde na festa", **durante o upload**
- Confirmação com a varredura "a foto amanhece"
- CTA de instalação **após a confirmação**, nunca após o envio

**Não entra**

- Vídeo, galeria, reações, recados

## Contrato

**Câmera nativa, não `getUserMedia`.** HDR e modo noturno valem mais que preview de filtro ao vivo — às 22h no escuro é aí que a foto se ganha. O filtro entra depois, sobre a foto boa.

**Filtros são paramétricos**, não strings fixas: sépia, saturação, matiz, brilho, contraste. É o que permite intensidade de 0 a 100. Sete em CSS; o 35 mm em canvas, porque faz o que CSS não faz — ombro nas altas, viés verde nos médios, halação, grão por pixel.

**Zero IA.** Custo zero, offline, e — o que decide — **idêntico nas 3.000 fotos**. IA generativa daria uma interpretação diferente por foto e quebraria a coerência que o produto vende.

**Legenda e lugar custam zero no caminho crítico:** a subida já começou, e os dois botões de saída levam ao mesmo lugar.

**"Onde na festa", nunca GPS.** Lista fechada vinda do pack — pista, mesa, jardim, altar, bar, varanda. Reintroduzir localização pela porta da frente desfaria a remoção de EXIF da 004.

## Como se verifica

1. **Cinco toques** cronometrados, do QR à confirmação
2. Permissão de câmera negada → seletor de arquivos, **sem tela de erro no meio**
3. Editor funciona com a rede desligada
4. Miniatura de cada filtro mostra **a foto do próprio convidado**
5. Recomendado aparece primeiro e com selo, e **não é aplicado sozinho**
6. Missões concluídas → modo livre, não fim de produto
7. CTA de instalação só depois do `confirm`, nunca com item na fila
8. Vídeo no plano grátis: avisado **antes** da captura

## Riscos

| Risco | Plano |
|---|---|
| Oito miniaturas com a foto original travam o aparelho | Reduzir na entrada e usar thumb de 150px na tira. **Já aconteceu no protótipo** |
| Canvas do 35 mm lento em Android antigo | Medir; acima de 1,5s, degradar para aproximação em CSS |
