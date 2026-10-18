import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Pessoas } from "./pessoas";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const iso = "2026-09-20T20:00:00.000Z";
const pessoas = [
  { id: "1", nome: "Ana", fotos: 1, entrouEm: iso, primeiraFotoEm: iso, ultimaFotoEm: iso },
  { id: "2", nome: "Maria", fotos: 3, entrouEm: iso, primeiraFotoEm: iso, ultimaFotoEm: iso },
];

it("Descobertas da festa fica num details fechado e a medalha continua na linha", () => {
  const { container } = render(<Pessoas eventoId="e" pessoas={pessoas} />);
  const d = container.querySelector("details") as HTMLDetailsElement;
  expect(d.open).toBe(false);
  expect(d.querySelector("summary")?.textContent).toContain("Descobertas da festa");
  expect(screen.getAllByText("Quem mais registrou").length).toBeGreaterThanOrEqual(2);
});

it("clicar numa descoberta abre o perfil da pessoa", () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ itens: [] }))));
  const { container } = render(<Pessoas eventoId="e" pessoas={pessoas} />);
  const botao = container.querySelector("details button") as HTMLButtonElement;
  fireEvent.click(botao);
  expect(screen.getByRole("button", { name: /Pessoas/ })).toBeInTheDocument();
});
