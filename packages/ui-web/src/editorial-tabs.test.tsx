import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorialTabs } from "./editorial-tabs";

describe("EditorialTabs", () => {
  const base = "/admin/eventos/ana-e-joao";
  const items = [
    { label: "Visão geral", suffix: "" },
    { label: "Convidados", suffix: "/convidados" },
    { label: "Missões", suffix: "/missoes" },
  ];

  it("marca só o item ativo e aponta cada href para base + suffix", () => {
    render(<EditorialTabs items={items} active="/convidados" base={base} />);

    const overview = screen.getByRole("link", { name: "Visão geral" });
    const guests = screen.getByRole("link", { name: "Convidados" });
    const missions = screen.getByRole("link", { name: "Missões" });

    expect(guests).toHaveAttribute("aria-current", "page");
    expect(overview).not.toHaveAttribute("aria-current");
    expect(missions).not.toHaveAttribute("aria-current");

    expect(overview).toHaveAttribute("href", `${base}`);
    expect(guests).toHaveAttribute("href", `${base}/convidados`);
    expect(missions).toHaveAttribute("href", `${base}/missoes`);
  });
});
