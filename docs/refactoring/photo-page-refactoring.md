# Refatoração Detalhada — PhotoPage (596 linhas → ~180 linhas)

> **Componente:** `apps/web/features/photo/components/client/photo-page.tsx`  
> **Linhas atuais:** 596  
> **Complexidade:** Muito Alta (máquina de estados + câmera + editor + fila)  
> **Prazo:** 4-5 dias  
> **⚠️ CAMINHO CRÍTICO — H1 depende disto**

---

## 1. Análise do Problema

### 1.1 Máquina de Estados Implícita

```typescript
// ❌ Problema: Estado espalhado em múltiplos useState
type Etapa =
  | { nome: "camera" }
  | { nome: "editor"; arquivo: File }
  | { nome: "detalhes"; uploadId: string; arquivo: File }
  | { nome: "pronto"; arquivo: File };

const [etapa, setEtapa] = useState<Etapa>({ nome: "camera" });
const [missions, setMissions] = useState(initialMissions);
const [escolhida, setEscolhida] = useState<string | null>(null);
const [lugarPre, setLugarPre] = useState<string | null>(null);
const [recentes, setRecentes] = useState<string[]>([]);
const [enviadas, setEnviadas] = useState(0);
const [drenando, setDrenando] = useState(false);

// + 3 refs de HTMLInputElement
// + lógica de transição espalhada em callbacks
```

**Problema:** Transições de estado não são explícitas e podem levar a estados inválidos.

### 1.2 Responsabilidades Misturadas

```typescript
PhotoPage() {
  // 1. Gerenciamento de upload (fila + presign + confirm)
  const { estado, enfileirarFoto, anotar, drenarAgora } = useUpload();
  
  // 2. PWA install flow
  const { disponivel, instalar, dispensar } = usePwaInstall();
  
  // 3. Controle de inputs nativos (câmera, vídeo, rolo)
  const entradaCamera = useRef<HTMLInputElement>(null);
  
  // 4. Máquina de estados do wizard
  const [etapa, setEtapa] = useState<Etapa>();
  
  // 5. Gerenciamento de missões
  const [missions, setMissions] = useState();
  
  // 6. Lógica de drenagem da fila
  useEffect(() => { /* 80 linhas */ }, []);
  
  // 7. Cleanup de URLs de preview
  useEffect(() => { /* revoke URLs */ }, []);
  
  // 8. Renderização condicional complexa
  return <>{/* 400+ linhas de JSX */}</>;
}
```

---

## 2. Estratégia de Quebra

### 2.1 Máquina de Estados Explícita

```typescript
// ✅ Usar XState ou useReducer para máquina explícita
type PhotoState =
  | { type: "CAMERA"; missaoSelecionada: string | null }
  | { type: "EDITING"; arquivo: File; missao: string | null }
  | { type: "DETAILS"; arquivo: File; uploadId: string }
  | { type: "UPLOADING"; arquivo: File }
  | { type: "SUCCESS"; uploadId: string }
  | { type: "ERROR"; erro: string };

type PhotoAction =
  | { type: "CAPTURE"; arquivo: File }
  | { type: "EDIT" }
  | { type: "CONFIRM_EDIT"; filtro: FiltroAplicado }
  | { type: "ADD_DETAILS"; legenda?: string; lugar?: string }
  | { type: "UPLOAD_SUCCESS"; uploadId: string }
  | { type: "UPLOAD_ERROR"; erro: string }
  | { type: "RESTART" };
```

### 2.2 Arquitetura Alvo

```
PhotoPage (180 linhas)                  ← Orquestrador
├── PhotoWizard                         ← Container da máquina
│   ├── CameraStep                      ← Etapa 1: Captura
│   │   ├── CameraView                  ← Input nativo
│   │   └── MissionSelector             ← Seletor de missão
│   ├── EditorStep                      ← Etapa 2: Edição
│   │   ├── EditorCanvas                ← Canvas de preview
│   │   ├── FilterStrip                 ← Tira de filtros
│   │   └── EditorControls              ← Controles (quebrado)
│   ├── DetailsStep                     ← Etapa 3: Legenda/Lugar
│   │   ├── CaptionInput
│   │   └── PlaceSelector
│   └── SuccessStep                     ← Etapa 4: Confirmação
│       ├── UploadArc                   ← Progresso
│       └── PwaInstallCta               ← CTA de instalação
├── QueuePanel                          ← Fila lateral
└── AppOpenCta                          ← CTA para abrir app
```

