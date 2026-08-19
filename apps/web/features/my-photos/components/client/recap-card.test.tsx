import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecapCard } from "./recap-card";

describe("RecapCard", () => {
  it("sem recap (ainda carregando ou falhou), não renderiza nada", () => {
    render(<RecapCard recap={null} />);
    expect(screen.queryByText(/Você mandou/)).not.toBeInTheDocument();
  });

  it("com zero fotos, não renderiza nada — não há o que celebrar", () => {
    render(<RecapCard recap={{ fotos: 0, curtidas: 0 }} />);
    expect(screen.queryByText(/Você mandou/)).not.toBeInTheDocument();
  });

  it("uma foto, sem reação, no singular e sem menção a curtida", () => {
    render(<RecapCard recap={{ fotos: 1, curtidas: 0 }} />);
    expect(screen.getByText("Você mandou 1 foto")).toBeInTheDocument();
  });

  it("várias fotos e uma reação, no plural de fotos e singular de curtida", () => {
    render(<RecapCard recap={{ fotos: 5, curtidas: 1 }} />);
    expect(screen.getByText("Você mandou 5 fotos · curtida 1 vez")).toBeInTheDocument();
  });

  it("várias fotos e várias reações, tudo no plural", () => {
    render(<RecapCard recap={{ fotos: 8, curtidas: 23 }} />);
    expect(screen.getByText("Você mandou 8 fotos · curtida 23 vezes")).toBeInTheDocument();
  });
});
