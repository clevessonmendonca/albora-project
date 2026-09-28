import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContagemRegressiva } from "./contagem-regressiva";

const agora = new Date("2026-06-01T12:00:00Z");

afterEach(() => {
  vi.useRealTimers();
});

function em(iso: string) {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(agora);
  render(<ContagemRegressiva paraISO={iso} />);
}

describe("ContagemRegressiva", () => {
  it("mostra dias, horas, minutos e segundos ao mesmo tempo", () => {
    em("2026-06-11T12:00:00Z");

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText(/dias/i)).toBeInTheDocument();
    expect(screen.getByText(/horas/i)).toBeInTheDocument();
    expect(screen.getByText(/min/i)).toBeInTheDocument();
    expect(screen.getByText(/seg/i)).toBeInTheDocument();
  });

  it("no último dia, horas já aparecem preenchidas", () => {
    em("2026-06-01T20:00:00Z");

    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText(/horas/i)).toBeInTheDocument();
  });

  it("já começou: diz isso, não mostra números", () => {
    em("2026-06-01T11:00:00Z");

    expect(screen.queryByText(/-\d/)).not.toBeInTheDocument();
    expect(screen.queryByRole("timer")).toHaveTextContent(/começou/i);
  });

  it("não tagarela em leitor de tela", () => {
    em("2026-06-11T12:00:00Z");

    expect(screen.getByRole("timer")).toHaveAttribute("aria-live", "off");
  });
});
