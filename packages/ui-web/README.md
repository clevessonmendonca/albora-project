# Design System — UI Web

Sistema de design consolidado do Albora, usado na web (convidado, admin) e como base para o app mobile.

[README completo com todos os tokens, componentes, padrões de estado, acessibilidade e guias de uso]

## Componentes Consolidados

### EmptyState
```tsx
import { EmptyState } from "@albora/ui-web";

<EmptyState
  title="Nenhuma foto ainda"
  lede="As fotos compartilhadas aparecerão aqui"
  cameraPath="/photo"
  cameraLabel="Tire a primeira foto"
/>
```

Não há componente de skeleton/loading no design system hoje — se uma tela precisar de um estado de carregamento, ele ainda está por construir.

## Motion Tokens

```css
--tempo-instantaneo  /* 150ms — micro-interações rápidas */
--tempo-rapido       /* 300ms — hover, focus, transições padrão */
--tempo              /* 350ms — médio */
--tempo-lento        /* 500ms — transições de tela */
--curva              /* cubic-bezier(0.2, 0, 0, 1) */
```

## Focus-Visible Padrão

```css
:focus-visible {
  outline: 1px solid var(--acento);
  outline-offset: 3px;
}
```

---

Ver `/workspace/DESIGN_SYSTEM_AUDIT.md` para detalhes da auditoria completa.
