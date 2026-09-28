import React from "react";
import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContagemRegressiva } from "./contagem-regressiva";

/**
 * A contagem só existe depois de montar — servidor e cliente nunca concordam
 * sobre "agora", e renderizar no servidor produziria um número que o primeiro
 * tick desmente.
 */
describe("contagem até a festa", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("mostra dias, horas, minutos e segundos quando a festa é futura", () => {
    const agora = new Date("2026-09-27T12:00:00Z");
    vi.setSystemTime(agora);
    const festa = new Date(agora.getTime() + (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000);

    render(<ContagemRegressiva comecaEm={festa.toISOString()} />);
    act(() => void vi.advanceTimersByTime(0));

    expect(screen.getByLabelText("Contagem até a festa")).toBeTruthy();
    for (const rotulo of ["dias", "horas", "min", "seg"]) {
      expect(screen.getByText(rotulo)).toBeTruthy();
    }
    expect(screen.getByText("02")).toBeTruthy();
    expect(screen.getByText("03")).toBeTruthy();
  });

  it("anda sozinha", () => {
    const agora = new Date("2026-09-27T12:00:00Z");
    vi.setSystemTime(agora);
    const festa = new Date(agora.getTime() + 90_000);

    render(<ContagemRegressiva comecaEm={festa.toISOString()} />);
    act(() => void vi.advanceTimersByTime(0));
    expect(screen.getAllByText("30").length).toBeGreaterThan(0);

    // `advanceTimersByTime` move o relógio virtual junto — 5s depois restam 85s.
    act(() => void vi.advanceTimersByTime(5000));
    expect(screen.getAllByText("25").length).toBeGreaterThan(0);
  });

  it("some quando a festa já começou — ali a contagem não diz nada", () => {
    const agora = new Date("2026-09-27T12:00:00Z");
    vi.setSystemTime(agora);
    const { container } = render(
      <ContagemRegressiva comecaEm={new Date(agora.getTime() - 1000).toISOString()} />,
    );
    act(() => void vi.advanceTimersByTime(0));
    expect(container.textContent).toBe("");
  });
});
