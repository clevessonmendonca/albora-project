# Guia de Contribuição — Padrões de Código Sênior

> **TL;DR:** SOLID + Clean Architecture + Componentes < 150 linhas

## 🎯 Filosofia

**Código é lido 10x mais que escrito.** Otimize para legibilidade, manutenibilidade e testabilidade — não para "cleverness".

## 📐 Regras de Ouro (Não Negociáveis)

### 1. **Tamanho de Arquivo**
```
Componente:  ≤ 150 linhas
Hook:        ≤ 120 linhas
Service:     ≤ 200 linhas
Util:        ≤ 100 linhas
```

**Se ultrapassar:** Quebre em módulos menores. Se não conseguir, é sinal de responsabilidades misturadas.

### 2. **Um Arquivo = Uma Responsabilidade**
```typescript
// ❌ Ruim: ButtonAba + Deslizante + Chip no mesmo arquivo
// ✅ Bom: button-aba.tsx, deslizante.tsx, chip.tsx
```

### 3. **Separação de Camadas**
```
Presentation (UI)   → Componentes React puros
Application (Hooks) → Orquestração, estado, side-effects
Domain (Services)   → Business logic pura (sem React)
Infrastructure      → DB, API, Storage, Email
```

**Dependências:** `Presentation → Application → Domain → Infrastructure`

### 4. **Props Tipadas, Zero `any`**
```typescript
// ❌ Ruim
export function Button(props: any) { }

// ✅ Bom
type ButtonProps = {
  variant: "primary" | "secondary";
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

export function Button({ variant, onClick, disabled, children }: ButtonProps) { }
```

### 5. **Testes para Lógica de Negócio**
```
Hooks:    100% cobertura
Services: 100% cobertura
Utils:    100% cobertura
UI:       Smoke tests (render sem crash)
```

## 🏗️ Estrutura de Projeto

### Features (Domain-Driven)
```
apps/web/features/
├── feed/
│   ├── components/        # Presentation
│   │   ├── client/       # Client components
│   │   ├── server/       # Server components
│   │   └── ui/           # UI atoms
│   ├── hooks/            # Application (orquestração)
│   ├── services/         # Domain (lógica pura)
│   └── lib/              # Utils específicos do feature
```

### Shared Libraries
```
apps/web/lib/
├── domain/               # Business logic pura
├── infrastructure/       # Integrações externas
├── application/          # Use cases
└── utils/                # Helpers puros
```

## ✅ SOLID na Prática

### **S**ingle Responsibility
```typescript
// ❌ Ruim: faz tudo
function UserProfile({ userId }) {
  const [user, setUser] = useState();
  const [posts, setPosts] = useState();
  
  useEffect(() => { fetchUser(); }, []);
  useEffect(() => { fetchPosts(); }, []);
  
  return <>{/* 300 linhas de JSX */}</>;
}

// ✅ Bom: cada um faz uma coisa
function UserProfile({ userId }) {
  const user = useUser(userId);      // Hook: busca user
  const posts = usePosts(userId);     // Hook: busca posts
  
  return (
    <ProfileLayout>
      <UserInfo user={user} />        // Componente: mostra user
      <PostList posts={posts} />      // Componente: mostra posts
    </ProfileLayout>
  );
}
```

### **O**pen/Closed
```typescript
// ❌ Ruim: precisa modificar para adicionar variant
function Button({ type, ...props }) {
  if (type === "primary") return <button className="btn-primary" {...props} />;
  if (type === "secondary") return <button className="btn-secondary" {...props} />;
}

// ✅ Bom: extensível via props
function Button({ variant = "primary", className, ...props }) {
  return <button className={cn("btn", `btn-${variant}`, className)} {...props} />;
}
```

### **L**iskov Substitution
```typescript
// ✅ Interfaces consistentes
interface PhotoCardProps {
  photo: Photo;
  onClick: (id: string) => void;
}

// Qualquer implementação é substituível
<PhotoCard photo={photo} onClick={handleClick} />
<PhotoCardWithLike photo={photo} onClick={handleClick} />
<PhotoCardCompact photo={photo} onClick={handleClick} />
```

### **I**nterface Segregation
```typescript
// ❌ Ruim: interface gorda
interface EditorProps {
  // Filtros
  presets: Preset[];
  escolhido: Preset | null;
  onEscolhido: (p: Preset) => void;
  // Ajustes
  ajustes: Ajustes;
  onAjustes: (a: Ajustes) => void;
  // Texto
  texto: string;
  onTexto: (t: string) => void;
  // ... 20 props
}

// ✅ Bom: interfaces focadas
<FiltrosTab presets={presets} escolhido={escolhido} onEscolhido={...} />
<AjustesTab ajustes={ajustes} onAjustes={...} />
<TextoTab texto={texto} onTexto={...} />
```

