import React from "react";

globalThis.React = React;

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@albora/ui-web", () => ({
  BottomSheet: ({
    open,
    children,
    footer,
    title,
    titleId,
  }: {
    open: boolean;
    children: React.ReactNode;
    footer?: React.ReactNode;
    title: string;
    titleId?: string;
  }) =>
    open ? (
      <div role="dialog" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        <div>{children}</div>
        {footer}
      </div>
    ) : null,
  PrimaryButton: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  SecondaryButton: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

import { ReportSheet } from "./report-sheet";

const BASE_PROPS = {
  open: true,
  onClose: vi.fn(),
  uploadId: "upload-abc",
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ReportSheet", () => {
  it("renders radio buttons for each report kind", () => {
    render(<ReportSheet {...BASE_PROPS} />);

    expect(screen.getByRole("radio", { name: /Esta foto não deveria estar no evento/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Sou eu nessa foto/ })).toBeInTheDocument();
  });

  it("hides 'aparece_na_foto' when minha is true", () => {
    render(<ReportSheet {...BASE_PROPS} minha />);

    expect(screen.getByRole("radio", { name: /Esta foto não deveria estar no evento/ })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Sou eu nessa foto/ })).not.toBeInTheDocument();
  });

  it("shows motivo textarea when 'ofensivo' is selected", () => {
    render(<ReportSheet {...BASE_PROPS} />);

    expect(screen.queryByLabelText(/Motivo/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Esta foto não deveria estar no evento/ }));

    expect(screen.getByLabelText(/Motivo/)).toBeInTheDocument();
  });

  it("shows motivo textarea when 'aparece_na_foto' is selected", () => {
    render(<ReportSheet {...BASE_PROPS} />);

    fireEvent.click(screen.getByRole("radio", { name: /Sou eu nessa foto/ }));

    expect(screen.getByLabelText(/Motivo/)).toBeInTheDocument();
  });

  it("sends motivo trimmed in the payload", async () => {
    render(<ReportSheet {...BASE_PROPS} />);

    fireEvent.click(screen.getByRole("radio", { name: /Esta foto não deveria estar no evento/ }));
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: "  texto com espaços  " } });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar denúncia/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body).toEqual({
      uploadId: "upload-abc",
      kind: "ofensivo",
      motivo: "texto com espaços",
    });
  });

  it("sends motivo as undefined when textarea is empty", async () => {
    render(<ReportSheet {...BASE_PROPS} />);

    fireEvent.click(screen.getByRole("radio", { name: /Esta foto não deveria estar no evento/ }));
    fireEvent.click(screen.getByRole("button", { name: /Confirmar denúncia/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.motivo).toBeUndefined();
  });

  it("shows confirmation message after successful report", async () => {
    render(<ReportSheet {...BASE_PROPS} />);

    fireEvent.click(screen.getByRole("radio", { name: /Esta foto não deveria estar no evento/ }));
    fireEvent.click(screen.getByRole("button", { name: /Confirmar denúncia/ }));

    await waitFor(() => {
      expect(screen.getByText(/Recebido. O anfitrião vai revisar./)).toBeInTheDocument();
    });
  });

  it("hides the confirm button after successful report", async () => {
    render(<ReportSheet {...BASE_PROPS} />);

    fireEvent.click(screen.getByRole("radio", { name: /Esta foto não deveria estar no evento/ }));
    fireEvent.click(screen.getByRole("button", { name: /Confirmar denúncia/ }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Confirmar denúncia/ })).not.toBeInTheDocument();
    });
  });

  it("disables confirm button when no kind is selected", () => {
    render(<ReportSheet {...BASE_PROPS} />);

    expect(screen.getByRole("button", { name: /Confirmar denúncia/ })).toBeDisabled();
  });

  it("returns null when open is false", () => {
    render(<ReportSheet {...BASE_PROPS} open={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows block button when sessaoAutor is provided and minha is false", () => {
    render(<ReportSheet {...BASE_PROPS} sessaoAutor="sessao-xyz" autor="Maria" />);

    expect(screen.getByRole("button", { name: /Bloquear Maria/ })).toBeInTheDocument();
  });

  it("hides block button when minha is true", () => {
    render(<ReportSheet {...BASE_PROPS} sessaoAutor="sessao-xyz" autor="Maria" minha />);

    expect(screen.queryByRole("button", { name: /Bloquear/ })).not.toBeInTheDocument();
  });
});
