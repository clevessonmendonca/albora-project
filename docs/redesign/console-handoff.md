# Handoff — implementação do Console CEO

## Base correta

Implementar a partir da branch `feat/ceo-backoffice`, disponível localmente e em `origin`. É nessa branch que vivem:

- `apps/web/app/console/**`;
- capabilities e autorização;
- reautenticação;
- `audit_log` append-only e `security_events`;
- DSAR;
- impersonação com segunda aprovação;
- retenção em modo somente leitura.

Criar uma branch de implementação em um worktree dedicado. O worktree chamado `ceo-backoffice` já existe, mas está ocupado em `chore/dependabot-target-stable`; não reutilizar esse checkout sem resolver o estado da branch.

## Referências

- Especificação: [`console.md`](./console.md)
- Protótipo visual: [`prototipos/console.html`](./prototipos/console.html)
- Protótipo v5: commit `ba458c69`, na branch `codex/console-redesign-v5`

O commit `ba458c69` contém somente a referência visual. Ele não contém `app/console/` e não deve ser usado como base de código. Não portar o JavaScript do protótipo.

## Regra de implementação

O redesign é uma camada de UI/UX sobre o backend existente. Cada ação deve chamar o comando correspondente em `packages/application/src/**` via `executeCommand`. A autorização, a auditoria e a reautenticação devem continuar dentro do fluxo do comando.

Não confundir as superfícies:

- `apps/web/app/console/**`: Console CEO/staff, alvo deste trabalho;
- `apps/web/app/admin/**`: área do anfitrião;
- `apps/web/app/ops/**`: console antigo.

## Escopo visual do v5

Implementar a linguagem do protótipo sem copiar sua lógica:

- dashboard atenção-primeiro;
- tema claro como padrão; dark mode é opcional e deve respeitar os tokens e invariantes do produto;
- logo oficial;
- menu lateral recolhível;
- perfil com Conta, Preferências e Sessões;
- estado “Tudo em dia” sem uma seção vazia;
- tooltips informativos, foco por teclado, estados acessíveis e reduced motion.

## Net-new

As telas e ações abaixo só podem sair do protótipo quando houver comando, capability e auditoria correspondentes:

- tela Equipe (`/console/staff`, hoje um link morto);
- tela Sistema;
- revogar sessão;
- bloquear IP;
- abrir incidente.

## Invariantes

- PII mascarada por padrão;
- retenção somente leitura;
- auditoria append-only;
- tema claro fixo no produto; dark mode só entra se o escopo de produto aprovar;
- leitura cross-evento somente via `albora_agregador`/`BYPASSRLS`;
- mutações com `SET LOCAL`;
- gates de CI de isolamento e tokens permanecem bloqueantes;
- zero hex em estilos da aplicação.

## Validação

Antes de abrir o PR:

1. confirmar que a branch parte de `feat/ceo-backoffice`;
2. validar isolamento cross-evento e tokens;
3. testar estados claro, responsivo, vazio, erro, loading e permissão negada;
4. verificar que toda ação sensível aparece na auditoria;
5. executar os gates de CI específicos do Console.
