# Design System — UI Web

Sistema de design consolidado do Albora, usado na web (convidado, admin) e como base para o app mobile.

[README completo com todos os tokens, componentes, padrões de estado, acessibilidade e guias de uso]

## Componentes Consolidados

### Skeleton
```tsx
import { Skeleton, SkeletonCard } from "@albora/ui-web";

<Skeleton className="h-12 w-full" />
<Skeleton variant="circle" width="2.5rem" />
<Skeleton variant="text" lines={3} />
<SkeletonCard /> {/* Post skeleton completo */}
```

### EmptyStateCard
```tsx
import { EmptyStateCard, CameraIcon } from "@albora/ui-web";

<EmptyStateCard
  icon={<CameraIcon size={48} />}
  title="Nenhuma foto ainda"
  description="As fotos compartilhadas aparecerão aqui"
  action={<Button>Tire a primeira foto</Button>}
/>
```

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
