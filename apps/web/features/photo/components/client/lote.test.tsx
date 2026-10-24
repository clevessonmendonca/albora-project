import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Lote, rotuloEnviar } from "./lote";

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:miniatura");
  URL.revokeObjectURL = vi.fn();
});

function arquivos(n: number): File[] {
  return Array.from({ length: n }, (_, i) => new File([`f${i}`], `f${i}.jpg`, { type: "image/jpeg" }));
}

const MOMENTOS = [
  { id: "m1", title: "Primeiro" },
  { id: "m2", title: "Segundo" },
];

function montar(extra: Partial<React.ComponentProps<typeof Lote>> = {}) {
  const onEnviar = vi.fn();
  const onCancelar = vi.fn();
  render(
    <Lote
      arquivos={arquivos(3)}
      excedeu={false}
      momentos={MOMENTOS}
      perguntaDoMomento="Qual momento?"
      onEnviar={onEnviar}
      onCancelar={onCancelar}
      {...extra}
    />,
  );
  return { onEnviar, onCancelar };
}

describe("Lote", () => {
  it("rotula o botão no singular e no plural", () => {
    expect(rotuloEnviar(1)).toBe("Enviar 1 foto");
    expect(rotuloEnviar(8)).toBe("Enviar 8 fotos");
  });

  it("oferece Livre e os momentos que vêm do pack, sem texto fixo de domínio", () => {
    montar();
    expect(screen.getByRole("button", { name: "Livre" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Primeiro" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Segundo" })).toBeTruthy();
  });

  it("envia todos os arquivos com o momento escolhido e a legenda aparada", () => {
    const { onEnviar } = montar();
    fireEvent.click(screen.getByRole("button", { name: "Segundo" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  brinde  " } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar 3 fotos" }));
    expect(onEnviar).toHaveBeenCalledTimes(1);
    const [lote, detalhes] = onEnviar.mock.calls[0]!;
    expect(lote).toHaveLength(3);
    expect(detalhes).toEqual({ legenda: "brinde", lugar: "m2" });
  });

  it("sem escolher nada o lote vai Livre e sem legenda", () => {
    const { onEnviar } = montar();
    fireEvent.click(screen.getByRole("button", { name: "Enviar 3 fotos" }));
    expect(onEnviar.mock.calls[0]![1]).toEqual({ legenda: null, lugar: null });
  });

  it("começa no momento já marcado na câmera", () => {
    const { onEnviar } = montar({ momentoInicial: "m1" });
    fireEvent.click(screen.getByRole("button", { name: "Enviar 3 fotos" }));
    expect(onEnviar.mock.calls[0]![1].lugar).toBe("m1");
  });

  it("tirar uma foto reduz o lote; tirar a última cancela", () => {
    const { onEnviar, onCancelar } = montar({ arquivos: arquivos(2) });
    fireEvent.click(screen.getByRole("button", { name: "Tirar a foto 1 do envio" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar 1 foto" }));
    expect(onEnviar.mock.calls[0]![0]).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Tirar a foto 1 do envio" }));
    expect(onCancelar).toHaveBeenCalled();
  });

  it("avisa quando passou do limite de 8", () => {
    const html = renderToStaticMarkup(
      <Lote
        arquivos={arquivos(8)}
        excedeu
        momentos={[]}
        perguntaDoMomento="?"
        onEnviar={() => {}}
        onCancelar={() => {}}
      />,
    );
    expect(html).toContain("até 8 fotos");
  });
});
