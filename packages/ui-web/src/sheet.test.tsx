import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BottomSheet } from "./sheet";

/**
 * jsdom não implementa o construtor `PointerEvent` (só `window.Event`/`MouseEvent`),
 * então `fireEvent.pointerDown({ clientY })` do testing-library cai no fallback
 * genérico e descarta `clientY` silenciosamente. Disparamos o evento à mão para
 * garantir que os campos que o componente lê (`clientY`, `pointerId`, `timeStamp`)
 * cheguem — `timeStamp` também sobrescrito porque o componente usa o relógio do
 * próprio evento (não `Date.now()`) pra calcular velocidade de arrasto.
 */
function dispararPointer(
  el: Element,
  tipo: string,
  clientY: number,
  { pointerId = 1, timeStamp }: { pointerId?: number; timeStamp?: number } = {},
) {
  const evento = new Event(tipo, { bubbles: true, cancelable: true });
  Object.assign(evento, { clientY, pointerId, isPrimary: true });
  if (timeStamp !== undefined) {
    Object.defineProperty(evento, "timeStamp", { value: timeStamp, configurable: true });
  }
  fireEvent(el, evento);
}

function mockAlturaPainel(altura: number) {
  return vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    height: altura,
    width: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: altura,
    x: 0,
    y: 0,
    toJSON() {
      return {};
    },
  });
}

describe("BottomSheet", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("entra com translateY(100%)→0 na curva de mola", () => {
    render(
      <BottomSheet title="Título" open onClose={() => {}}>
        conteúdo
      </BottomSheet>,
    );
    const painel = screen.getByTestId("bottom-sheet-panel");
    expect(painel.className).toMatch(/starting:translate-y-full/);
    expect(painel.className).toMatch(/translate-y-0\b/);
    expect(painel.className).toMatch(/\bease-mola\b/);
  });

  it("sai na curva de saída quando o dialog entra em estado closing", () => {
    render(
      <BottomSheet title="Título" open onClose={() => {}}>
        conteúdo
      </BottomSheet>,
    );
    const painel = screen.getByTestId("bottom-sheet-panel");
    expect(painel.className).toMatch(/group-data-\[state=closing\]:translate-y-full/);
    expect(painel.className).toMatch(/group-data-\[state=closing\]:ease-saida/);
  });

  it("não introduz blur em nenhuma classe do painel ou do backdrop", () => {
    render(
      <BottomSheet title="Título" open onClose={() => {}}>
        conteúdo
      </BottomSheet>,
    );
    expect(document.body.innerHTML).not.toMatch(/backdrop-blur|backdrop-filter/);
  });

  it("arrastar além de 30% da altura do painel chama onClose", () => {
    mockAlturaPainel(400);
    const onClose = vi.fn();
    render(
      <BottomSheet title="Título" open onClose={onClose}>
        conteúdo
      </BottomSheet>,
    );

    const alca = screen.getByTestId("bottom-sheet-handle");
    // `timeStamp: 0` seria falsy e o getter do React cairia pro
    // `Date.now()` real — por isso a base começa em 1000.
    dispararPointer(alca, "pointerdown", 0, { timeStamp: 1000 });
    dispararPointer(alca, "pointermove", 200, { timeStamp: 1050 });
    dispararPointer(alca, "pointerup", 200, { timeStamp: 1090 });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("arrastar abaixo do limiar não chama onClose e volta à posição", () => {
    mockAlturaPainel(400);
    const onClose = vi.fn();
    render(
      <BottomSheet title="Título" open onClose={onClose}>
        conteúdo
      </BottomSheet>,
    );

    // Um arrasto lento e curto — deltas de tempo explícitos, senão os três
    // eventos (síncronos no teste) cairiam no mesmo instante e um
    // deslocamento pequeno pareceria um "flick" rápido demais.
    const alca = screen.getByTestId("bottom-sheet-handle");
    dispararPointer(alca, "pointerdown", 0, { timeStamp: 1000 });
    dispararPointer(alca, "pointermove", 40, { timeStamp: 1250 });
    dispararPointer(alca, "pointerup", 40, { timeStamp: 1300 });

    expect(onClose).not.toHaveBeenCalled();

    const painel = screen.getByTestId("bottom-sheet-panel");
    expect(painel.style.transform).toBe("");
  });

  it("preserva a API pública (title, open, onClose, children, footer, titleId)", () => {
    render(
      <BottomSheet
        title="Comentários"
        open
        onClose={() => {}}
        titleId="meu-titulo"
        footer={<button type="button">Enviar</button>}
      >
        <p>corpo</p>
      </BottomSheet>,
    );

    expect(screen.getByText("Comentários")).toBeInTheDocument();
    expect(screen.getByText("corpo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
    expect(screen.getByText("Comentários")).toHaveAttribute("id", "meu-titulo");
  });
});