### 2.3 Separação de Serviços

```typescript
// Serviços extraídos
CameraService          // Captura + validação de arquivo
EditorService          // Processamento + filtros
UploadService          // Fila + presign + confirm
MissionService         // Missões + progresso
```

---

## 3. Implementação Passo a Passo

### Passo 1 — Máquina de Estados (1 dia)

**Novo arquivo:** `hooks/use-photo-wizard.ts`

```typescript
import { useReducer, useCallback } from 'react';

type PhotoState =
  | { step: "camera"; missao: string | null }
  | { step: "editor"; arquivo: File; missao: string | null }
  | { step: "details"; arquivo: File; uploadId: string; missao: string | null }
  | { step: "success"; uploadId: string };

type PhotoAction =
  | { type: "CAPTURE"; arquivo: File }
  | { type: "CONFIRM_EDIT" }
  | { type: "CONFIRM_DETAILS"; uploadId: string }
  | { type: "RESTART" }
  | { type: "SELECT_MISSION"; missaoId: string | null };

function photoWizardReducer(
  state: PhotoState,
  action: PhotoAction
): PhotoState {
  switch (state.step) {
    case "camera":
      if (action.type === "CAPTURE") {
        return {
          step: "editor",
          arquivo: action.arquivo,
          missao: state.missao,
        };
      }
      if (action.type === "SELECT_MISSION") {
        return { ...state, missao: action.missaoId };
      }
      return state;
      
    case "editor":
      if (action.type === "CONFIRM_EDIT") {
        // Arquivo já está processado, ir para detalhes
        return {
          step: "details",
          arquivo: state.arquivo,
          uploadId: "", // Será preenchido pelo upload
          missao: state.missao,
        };
      }
      return state;
      
    case "details":
      if (action.type === "CONFIRM_DETAILS") {
        return {
          step: "success",
          uploadId: action.uploadId,
        };
      }
      return state;
      
    case "success":
      if (action.type === "RESTART") {
        return { step: "camera", missao: null };
      }
      return state;
      
    default:
      return state;
  }
}

export function usePhotoWizard(initialMission: string | null = null) {
  const [state, dispatch] = useReducer(photoWizardReducer, {
    step: "camera",
    missao: initialMission,
  });
  
  const capturar = useCallback((arquivo: File) => {
    dispatch({ type: "CAPTURE", arquivo });
  }, []);
  
  const confirmarEdicao = useCallback(() => {
    dispatch({ type: "CONFIRM_EDIT" });
  }, []);
  
  const confirmarDetalhes = useCallback((uploadId: string) => {
    dispatch({ type: "CONFIRM_DETAILS", uploadId });
  }, []);
  
  const recomecar = useCallback(() => {
    dispatch({ type: "RESTART" });
  }, []);
  
  const selecionarMissao = useCallback((missaoId: string | null) => {
    dispatch({ type: "SELECT_MISSION", missaoId });
  }, []);
  
  return {
    state,
    capturar,
    confirmarEdicao,
    confirmarDetalhes,
    recomecar,
    selecionarMissao,
  };
}
```

**Testes:**

