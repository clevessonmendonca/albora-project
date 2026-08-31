# Task 013 — Landing e conversão

> **Origem:** `albora-landing-planos.md` · [`../product/README.md`](../product/README.md)
> **Depende de:** 002. **Bloqueia o lançamento** — sem porta de entrada não há funil.

## Objetivo

Uma conversão só: **criar um álbum grátis.** Não é orçamento, não é newsletter.

## Escopo

**Entra**

- `/` casamento (herói) · `/15-anos` · `/formatura` — mesmo esqueleto, pack trocado
- Demo ao vivo com QR, levando a um evento de demonstração real
- Preço visível, três planos, âncora antes da tabela
- FAQ com as objeções reais
- CTA fixo no mobile
- Instrumentação separada do funil do evento

**Não entra**

- Blog, SEO de cauda longa, `/fornecedores` (Fase 3)
- Checkout — Pix manual nos dez primeiros

## Contrato

**A copy de moderação é a corrigida**, não a do doc original:

> Por padrão tudo aparece — no dia da festa ninguém vai aprovar fila. O que protege é automático: filtro antes da parede, denúncia por qualquer convidado, e você tira em um toque.

**Os dois itens do plano Completo que ainda não existem** — entrega por WhatsApp e "cada convidado recebe as dele" — aparecem em tom secundário. Se atrasarem, muda uma classe de CSS em vez de a promessa quebrar na frente do cliente.

**Funil próprio:**
```
visita → scroll 50% → demo escaneado → CTA → álbum criado → QR baixado
```
Métrica: `álbuns criados / visitas`. E quanto o demo aumenta a conversão — se for pouco ele desce na página, se for muito sobe para o herói.

## Como se verifica

1. **LCP < 2s em 4G**, num Android antigo
2. A página funciona sem JS até o CTA
3. QR do demo escaneia de um celular e cai num evento real
4. Preço visível sem clique
5. CTA alcançável em qualquer ponto de scroll no mobile
6. Trocar o pack muda vocabulário e acento **sem tocar em componente**
7. Os seis eventos do funil chegam no painel

## Riscos

| Risco | Plano |
|---|---|
| Vídeo do herói derruba o LCP | `poster` estático + `preload=none`; autoplay só depois do LCP |
| Sem prova social no dia 1 | *"Somos novos, seja um dos primeiros e leve de graça."* **Nunca depoimento inventado** — num mercado de boca a boca isso destrói a marca |
