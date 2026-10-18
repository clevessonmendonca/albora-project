import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IdeiasParaSuaFesta } from "./ideias";

describe("IdeiasParaSuaFesta", () => {
  it("leva a missões, identidade e equipe do evento", () => {
    render(<IdeiasParaSuaFesta base="/admin/e/1" />);
    expect(screen.getByRole("link", { name: /Crie uma missão/ })).toHaveAttribute("href", "/admin/e/1/missions");
    expect(screen.getByRole("link", { name: /Personalize o álbum/ })).toHaveAttribute("href", "/admin/e/1/identity");
    expect(screen.getByRole("link", { name: /Convide quem ajuda/ })).toHaveAttribute("href", "/admin/e/1/team");
  });
});