### **D**ependency Inversion
```typescript
// ❌ Ruim: depende de implementação concreta
import { PostgresDB } from "@/lib/db";

function savePhoto(photo: Photo) {
  const db = new PostgresDB();
  return db.insert(photo);
}

// ✅ Bom: depende de abstração
interface PhotoRepository {
  save(photo: Photo): Promise<void>;
}

function savePhoto(photo: Photo, repo: PhotoRepository) {
  return repo.save(photo);
}
```

## 🎨 Padrões de Componente

### Componente Funcional Puro
```typescript
type GreetingProps = {
  name: string;
  showIcon?: boolean;
};

/**
 * Mostra saudação personalizada.
 * @example <Greeting name="Ana" showIcon />
 */
export function Greeting({ name, showIcon = false }: GreetingProps) {
  return (
    <div>
      {showIcon && <span>👋</span>}
      <span>Olá, {name}!</span>
    </div>
  );
}
```

### Hook Customizado
```typescript
type UseCounterReturn = {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
};

/**
 * Gerencia contador com incremento, decremento e reset.
 */
export function useCounter(initialValue = 0): UseCounterReturn {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);

  return { count, increment, decrement, reset };
}
```

### Service (Lógica Pura)
```typescript
/**
 * Service para operações de validação de email.
 * Funções puras, sem dependências externas.
 */

export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function extractDomain(email: string): string | null {
  const parts = email.split("@");
  return parts[1] ?? null;
}
```

## 🧪 Padrões de Teste

### Teste de Hook
```typescript
import { renderHook, act } from "@testing-library/react";
import { useCounter } from "./use-counter";

describe("useCounter", () => {
  it("inicia com valor padrão", () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it("incrementa corretamente", () => {
    const { result } = renderHook(() => useCounter(5));
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(6);
  });
});
```

### Teste de Service
```typescript
import { isValidEmail, normalizeEmail } from "./email-service";

describe("email-service", () => {
  describe("isValidEmail", () => {
    it("aceita email válido", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
    });

    it("rejeita email sem @", () => {
      expect(isValidEmail("userexample.com")).toBe(false);
    });
  });

  describe("normalizeEmail", () => {
    it("converte para lowercase", () => {
      expect(normalizeEmail("User@Example.com")).toBe("user@example.com");
    });
  });
});
```

## 📝 Convenções de Nome

### Arquivos
```
Componente:     button-aba.tsx
Hook:           use-feed-viewer.ts
Service:        feed-service.ts
Teste:          feed-service.test.ts
Tipo:           types.ts
Constante:      constants.ts
```

### Funções/Variáveis
```typescript
// camelCase para funções e variáveis
const userName = "Ana";
function fetchUser() { }

// PascalCase para componentes e tipos
type User = { };
function UserProfile() { }

// UPPER_CASE para constantes
const MAX_RETRIES = 3;
const API_BASE_URL = "https://api.example.com";
```

## 🚫 Anti-Padrões (Evite!)

### God Components
```typescript
// ❌ 500+ linhas, 10+ responsabilidades
function MegaComponent() {
  const [state1, setState1] = useState();
  const [state2, setState2] = useState();
  // ... 15 estados
  
  useEffect(() => { /* 80 linhas */ }, []);
  
  function helper1() { /* 50 linhas */ }
  function helper2() { /* 40 linhas */ }
  
  return <>{/* 300 linhas de JSX */}</>;
}
```

### Prop Drilling
```typescript
// ❌ Props passando por 5 níveis
<Parent user={user}>
  <Child user={user}>
    <GrandChild user={user}>
      <GreatGrandChild user={user}>
        <UseUser user={user} />

// ✅ Context ou Composition
const UserContext = createContext();
<UserProvider value={user}>
  <UseUser />  {/* useContext(UserContext) */}
</UserProvider>
```

### Imports Circulares
```typescript
// ❌ a.ts importa b.ts que importa a.ts
// ✅ Mova código compartilhado para c.ts
```

### Hex Hardcodado
```typescript
// ❌ Cores hardcodadas
<div style={{ color: "#FF5733" }} />

// ✅ Tokens de design
<div className="text-acento" />
```

## 🔍 Code Review Checklist

Antes de abrir PR, verifique:

- [ ] Componentes < 150 linhas
- [ ] Hooks < 120 linhas
- [ ] Services < 200 linhas
- [ ] Zero `any` types
- [ ] Props tipadas com interface
- [ ] Testes para lógica de negócio
- [ ] Zero hex hardcodado
- [ ] Zero comentários óbvios
- [ ] Conventional Commits
- [ ] Lint passa
- [ ] Build passa

## 📚 Leitura Recomendada

1. **Clean Code** — Robert C. Martin
2. **Clean Architecture** — Robert C. Martin
3. **Refactoring** — Martin Fowler
4. **Design Patterns** — Gang of Four
5. **Domain-Driven Design** — Eric Evans

## 🤝 Dúvidas?

Consulte:
- `docs/refactoring/patterns-and-templates.md`
- `docs/refactoring/PLANO-REFATORACAO-GERAL.md`
- PRs de refatoração (#3)

---

**Lembre-se:** Código limpo não é sobre ser inteligente, é sobre ser **claro**. 🎯