```typescript
// use-photo-wizard.test.ts
describe('usePhotoWizard', () => {
  it('inicia na etapa de câmera', () => {
    const { result } = renderHook(() => usePhotoWizard());
    expect(result.current.state.step).toBe('camera');
  });
  
  it('transita para editor ao capturar', () => {
    const { result } = renderHook(() => usePhotoWizard());
    const arquivo = new File([''], 'test.jpg', { type: 'image/jpeg' });
    
    act(() => result.current.capturar(arquivo));
    
    expect(result.current.state.step).toBe('editor');
    expect(result.current.state).toHaveProperty('arquivo', arquivo);
  });
  
  it('mantém missão selecionada através das etapas', () => {
    const { result } = renderHook(() => usePhotoWizard('missao-123'));
    
    const arquivo = new File([''], 'test.jpg', { type: 'image/jpeg' });
    act(() => result.current.capturar(arquivo));
    
    expect(result.current.state.step).toBe('editor');
    expect(result.current.state.missao).toBe('missao-123');
  });
});
```

### Passo 2 — Extrair Steps (1.5 dias)

**a) CameraStep** (~100 linhas)

```typescript
// components/steps/camera-step.tsx
type CameraStepProps = {
  missions: PhotoMission[];
  missaoSelecionada: string | null;
  onCapture: (arquivo: File) => void;
  onSelectMission: (id: string | null) => void;
  forceVideo?: boolean;
  videoQuota: CotaVideo;
};

export function CameraStep({
  missions,
  missaoSelecionada,
  onCapture,
  onSelectMission,
  forceVideo,
  videoQuota,
}: CameraStepProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const roloRef = useRef<HTMLInputElement>(null);
  
  const abrirCamera = () => cameraRef.current?.click();
  const abrirVideo = () => videoRef.current?.click();
  const abrirRolo = () => roloRef.current?.click();
  
  const handleCapture = (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    
    // Validação (HEIC, cota de vídeo, etc.)
    if (isVideoBytes(arquivo) && !videoQuota.podeEnviar) {
      // Mostrar erro de cota
      return;
    }
    
    onCapture(arquivo);
  };
  
  return (
    <div className="flex flex-col h-full">
      <MissionSelector
        missions={missions}
        selected={missaoSelecionada}
        onSelect={onSelectMission}
      />
      
      <CameraView
        onOpenCamera={abrirCamera}
        onOpenVideo={forceVideo ? abrirVideo : undefined}
        onOpenGallery={abrirRolo}
      />
      
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />
      
      {/* inputs de vídeo e rolo */}
    </div>
  );
}
```

**b) EditorStep** (~150 linhas)

```typescript
// components/steps/editor-step.tsx
type EditorStepProps = {
  arquivo: File;
  recommendedFilter: string | null;
  onConfirm: (resultado: EditResult) => void;
  onCancel: () => void;
};

type EditResult = {
  arquivoProcessado: File;
  filtro: FiltroAplicado | null;
  thumb: Blob;
};

export function EditorStep({
  arquivo,
  recommendedFilter,
  onConfirm,
  onCancel,
}: EditorStepProps) {
  const [filtroAtual, setFiltroAtual] = useState<string | null>(null);
  const [ajustes, setAjustes] = useState<Ajustes>(ajustesPadrao);
  const [processando, setProcessando] = useState(false);
  
  const handleConfirm = async () => {
    setProcessando(true);
    
    try {
      const resultado = await processarImagem(arquivo, filtroAtual, ajustes);
      onConfirm(resultado);
    } catch (erro) {
      // Tratar erro
    } finally {
      setProcessando(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <EditorCanvas arquivo={arquivo} filtro={filtroAtual} ajustes={ajustes} />
      
      <FilterStrip
        filters={FILTROS_DISPONIVEIS}
        selected={filtroAtual}
        recommended={recommendedFilter}
        onSelect={setFiltroAtual}
      />
      
      <EditorToolbar
        ajustes={ajustes}
        onChangeAjustes={setAjustes}
        onConfirm={handleConfirm}
        onCancel={onCancel}
        processando={processando}
      />
    </div>
  );
}
```

**c) DetailsStep** (~80 linhas)

