# Redesign Albora — pacote de entrega (protótipo atualizado em 2026-10-25)

## Como rodar o protótipo
```bash
cd docs/redesign/redesign-completo/prototipo && python3 -m http.server 5180
```
Abra `http://localhost:5180/` (roteador por hash). A alça **Protótipo** na borda esquerda troca fase da festa, papel, estado das listas (carregando/vazio/erro) e tema. Dados fictícios, salvos no `localStorage`. Se a página mostrar versão antiga, recarregue sem cache (`index.html` versiona os scripts com `?v=`).

## Mapa dos documentos
| Doc | Conteúdo |
|---|---|
| `inventario/A,B,C` | inventário de telas e funcionalidades (leitura de código; nada renderizado) |
| `02-diagnostico.md` · `03-benchmark.md` · `04-arquitetura.md` | problemas, referências (sem acesso a Mobbin etc.), nova IA |
| `05-design-system.md` (+ §8 fundamentos revisados) · `08-temas-e-contraste.md` · `09-navegacao.md` | tokens, espaço/tipo/motion, motor de contraste (22 paletas), regras de navegação |
| `06-direcao-de-arte.md` | assets oficiais, âmbar vigente `#D46632`, Opal, composição por superfície |
| `prototipo/matriz-*.md` | matriz de rastreabilidade por módulo (funcionalidade → nova tela → funcional/simulado/integração) |
| `prototipo/auditoria-*.md` | auditoria por tela (10 perguntas + critério emocional + números de lint/auditoria) |
| `prototipo/tools/lint.mjs` · `tools/audit.js` | verificações determinísticas (espaço, tipo, hex, motion · overflow, alvos, contraste) |

## Evidências de validação (executadas)
- `node tools/lint.mjs`: **0** desvios nos 7 módulos (eram 269).
- Auditoria renderizada de 78 rotas (fases antes/durante/depois quando existem) em 320, 360, 390, 430, 768, 1024, 1440 e 1920 px: sem overflow horizontal, sem contraste baixo, sem alvo <44 px relevante, texto ≥12 px. Paisagem 844×390 e 640×360 nas telas dos módulos corrigidos.
- 22 paletas (6 combos + claras/escuras/saturadas/baixa saturação) × 2 chãos passam 3:1 (preenchimento), 4,5:1 (texto) e 4,5:1 (rótulo).

## Limites (não declarar conformidade total)
- **Não verificado:** leitor de tela, teclado virtual real, toque longo em aparelho, zoom 200% abaixo de 320 px, contraste de texto sobre foto (capa), ferramenta externa de WCAG. A auditoria automática não mede texto sobre imagem/gradiente nem pseudo-elementos.
- Fotos do protótipo são ilustrações geradas; QR não escaneia; pagamento, e-mail, WhatsApp, Drive, push e câmera nativa são simulados e rotulados.
- Benchmarking sem Mobbin/Page Flows/Behance/Dribbble; Opal assumido como o app de tempo de tela e foco, avaliado só por texto institucional.
- Pendências de produto/design: ver `prototipo/matriz-*.md` (seções "Lacunas") e `auditoria-*.md`.

## App real (`apps/web`)
**Nada foi alterado em `apps/web` por esta sessão.** O defeito do "Sair" na barra inferior e do logo em texto estava no protótipo (corrigido). Uma sessão separada ("App real: navegação, logo e planos") audita o app real e implementa o que a evidência confirmar; ao pausar, estava aguardando permissão para rodar testes/lint/guards (ver a sessão).


## Continuação — 25/10/2026

Leia [10-continuacao-prototipo.md](10-continuacao-prototipo.md) para as mudanças e evidências mais recentes. O handoff foi atualizado em [HANDOFF.md](HANDOFF.md). O protótipo usa versão de cache 13. As validações históricas acima não substituem os limites e resultados desta passada.
