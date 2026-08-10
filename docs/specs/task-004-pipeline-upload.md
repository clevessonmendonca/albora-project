# Task 004 — Pipeline de upload ponta a ponta

> **Origem:** [`../architecture.md` §5](../architecture.md) · [`../flows.md` §3.5](../flows.md)
> **Depende de:** 003. **É o caminho crítico do produto.**

## Objetivo

Uma foto sair do celular e chegar no R2 **com a rede caindo no meio**, sem o servidor tocar nos bytes.

## Escopo

**Entra**

- Processamento no cliente: redimensionar (2500px grátis / 3500px pago), reencode, **remover EXIF**, gerar thumb
- Fila em IndexedDB como fonte da verdade
- `POST /api/uploads/presign` → dois PUT presigned, chave derivada no servidor
- PUT direto no R2
- `POST /api/uploads/confirm` → valida e persiste
- Retry com backoff; Background Sync onde existir
- Job assíncrono que **re-remove EXIF** depois do confirm

**Não entra**

- Missões, sessão, telão, moderação
- Vídeo — entra depois, é o gate do plano pago

## Contrato

```
presign  { mime, bytes, w, h } → { full, thumb, key, uploadId }
confirm  { uploadId, key, w, h }  → 200 | 409 (idempotente)
```

**Cinco invariantes**

1. A **chave é derivada no servidor** a partir do `event_id` da sessão. O cliente nunca a informa
2. `confirm` **valida, não confia**: HEAD no objeto, chave pertence ao evento, dimensões batem, magic bytes conferem
3. `confirm` é **idempotente** por `uploadId` — retry é o caminho normal, não a exceção
4. Rate limit **antes** do presign. Circuito no portão, não na saída
5. TTL curto, teto de tamanho e tipo restrito embutidos na assinatura

## Como se verifica

| Prova | Critério |
|---|---|
| Foto de 4 MB do celular | Chega no R2 comprimida, sem EXIF |
| Rede desligada no meio do PUT | Item volta para a fila e sobe quando religa |
| Aba fechada com fila pendente | Sobe na reabertura (ou sozinho no Android) |
| `confirm` chamado duas vezes | Uma linha só |
| `confirm` com chave de outro evento | Recusado |
| "JPEG" que é HTML | Recusado nos magic bytes |
| Log do Worker durante o PUT | **Zero bytes de mídia** passaram pelo servidor |
| iPhone fotografando em HEIC | Convertido para JPEG antes de subir |

O HEIC não é caso de borda: é o padrão do iOS, e sem conversão um pedaço grande do acervo não abre na galeria nem no telão.

## Riscos

| Risco | Plano |
|---|---|
| Android antigo sem memória para canvas em 3500px | Degradar resolução por aparelho, não falhar |
| Quota de IndexedDB estourada | Detectar, avisar e subir na hora em vez de enfileirar (N6.6) |
| Aba anônima sem IndexedDB | Detectar na entrada e avisar que fechar perde o pendente (N6.7) |

---

## Rate limit — decidido em 2026-08-10

**Duas camadas, porque nenhuma sozinha serve.**

A grossa é a do **Cloudflare**, configurada no painel. Durável, distribuída, e a única que segura enchente vinda de fora. Decisão do mantenedor: usar o padrão da plataforma em vez de construir Durable Object.

A fina é por sessão, em memória, na aplicação. Ela existe por um motivo específico deste produto: **a regra do Cloudflare conta por IP, e num casamento os 200 convidados estão no mesmo WiFi**, atrás de um IP só. Uma regra de borda apertada o bastante para conter um abusador estrangularia a festa inteira como se fosse uma pessoa — e o sintoma seria "o Albora parou de funcionar às 22h", justamente no pico.

Então: a regra do Cloudflare fica **generosa, dimensionada para o salão inteiro**; a da aplicação é a que dá justiça **entre convidados**, contando por sessão. Ela não segura ataque distribuído, e não precisa.

**A configurar no painel antes do primeiro evento:** regra em `/api/uploads/presign` com teto compatível com 200 convidados subindo em rajada — a referência é o teste de carga da task 012, 150 uploads em 20 minutos, com folga para o pico da hora da dança.
