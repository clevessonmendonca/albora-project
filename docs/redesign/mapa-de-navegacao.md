# Mapa de navegação — protótipos × rotas do produto

Rotas do protótipo vêm do bundle `Albora-*-Prototipo` (hash) e da série `v3/v4` (telas). Rotas do produto vêm de `apps/web/app`.

## Criação

| Protótipo | Produto |
|---|---|
| `#criar/boas-vindas` | landing (fora do escopo); entrada em `/admin/new` |
| `#criar/conta`, `#criar/confirmar` | `/admin/sign-in`, `/auth/google/*` (conta real) |
| `#criar/tipo` · v3 passo 1 | `/admin/new`, etapa Tipo |
| `#criar/detalhes` · v3 passo 1 | etapa Detalhes |
| `#criar/identidade` · v3 passo 2 | etapa Identidade |
| `#criar/participacao` | etapa Participação |
| `#criar/revisar` | etapa Revisão |
| `#criar/pronto` · v3 passo 3 | `ReadyStep` (mesma página) |
| `#criar/convite` | `/admin/e/[id]/qrcode` |
| Meus eventos | `/admin` |

## Painel

| Protótipo | Produto |
|---|---|
| `#inicio` / Início | `/admin/e/[id]` |
| `#ao-vivo` / Dia do evento (alias `#telao`) | `/admin/e/[id]/ao-vivo` |
| `#convidados` | `/admin/e/[id]/guests` |
| `#album` / Fotos | `/admin/e/[id]/album` (absorve `/moderation`) |
| `#missoes` | `/admin/e/[id]/identity` (absorve `/missions`) |
| `#insights` | `/admin/e/[id]/guests` (absorve `/insights`) |
| `#comunidade` | `/admin/e/[id]/comunidade` |
| `#inspiracao` | `/admin/e/[id]/inspiracao` |
| `#identidade` / Aparência | `/admin/e/[id]/identity` |
| `#convite` / Compartilhar & QR | `/admin/e/[id]/qrcode` |
| `#configuracoes`, Equipe, Privacidade | `/admin/e/[id]/evento` (absorve `/consent`, `/team`) |

## Convidado

| Protótipo (`#convidado/…`) | Produto (`/e/[slug]/…`) |
|---|---|
| `entrada`, `boas-vindas` | `/e/[slug]` |
| `primeira-foto` | `/e/[slug]` (nome e consentimento) e `/photo` |
| `enviar`, `editar`, `publicar`, `sucesso` | `/photo` |
| `inicio` | `/feed` |
| `album` | `/album` |
| `missoes` | `/missions` |
| `recado` | `/api/recado`, `/guestbook` |
| `meu-espaco` | `/my-photos`, `/g/[autorId]` |
| `compartilhar` | `/api/share` |
| Estados do `resolverSlug` | `/e/[slug]`, `/scan`, `/g/[token]` |

## Telão e pós-evento

| Protótipo | Produto |
|---|---|
| Pareamento por código (`telao-v4`) | `/wall-pair` |
| Telão em tela cheia | `/wall-display` |
| Prévia do telão no Dia do evento | `/admin/e/[id]/ao-vivo` |
| Reviver, entrega, retenção (`posevento-v1`) | `/admin/e/[id]` na fase "depois", `/album`, export, `book/pdf`, cápsula |
| Centro de fotos (`fotos-v1`) | `/admin/e/[id]/album` |

## Console

`console-v2/v3` → `/console/(shell)/{accounts,audit,events,lgpd,retention,security,subscriptions,support}`.
