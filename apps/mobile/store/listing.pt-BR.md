# Ficha — App Store / Google Play (pt-BR)

> Rascunho para task 017. Ajuste antes de `eas submit`.

## Metadados

| Campo | Valor sugerido |
|-------|----------------|
| **Nome** | Albora |
| **Subtítulo (iOS)** | Fotos da festa, juntos |
| **Bundle ID** | `app.albora.guest` |
| **Package (Android)** | `app.albora.guest` |
| **Categoria** | Fotografia / Estilo de vida |
| **Classificação** | 4+ / Livre |
| **Preço** | Grátis |

## Descrição curta (Play, 80 chars)

Tire, veja e compartilhe as fotos do casamento — sem login, só o QR da mesa.

## Descrição longa

O Albora é o app dos convidados na festa. Depois da primeira foto pela web, continue
no celular: câmera nativa, filtros do casamento, feed, reações e compartilhar nas
redes — tudo dentro do evento, sem criar conta.

- Entrada pelo QR da mesa (mesma sessão da web)
- Upload mesmo offline (fila sincroniza depois)
- Molduras de compartilhar com a identidade visual do casamento
- Sem anúncios, sem compra in-app

Quem paga é o casal; o convidado nunca paga.

## Palavras-chave (iOS, 100 chars)

casamento,fotos,festa,convidados,álbum,memórias,casal,recepção

## URL de privacidade

`https://albora.app/privacidade` (alias EN: `/privacy` → 308).

Página em `apps/web/app/privacidade/page.tsx` — obrigatória no submit das lojas.

## Capturas necessárias

| Plataforma | Tamanhos |
|------------|----------|
| iPhone | 6.7", 6.5", 5.5" (mínimo 3 telas: câmera, feed, minhas) |
| Android | Phone + feature graphic 1024×500 |

Gerar a partir de dev client em festa-demo — ver [`docs/runbooks/publicacao-lojas.md`](../runbooks/publicacao-lojas.md).

## Notas de revisão (Apple)

> App para convidados de eventos privados. Login não existe — sessão anônima por QR.
> Câmera e galeria só para enviar fotos ao álbum do evento.
> Política de privacidade: https://albora.app/privacidade

## Data safety (Google Play) — rascunho

| Dado | Coletado? | Compartilhado? | Propósito |
|------|-----------|----------------|-----------|
| Fotos/vídeos | Sim (enviados pelo usuário) | Com outros convidados do mesmo evento + anfitrião | Funcionalidade do app |
| Nome | Sim (primeiro nome) | No evento | Atribuição |
| Local aproximado (EXIF) | Não — removido no upload | — | — |
| Conta / e-mail do convidado | Não | — | — |
| Compra in-app | Não | — | — |

Criptografia em trânsito: HTTPS. Exclusão: Minhas + retenção ~365 dias nos servidores Albora.