```typescript
// components/steps/details-step.tsx
type DetailsStepProps = {
  places: Place[];
  placeQuestion: string;
  onConfirm: (details: PhotoDetails) => void;
  onSkip: () => void;
};

type PhotoDetails = {
  legenda?: string;
  lugar?: string;
};

export function DetailsStep({
  places,
  placeQuestion,
  onConfirm,
  onSkip,
}: DetailsStepProps) {
  const [legenda, setLegenda] = useState('');
  const [lugar, setLugar] = useState<string>();
  
  const handleConfirm = () => {
    onConfirm({
      legenda: legenda.trim() || undefined,
      lugar,
    });
  };
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <CaptionInput
        value={legenda}
        onChange={setLegenda}
        maxLength={280}
      />
      
      <PlaceSelector
        places={places}
        selected={lugar}
        onSelect={setLugar}
        question={placeQuestion}
      />
      
      <div className="flex gap-2">
        <SecondaryButton onClick={onSkip}>Pular</SecondaryButton>
        <PrimaryButton onClick={handleConfirm}>Enviar</PrimaryButton>
      </div>
    </div>
  );
}
```

**d) SuccessStep** (~60 linhas)

```typescript
// components/steps/success-step.tsx
type SuccessStepProps = {
  uploadId: string;
  onContinue: () => void;
  onViewFeed: () => void;
  showPwaPrompt: boolean;
  onInstallPwa: () => void;
};

export function SuccessStep({
  uploadId,
  onContinue,
  onViewFeed,
  showPwaPrompt,
  onInstallPwa,
}: SuccessStepProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <UploadArc complete />
      
      <h2 className="text-2xl font-display mt-4">
        Foto enviada! 📸
      </h2>
      
      <p className="text-ink-3 mt-2 text-center">
        Sua foto amanhece no álbum e no telão
      </p>
      
      {showPwaPrompt && (
        <PwaInstallCta onInstall={onInstallPwa} className="mt-6" />
      )}
      
      <div className="flex gap-2 mt-6">
        <SecondaryButton onClick={onViewFeed}>
          Ver feed
        </SecondaryButton>
        <PrimaryButton onClick={onContinue}>
          Tirar outra
        </PrimaryButton>
      </div>
    </div>
  );
}
```

### Passo 3 — Refatorar PhotoPage (1 dia)

```typescript
// photo-page.tsx (~180 linhas)
export function PhotoPage({
  slug,
  eventoId,
  plan,
  videoQuota,
  missions: initialMissions,
  places,
  copy,
  recommendedFilter,
  initialMission,
  // ...outros props
}: PhotoPageProps) {
  const router = useRouter();
  const base = `/e/${encodeURIComponent(slug)}`;
  
  // Máquina de estados do wizard
  const wizard = usePhotoWizard(initialMission);
  
  // Upload
  const { estado: uploadEstado, enfileirarFoto, anotar } = useUpload(eventoId, {
    plano: plan,
    cotaVideo: videoQuota,
  });
  
  // PWA
  const pwa = usePwaInstall();
  const mostrarPwa = deveMostrarCtaPwa(
    pwa.disponivel,
    pwa.jaInstalado,
    pwa.dispensado,
    uploadEstado.filaVazia
  );
  
  // Handlers
  const handleCapture = useCallback((arquivo: File) => {
    wizard.capturar(arquivo);
  }, [wizard]);
  
  const handleConfirmEdit = useCallback(async (resultado: EditResult) => {
    const uploadId = await enfileirarFoto({
      arquivo: resultado.arquivoProcessado,
      thumb: resultado.thumb,
      filtro: resultado.filtro,
      missaoId: wizard.state.step === 'editor' ? wizard.state.missao : null,
    });
    
    wizard.confirmarEdicao();
    // Navegar para detalhes ou sucesso
  }, [wizard, enfileirarFoto]);
  
  const handleConfirmDetails = useCallback(async (details: PhotoDetails) => {
    // Anotar legenda/lugar no upload
    if (wizard.state.step === 'details') {
      await anotar(wizard.state.uploadId, details.legenda, details.lugar);
      wizard.confirmarDetalhes(wizard.state.uploadId);
    }
  }, [wizard, anotar]);
  
  // Renderização por etapa
  return (
    <GuestShell>
      <QueueHeader estado={uploadEstado} base={base} />
      
      <GuestMain>
        {wizard.state.step === 'camera' && (
          <CameraStep
            missions={initialMissions}
            missaoSelecionada={wizard.state.missao}
            onCapture={handleCapture}
            onSelectMission={wizard.selecionarMissao}
            videoQuota={videoQuota}
          />
        )}
        
        {wizard.state.step === 'editor' && (
          <EditorStep
            arquivo={wizard.state.arquivo}
            recommendedFilter={recommendedFilter}
            onConfirm={handleConfirmEdit}
            onCancel={wizard.recomecar}
          />
        )}
        
        {wizard.state.step === 'details' && (
          <DetailsStep
            places={places}
            placeQuestion={copy.placeQuestion}
            onConfirm={handleConfirmDetails}
            onSkip={() => wizard.confirmarDetalhes(wizard.state.uploadId)}
          />
        )}
        
        {wizard.state.step === 'success' && (
          <SuccessStep
            uploadId={wizard.state.uploadId}
            onContinue={wizard.recomecar}
            onViewFeed={() => router.push(`${base}/feed`)}
            showPwaPrompt={mostrarPwa}
            onInstallPwa={pwa.instalar}
          />
        )}
      </GuestMain>
      
      <AppOpenCta eventoId={eventoId} sessaoId={sessaoId} />
    </GuestShell>
  );
}
```

