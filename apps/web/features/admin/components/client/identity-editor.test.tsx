import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IdentityEditor } from "./identity-editor";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

describe("IdentityEditor, leitura da cor da festa", () => {
  it("com o modelo padrão, informa que o texto sobre a cor se ajusta", () => {
    render(
      <IdentityEditor
        eventId="evento-1"
        packId="casamento"
        initialExpectedGuests={150}
        initialTimezone="America/Sao_Paulo"
        initialIdentityTokens={{}}
        initialTitle="Festa"
      />,
    );
    expect(screen.getByText(/Boa leitura|Contraste baixo/)).toBeInTheDocument();
  });
});
