import { useReducer, useCallback } from "react";

/**
 * Estados da máquina de fotos.
 * Máquina explícita previne estados inválidos.
 */
export type PhotoState =
  | { step: "camera"; missao: string | null }
  | { step: "editor"; arquivo: File; missao: string | null }
  | { step: "details"; arquivo: File; uploadId: string; missao: string | null }
  | { step: "success"; uploadId: string };

/**
 * Ações possíveis na máquina de fotos.
 */
export type PhotoAction =
  | { type: "CAPTURE"; arquivo: File }
  | { type: "CONFIRM_EDIT" }
  | { type: "CONFIRM_DETAILS"; uploadId: string }
  | { type: "RESTART" }
  | { type: "SELECT_MISSION"; missaoId: string | null };

/**
 * Reducer da máquina de estados de foto.
 * Garante transições válidas entre etapas.
 */
function photoWizardReducer(state: PhotoState, action: PhotoAction): PhotoState {
  switch (action.type) {
    case "CAPTURE":
      // camera → editor
      if (state.step !== "camera") return state;
      return {
        step: "editor",
        arquivo: action.arquivo,
        missao: state.missao,
      };

    case "CONFIRM_EDIT":
      // editor → camera (volta para capturar)
      if (state.step !== "editor") return state;
      return {
        step: "camera",
        missao: state.missao,
      };

    case "CONFIRM_DETAILS":
      // details → success
      if (state.step !== "details") return state;
      return {
        step: "success",
        uploadId: action.uploadId,
      };

    case "RESTART":
      // qualquer → camera
      return {
        step: "camera",
        missao: state.step === "camera" ? state.missao : null,
      };

    case "SELECT_MISSION":
      // Só pode selecionar missão em camera
      if (state.step !== "camera") return state;
      return {
        ...state,
        missao: action.missaoId,
      };

    default:
      return state;
  }
}

/**
 * Hook para gerenciar o wizard de foto com máquina de estados explícita.
 * 
 * Transições válidas:
 * - camera → editor (captura)
 * - editor → camera (volta)
 * - details → success (confirma)
 * - * → camera (restart)
 */
export function usePhotoWizard(initialMission: string | null = null) {
  const [state, dispatch] = useReducer(photoWizardReducer, {
    step: "camera",
    missao: initialMission,
  });

  const capture = useCallback((arquivo: File) => {
    dispatch({ type: "CAPTURE", arquivo });
  }, []);

  const confirmEdit = useCallback(() => {
    dispatch({ type: "CONFIRM_EDIT" });
  }, []);

  const confirmDetails = useCallback((uploadId: string) => {
    dispatch({ type: "CONFIRM_DETAILS", uploadId });
  }, []);

  const restart = useCallback(() => {
    dispatch({ type: "RESTART" });
  }, []);

  const selectMission = useCallback((missaoId: string | null) => {
    dispatch({ type: "SELECT_MISSION", missaoId });
  }, []);

  return {
    state,
    capture,
    confirmEdit,
    confirmDetails,
    restart,
    selectMission,
  };
}