**Resultado:**
- PhotoPage: 596 → **~180 linhas** ✅
- Máquina de estados: Explícita e testável
- Cada step: Isolado e reutilizável

### Passo 4 — Quebrar EditorControls (607 linhas) (1 dia)

```typescript
// Hoje: editor-controls.tsx (607 linhas)

// Alvo: 6 componentes
├── filter-strip.tsx         (80 linhas)   ← Tira de filtros
├── adjustment-panel.tsx     (100 linhas)  ← Luz/Calor/Contraste
├── intensity-slider.tsx     (60 linhas)   ← Slider de intensidade
├── crop-tool.tsx           (100 linhas)  ← Ferramenta de corte
├── editor-toolbar.tsx      (80 linhas)   ← Barra de ações
└── editor-controls.tsx     (150 linhas)  ← Orquestrador
```

Ver detalhes em arquivo separado: `editor-controls-refactoring.md`

---

## 4. Estrutura Final de Arquivos

```
features/photo/
├── components/
│   ├── steps/                        # Steps do wizard
│   │   ├── camera-step.tsx           (100 linhas)
│   │   ├── editor-step.tsx           (150 linhas)
│   │   ├── details-step.tsx          (80 linhas)
│   │   └── success-step.tsx          (60 linhas)
│   ├── camera/                       # Componentes de câmera
│   │   ├── camera-view.tsx           (já existe)
│   │   └── mission-selector.tsx      (60 linhas)
│   ├── editor/                       # Componentes de editor
│   │   ├── editor-canvas.tsx         (já existe)
│   │   ├── filter-strip.tsx          (80 linhas)
│   │   ├── adjustment-panel.tsx      (100 linhas)
│   │   ├── editor-toolbar.tsx        (80 linhas)
│   │   └── editor-controls.tsx       (150 linhas) ← refatorado
│   ├── details/                      # Detalhes
│   │   ├── caption-input.tsx         (50 linhas)
│   │   └── place-selector.tsx        (70 linhas)
│   ├── queue/                        # Fila
│   │   ├── queue-panel.tsx           (já existe)
│   │   └── upload-arc.tsx            (já existe)
│   └── pages/
│       └── photo-page.tsx            (180 linhas) ✅
├── hooks/
│   ├── use-photo-wizard.ts           (120 linhas) ← novo
│   ├── use-upload.ts                 (já existe)
│   └── use-pwa-install.ts            (já existe)
├── services/                         # Novo
│   ├── camera.service.ts             (80 linhas)
│   ├── editor.service.ts             (150 linhas)
│   └── upload.service.ts             (200 linhas)
└── lib/
    └── image-processor.ts            (já existe)
```

