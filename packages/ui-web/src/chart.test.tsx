import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarChart, Donut, Sparkline } from "./chart";

describe("gráficos", () => {
  it("Sparkline exige aria-label", () => {
    const { getByRole } = render(<Sparkline points={[{ label: "a", value: 1 }]} label="Séries de teste" />);
    expect(getByRole("img", { name: "Séries de teste" })).toBeInTheDocument();
  });

  it("série vazia não quebra o Sparkline", () => {
    expect(() => render(<Sparkline points={[]} label="Vazio" />)).not.toThrow();
  });

  it("BarChart e Donut também exigem aria-label", () => {
    const { getByRole: getBar } = render(<BarChart points={[{ label: "a", value: 3 }]} label="Barras" />);
    expect(getBar("img", { name: "Barras" })).toBeInTheDocument();

    const { getByRole: getDonut } = render(<Donut points={[{ label: "a", value: 3 }]} label="Donut" />);
    expect(getDonut("img", { name: "Donut" })).toBeInTheDocument();
  });

  it("série vazia não quebra o BarChart", () => {
    expect(() => render(<BarChart points={[]} label="Vazio" />)).not.toThrow();
  });

  it("Donut com total zero não quebra", () => {
    expect(() => render(<Donut points={[{ label: "a", value: 0 }]} label="Zero" />)).not.toThrow();
  });

  it("Donut com série vazia não quebra", () => {
    expect(() => render(<Donut points={[]} label="Vazio" />)).not.toThrow();
  });
});
