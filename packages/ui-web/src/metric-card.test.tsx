import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetricCard } from "./metric-card";

describe("MetricCard", () => {
  it("delta carrega seta e sinal, não só cor", () => {
    const { getByText } = render(
      <MetricCard rotulo="Uploads" valor="112" valorNumerico={112} anterior={100} bomQuando="sobe" janela="Últimos 7 dias" />,
    );
    expect(getByText("↑ +12%")).toBeInTheDocument();
    expect(getByText("Últimos 7 dias · antes: 100")).toBeInTheDocument();
  });

  it("bomQuando 'desce' com delta positivo pinta como ruim", () => {
    const { getByText } = render(
      <MetricCard rotulo="Tickets abertos" valor="55" valorNumerico={55} anterior={40} bomQuando="desce" janela="Este mês" />,
    );
    const pilula = getByText("↑ +38%");
    expect(pilula).toHaveStyle({ color: "var(--critico)" });
  });

  it("bomQuando 'desce' com delta negativo pinta como bom", () => {
    const { getByText } = render(
      <MetricCard rotulo="Tickets abertos" valor="30" valorNumerico={30} anterior={40} bomQuando="desce" janela="Este mês" />,
    );
    const pilula = getByText("↓ -25%");
    expect(pilula).toHaveStyle({ color: "var(--acento)" });
  });

  it("sem base anterior renderiza — e não inventa tendência", () => {
    const { getByText } = render(
      <MetricCard rotulo="Uploads" valor="112" valorNumerico={112} bomQuando="sobe" janela="Últimos 7 dias" />,
    );
    expect(getByText("—")).toBeInTheDocument();
    expect(getByText("Últimos 7 dias · sem período anterior")).toBeInTheDocument();
  });

  it("não quebra quando o valor anterior é zero", () => {
    expect(() =>
      render(<MetricCard rotulo="Novo indicador" valor="5" valorNumerico={5} anterior={0} bomQuando="sobe" janela="Este mês" />),
    ).not.toThrow();
  });
});
