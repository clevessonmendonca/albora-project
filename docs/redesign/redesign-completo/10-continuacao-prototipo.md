# Continuação do protótipo — 25/10/2026

Escopo: evolução do protótipo existente; preservadas identidade, marca, paleta e rotas. Base: os cinco textos anexados pelo usuário e os handoffs. Não foram alterados `apps/web`, regras comerciais, preços ou integrações do produto real.

## Diagnóstico e mudanças

| Tela/componente | Problema confirmado | Fundamento | Correção | Estado |
|---|---|---|---|---|
| Fotos no celular | Busca e ordenação ocupavam espaço antes das fotos | Hick; divulgação progressiva; prioridade ao conteúdo | Disclosure nativo fechado no celular, aberto no desktop; filtros continuam visíveis | Implementado e testado |
| Hoje/antes em paisagem | Próxima ação ficava abaixo da primeira tela | Fitts; hierarquia; ergonomia | Contagem e próximo passo lado a lado em baixa altura | Implementado e inspecionado |
| Equipe e clientes | Ausência de busca/ordenação | Reconhecimento; eficiência de uso | Busca local sem acentos, ordenação A–Z/Z–A e recuperação de resultado vazio | Implementado e testado |
| Ajustes do fornecedor | Formulário extenso e sem navegação entre seções | Proximidade; orientação; prevenção de erros | Seções acessíveis com foco programático e largura de leitura contida | Implementado e testado |
| Rascunho de ajustes | Navegar antes de salvar perdia edição | Controle e liberdade; prevenção de perda de dados | Rascunho apenas em memória da aba, indicador, aviso de saída/reload, descarte confirmado e limpeza ao salvar/sair | Navegação, salvamento e descarte testados; diálogo nativo de fechamento depende do navegador |
| Copiar link | Sucesso anunciado mesmo em falha da API | Visibilidade do estado; recuperação | Sucesso apenas após copiar; alternativa com endereço selecionado | Falha simulada testada |
| Consentimento | Texto confundia demonstração com exclusão/aviso reais | Transparência; consentimento explícito | Identificação de dados locais e integrações ausentes; aceite continua desmarcado | Fluxo de termo e foco testados; sem parecer jurídico |
| Botão do fornecedor | Hover no escuro clareava fundo e reduzia contraste a 4,02:1 | Legibilidade e consistência de tokens | Hover mantém preenchimento/rótulo e usa sublinhado | Reprovado na primeira rodada, aprovado na confirmação |

## Evidências desta sessão

- Lint determinístico: **0 ocorrências** nos sete módulos.
- Detector Impeccable: **0 achados** nos alvos alterados (`[]`). Isso não substitui inspeção visual.
- **42 combinações de tela/viewport/tema**: seis rotas em 320×740, 390×844, 768×1024, 1440×1000, 844×390, 640×360; mais as seis rotas no tema escuro a 390×844.
- Na rodada final: **0 erros JavaScript, 0 overflow horizontal, 0 contrastes reprovados pelo auditor, 0 alvos menores que 44 px reportados**.
- Seis grupos de testes funcionais concluídos: fotos; pessoas; ajustes; clipboard; estados de carregamento/vazio/erro; consentimento/foco.
- Capturas antes/depois e resultado detalhado: [`prototipo/evidencias/`](prototipo/evidencias/). Em Fotos a primeira imagem passou de aproximadamente y=428 para y=351 em 390×844, sem remover filtros.
- O auditor também registra `.sr-only` como texto cortado (ocultação intencional para tecnologia assistiva) e o nome do evento truncado no rail. Não são afirmações de ausência de toda truncagem.
- Script reproduzível: [`prototipo/tools/verificar-continuacao.mjs`](prototipo/tools/verificar-continuacao.mjs). Requer Node, Playwright do repositório, Chrome e servidor estático na porta 5180. Usa contexto de navegador isolado; não apaga os dados do navegador do usuário.

## Qualidade visual e limites

A marca oficial e os tokens foram preservados. Fotos ganham espaço; a contagem mantém o arco da identidade; os formulários continuam tipográficos, sem uma grade artificial de cartões. O portal do fornecedor permanece utilitário e sem mascote. Não foram acrescentadas animações ornamentais.

A galeria ainda usa **ilustrações geométricas herdadas**, não fotografias. Essa limitação prejudica a avaliação emocional do álbum e permanece aberta; não apresentá-las como fotos reais ou material final de campanha. A entrada do convidado usa monograma, por isso contraste sobre fotografia não foi validado.

Impeccable foi lida e aplicada. Não foram encontradas skills Emil Kowalski ou Taste nos diretórios consultados; nenhuma instalação foi feita. O CLI anunciou versão nova, mas a versão carregada foi mantida nesta sessão.

Leitor de tela, teclado virtual em aparelho, zoom extremo, recuperação após encerramento da aba, backend, pagamentos, segurança, direitos/licenças, regularização empresarial, parecer LGPD e produção audiovisual Hyperframe continuam fora desta validação. Os anexos orientam essas frentes, mas este avanço não as declara concluídas.
