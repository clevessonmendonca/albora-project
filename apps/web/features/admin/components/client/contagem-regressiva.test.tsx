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
  it("faltando mais de um dia, conta em dias", () => {
    em("2026-06-11T12:00:00Z");

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText(/dias/i)).toBeInTheDocument();
  });

  it("no último dia, conta em horas", () => {
    em("2026-06-01T20:00:00Z");

    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText(/horas/i)).toBeInTheDocument();
  });

  it("já começou: diz isso, não mostra número negativo", () => {
    em("2026-06-01T11:00:00Z");

    expect(screen.queryByText(/-\d/)).not.toBeInTheDocument();
    expect(screen.getByText(/começou/i)).toBeInTheDocument();
  });

  it("não tagarela em leitor de tela", () => {
    em("2026-06-11T12:00:00Z");

    expect(screen.getByRole("timer")).toHaveAttribute("aria-live", "off");
  });
});
