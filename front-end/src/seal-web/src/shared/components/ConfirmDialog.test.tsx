import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("runs onConfirm (and not onClose) when the confirm button is clicked", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        title="Complete this event?"
        message="DRAFT → COMPLETED."
        confirmLabel="CONFIRM COMPLETE"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText("CONFIRM COMPLETE"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("runs onClose (and not onConfirm) when cancel is clicked", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        title="Complete this event?"
        message="DRAFT → COMPLETED."
        confirmLabel="CONFIRM COMPLETE"
        cancelLabel="CANCEL"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText("CANCEL"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="Hidden"
        message="Nope"
        confirmLabel="GO"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the irreversibility warning when provided", () => {
    render(
      <ConfirmDialog
        title="Complete this event?"
        message="DRAFT → COMPLETED."
        warning="Once completed, only System Admin can reopen the event."
        confirmLabel="CONFIRM COMPLETE"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/only System Admin can reopen/i)).toBeInTheDocument();
  });

  it("disables the confirm button while working so onConfirm cannot fire twice", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        title="Working…"
        message="Please wait"
        confirmLabel="CONFIRM"
        working
        onConfirm={onConfirm}
        onClose={() => {}}
      />,
    );
    const button = screen.getByText("WORKING…");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
