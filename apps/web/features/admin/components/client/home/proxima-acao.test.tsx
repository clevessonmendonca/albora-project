import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ItemDePreparo } from "@/features/admin/data/load-home-state";
import { ProximaAcao } from "./proxima-acao";

vi.mock("@/features/admin/lib/marcar-preparo", () => ({ marcarPreparo: vi.fn() }));

const previa: ItemDePreparo = {
  chave: "previaConvidado",
  titulo: "Ver como convidado",
  porque: "Entrar como eles entram.",
  feito: false,
  href: "/e/festa?via=link",
  cta: "Abrir prévia",
};

describe("ProximaAcao com a prévia do convidado", () => {
  it("abre a página do convidado em aba nova, não a Home", () => {
    render(<ProximaAcao eventId="ev1" principal={previa} secundarias={[]} />);
    const link = screen.getByRole("link", { name: "Abrir prévia" });
    expect(link).toHaveAttribute("href", "/e/festa?via=link");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
