"use client";

import { useRef } from "react";
import { SecondaryButton } from "@albora/ui-web";

type MissionOption = {
  id: string;
  title: string;
  completed: boolean;
};

type CameraStepProps = {
  missions: MissionOption[];
  selectedMission: string | null;
  onCapture: (file: File) => void;
  onSelectMission: (id: string | null) => void;
  onValidationError: (error: string) => void;
};

/**
 * Etapa de captura de câmera.
 * Responsável por input nativo e seleção de missão.
 */
export function CameraStep({
  missions,
  selectedMission,
  onCapture,
  onSelectMission,
  onValidationError,
}: CameraStepProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file) return;

    // Validação básica
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      onValidationError("Arquivo muito grande. Máximo 50MB.");
      return;
    }

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      onValidationError("Tipo de arquivo não suportado.");
      return;
    }

    onCapture(file);
  };

  return (
    <div className="grid gap-4">
      <h2 className="font-titulo text-[1.2rem] font-normal">
        Capture um momento
      </h2>

      {missions.length > 0 && (
        <div className="grid gap-2">
          <label className="text-[0.9rem] text-ink-2">Missão (opcional)</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSelectMission(null)}
              className={`rounded-pilula border px-4 py-2 text-[0.85rem] transition-colors ${
                selectedMission === null
                  ? "border-acento bg-acento text-sobre-acento"
                  : "border-linha bg-transparent text-ink hover:border-acento-texto"
              }`}
            >
              Livre
            </button>
            {missions.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMission(m.id)}
                className={`rounded-pilula border px-4 py-2 text-[0.85rem] transition-colors ${
                  selectedMission === m.id
                    ? "border-acento bg-acento text-sobre-acento"
                    : "border-linha bg-transparent text-ink hover:border-acento-texto"
                }`}
              >
                {m.title} {m.completed && "✓"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files)}
        />
        
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files)}
        />
        
        <input
          ref={galleryRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files)}
        />

        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="min-h-12 cursor-pointer rounded-pilula border-none bg-acento px-6 text-[0.9rem] font-medium text-sobre-acento transition-opacity hover:opacity-90"
        >
          📷 Tirar foto
        </button>

        <SecondaryButton onClick={() => videoRef.current?.click()}>
          🎥 Gravar vídeo
        </SecondaryButton>

        <SecondaryButton onClick={() => galleryRef.current?.click()}>
          🖼️ Escolher da galeria
        </SecondaryButton>
      </div>
    </div>
  );
}
