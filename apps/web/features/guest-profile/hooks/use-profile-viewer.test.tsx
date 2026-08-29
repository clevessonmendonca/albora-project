import React from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useProfileViewer } from "./use-profile-viewer";

describe("useProfileViewer", () => {
  it("abre no índice pedido e fecha restaurando o scroll", () => {
    const { result } = renderHook(() => useProfileViewer());

    act(() => {
      result.current.abrir(4);
    });

    expect(result.current.indice).toBe(4);

    act(() => {
      result.current.fechar();
    });

    expect(result.current.indice).toBeNull();
  });
});
