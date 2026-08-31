# Task 010 — Teste de carga e PWA instalável

> **Origem:** [`../architecture.md` §15](../architecture.md) · [`../flows.md` §3.7](../flows.md)
> **Depende de:** 004 a 009. **Último portão antes do casamento real.**

## Objetivo

Provar que a rajada de sábado não derruba nada — e que o convidado consegue instalar.

## Escopo

**Entra**

- Teste de carga: **150 uploads em 20 minutos**, com rede degradada
- PWA instalável: manifest, ícones do pack, splash
- CTA de instalação nos quatro momentos
- Instrumentação completa do funil
- Painel por evento

**Não entra**

- App nativo, push no iOS, multi-evento

## Contrato

**O funil, instrumentado desde já:**

```
qr_scan → page_open → consent → capture → upload_start → upload_ok
                                              ↓
                                          upload_fail → retry
```

Mais `share`, `install_prompt`, `install_accept`, `install_dismiss`.

**Métrica principal:** `sessões_com_upload / expected_guests`. Sem isso, o casamento termina e não se sabe **onde** a participação se perdeu — e o MVP inteiro terá sido em vão.

**Instalação nunca é lida sozinha**, sempre junto de participação. Instalação subindo com participação caindo é prejuízo.

## Como se verifica

| Prova | Critério |
|---|---|
| 150 uploads em 20 min | Nenhum perdido; p95 dentro do orçamento |
| Metade dos clientes em 3G lento | Fila absorve, nada se perde |
| Neon sob rajada | Sem esgotar conexão — driver serverless faz o trabalho |
| Cota do Workers | Alerta em 60%, não em 100% |
| Instalar no Android | Prompt nativo funciona |
| Instalar no iPhone | **Instrução visual explícita** — não há prompt nativo, e sem instrução metade da base não consegue |
| Ícone e splash | Saem do pack de marca, versão com ponto |
| Funil | Os oito eventos chegam no painel |

O item do iPhone importa mais do que parece: sem instrução, a métrica de instalação vira medida de qual celular a pessoa tem.

## Riscos

| Risco | Plano |
|---|---|
| Cota diária do plano gratuito exaurida na festa | Plano pago desde já, e rate limit **na borda**, antes de consumir cota |
| Ícone com estrela abaixo de 40px | Usar a versão com **ponto** em ícone pequeno — a estrela vira borrão |
| Teste de carga passa em laboratório e falha no salão | Rodar com rede degradada de verdade, não em rede local |

## Definição de pronto

Os três casamentos gratuitos agendados, com direito de gravação negociado — e os números de decisão escritos **antes** de olhar o resultado: ≥40% valida · 25–40% mexe em fricção, não em feature · <25% para.
