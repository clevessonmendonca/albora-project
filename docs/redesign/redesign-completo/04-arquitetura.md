# 04 · Nova arquitetura de informação

Princípio: **o painel acompanha a fase da festa.** O anfitrião não navega um sistema; ele responde "o que eu faço agora?".

## 1. Anfitrião — de 9 destinos para 5

```
Hoje        (era: Início + Ao vivo + Pré-evento + Pós-evento)   — muda conforme a fase
Fotos       (era: Fotos/Álbum + Moderação)                      — um lugar, revisar é um filtro
Convidados  (era: Convidados + Insights)                        — lista + números
Estilo      (era: Experiência/Identidade + Missões + Recado)    — o jeito da sua festa
Compartilhar(era: Compartilhar/QR + Telão pareamento + peças)   — convite, QR, telão
───────────
Conta ▾     Ajustes do evento · Equipe · Privacidade/Consentimento · Exportar · Plano e cobrança · Ajuda · Tema · Sair
Explorar    Comunidade · Inspiração  (rodapé do menu e na Home como "Ideias para sua festa")
⌘K          Busca global e comandos
```

### Por que 5
- Os 4 primeiros do menu atual já eram o fluxo real (Início, Ao vivo, Fotos, Convidados); "Ao vivo" deixa de ser destino e vira **modo da Hoje** que liga sozinho na hora da festa (e pode ser fixado).
- Experiência + Compartilhar eram telas "sem rail"; viram destinos com rail.
- Ajustes (11 cartões) sai do eixo principal: é consulta rara. Fica no menu da conta, com subseções.
- Comunidade/Inspiração (Fase de descoberta) ficam acessíveis mas não competem com a operação.

### Hoje — três fases, uma ação primária
| Fase | Primária | Secundárias |
|---|---|---|
| **Antes** (preparando) | "Próximo passo" (checklist guiado: capa → convite → telão → missões → equipe) | Contagem regressiva, Ver como convidado, Ideias |
| **Durante** (ao vivo) | Painel de acompanhamento: fotos chegando, fila de revisão, controles do telão, botão **Pausar tudo** (com confirmação) | Convidados ativos, ritmo por hora, abrir telão |
| **Depois** | "Reviver": entrega, álbum final, exportar para nuvem (dia 330), apagar (dia 365) | Livro PDF, agradecimento, relatório |

Papel `couple` entra em "Acompanhar" (só leitura + aprovações), `owner/planner` têm tudo.

## 2. Convidado — 3 abas + câmera (mantém o que já funciona)

```
[Explorar]  [ ◉ Câmera ]  [Missões]  [Perfil]
```
- Entrada: capa do evento → nome → consentimento versionado → câmera. **Ordem inviolável.**
- Gate de interação (feed/reação/comentário) definido pelo casal: antes dele, Explorar mostra o telão espelhado e a fila própria.
- Menu "⋯" único por foto: Denunciar · Bloquear · Remover (se minha) · Compartilhar.
- Perfil: Minhas fotos, Meu consentimento (revogar), Instalar app (pareamento 4 dígitos), Recado, Música.

## 3. Telão
Pareamento por código ou link de uso único → tela cheia (4 modelos, sem corte vertical) → controles remotos no painel (**Compartilhar › Telão**).

## 4. Fornecedor (white-label)
`Eventos · Clientes/Equipe · Marca · Cobrança · Insights`. Portal público `/f/[slug]`.

## 5. Console (staff interno)
Sidebar densa por domínio: `Contas · Eventos · Assinaturas · Suporte · Auditoria · LGPD · Retenção · Segurança`. ⌘K, filtros reais, ação perigosa com reauth.

## 6. Fluxos redesenhados (ponta a ponta)

| Fluxo | Hoje (cliques/telas) | Proposto |
|---|---|---|
| Criar evento | 5 etapas + Pronto + painel p/ QR | **3 passos** (Tipo+nome → Data/local → Estilo) + Pronto *com QR e link inline*; missões/participação ficam com defaults e editáveis depois |
| Convidar | Home → Compartilhar (rail some) → baixar | Botão **Convidar** fixo no cabeçalho do evento → sheet com link, QR, WhatsApp, baixar placa |
| Moderar | Ao vivo ou Fotos (duas filas iguais) | Fotos › filtro "Revisar" (com badge no menu); atalhos A/R/Z; desfazer |
| Ligar telão | Compartilhar › código ou link | Compartilhar › Telão: 2 métodos lado a lado, status "conectado" visível |
| Pós-festa | espalhado | Hoje › Depois › Reviver |
| Convidado 1ª foto | QR → nome → consentimento → câmera → confirmação | idem, com tela única nome+consentimento e recompensa na confirmação |

## 7. Responsividade
- ≥1024: rail 232px + conteúdo máx 1040px; prévia lateral nos editores.
- 640–1023: rail recolhido em ícones.
- ≤900: barra inferior com 4 destinos (Hoje, Fotos, Convidados, Estilo) + "Mais" (Compartilhar, Comunidade, Inspiração, Ajustes, Ajuda); o botão **Convidar** fica no topo; modais viram bottom-sheets.