---

## 5. Testes

### 5.1 Testes Unitários

```typescript
// use-photo-wizard.test.ts (já descrito)

// camera-step.test.tsx
describe('CameraStep', () => {
  it('abre câmera nativa ao clicar', () => {});
  it('valida cota de vídeo', () => {});
  it('seleciona missão', () => {});
});

// editor-step.test.tsx
describe('EditorStep', () => {
  it('aplica filtro na preview', () => {});
  it('processa imagem ao confirmar', () => {});
  it('cancela e volta para câmera', () => {});
});

// details-step.test.tsx
describe('DetailsStep', () => {
  it('valida legenda com 280 chars', () => {});
  it('seleciona lugar', () => {});
  it('permite pular detalhes', () => {});
});
```

### 5.2 Testes de Integração

```typescript
// photo-page.integration.test.tsx
describe('PhotoPage Integration', () => {
  it('fluxo completo: captura → edita → detalhes → sucesso', async () => {
    render(<PhotoPage {...props} />);
    
    // Capturar
    const arquivo = new File([''], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Camera'), { target: { files: [arquivo] } });
    
    // Aguardar editor
    await waitFor(() => expect(screen.getByText('Filtros')).toBeInTheDocument());
    
    // Confirmar edição
    fireEvent.click(screen.getByText('Avançar'));
    
    // Aguardar detalhes
    await waitFor(() => expect(screen.getByPlaceholderText('Legenda')).toBeInTheDocument());
    
    // Confirmar detalhes
    fireEvent.change(screen.getByPlaceholderText('Legenda'), { target: { value: 'Teste' } });
    fireEvent.click(screen.getByText('Enviar'));
    
    // Aguardar sucesso
    await waitFor(() => expect(screen.getByText('Foto enviada!')).toBeInTheDocument());
  });
});
```

---

## 6. Checklist de Execução

- [ ] **Dia 1**
  - [ ] Criar branch `refactor/photo-page`
  - [ ] Implementar `usePhotoWizard` com testes
  - [ ] Commit: `refactor(photo): máquina de estados do wizard`

- [ ] **Dia 2**
  - [ ] Extrair CameraStep e EditorStep
  - [ ] Testes unitários dos steps
  - [ ] Commit: `refactor(photo): extrair CameraStep e EditorStep`

- [ ] **Dia 3**
  - [ ] Extrair DetailsStep e SuccessStep
  - [ ] Testes unitários
  - [ ] Commit: `refactor(photo): extrair DetailsStep e SuccessStep`

- [ ] **Dia 4**
  - [ ] Refatorar PhotoPage usando steps
  - [ ] Testes de integração
  - [ ] Commit: `refactor(photo): PhotoPage usando wizard`

- [ ] **Dia 5**
  - [ ] Quebrar EditorControls (607→150 linhas)
  - [ ] Verificar guards, lint, typecheck
  - [ ] PR: `refactor(photo): PhotoPage de 596→180 linhas`

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Quebrar fila offline | **Alta** | **Crítico** | Testes E2E com IndexedDB mock; teste manual em mobile |
| EXIF não removido | Média | Crítico | Guard no CI; teste com foto real com GPS |
| PWA install quebrado | Média | Alto | Testar em iOS e Android |
| Performance regredir | Baixa | Médio | Lighthouse CI; comparar bundle size |

⚠️ **ATENÇÃO:** Este é o **caminho crítico da H1**. Toda refatoração deve manter testes de carga passando (150 uploads/20min).

---

## 8. Próximos Passos

Após esta refatoração:

1. **Aplicar padrão em AlbumPage** se > 200 linhas
2. **Service Layer** para upload/camera/editor
3. **Storybook** para catálogo de components

---

**Status:** Pronto para executar  
**Aprovação necessária:** **SIM** (caminho crítico)  
**Impacto em produção:** Nenhum (refatoração pura, mas precisa de teste manual extensivo)
