import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeleteClientDialog from "./DeleteClientDialog";

const dialogCloseEvent = vi.hoisted(() => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Dialog: ({ children, open, title, onClose, ...props }: any) =>
    open ? (
      <div role="dialog" aria-label={title} data-testid={props["data-testid"]}>
        <h2>{title}</h2>
        <button
          type="button"
          aria-label="close dialog"
          onClick={() => onClose?.(dialogCloseEvent)}
        />
        {children}
      </div>
    ) : null,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  TextArea: ({ id, label, ...props }: any) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} {...props} />
    </div>
  ),
}));

function renderDialog(props: Partial<React.ComponentProps<typeof DeleteClientDialog>> = {}) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();

  render(
    <DeleteClientDialog
      isOpen
      isPending={false}
      isError={false}
      onCancel={onCancel}
      onConfirm={onConfirm}
      {...props}
    />,
  );

  return { onCancel, onConfirm };
}

describe("DeleteClientDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title, confirmation copy and optional notes", () => {
    renderDialog();

    expect(screen.getByTestId("delete-client-dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "deleteClientConfirmationTitle" })).toBeVisible();
    expect(screen.getByText("deleteClientConfirmationText")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "deleteClientNotesLabel" })).toHaveAttribute(
      "placeholder",
      "deleteClientNotesPlaceholder",
    );
  });

  it("does not render the dialog when closed", () => {
    renderDialog({ isOpen: false });

    expect(screen.queryByTestId("delete-client-dialog")).not.toBeInTheDocument();
  });

  it("updates the optional note value", () => {
    renderDialog();
    const notes = screen.getByRole("textbox", { name: "deleteClientNotesLabel" });

    fireEvent.change(notes, { target: { value: "Customer requested deletion" } });

    expect(notes).toHaveValue("Customer requested deletion");
  });

  it("calls cancel and confirm handlers from their buttons", () => {
    const { onCancel, onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "delete" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("prevents default dialog close and invokes cancel", () => {
    const { onCancel } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "close dialog" }));

    expect(dialogCloseEvent.preventDefault).toHaveBeenCalledOnce();
    expect(dialogCloseEvent.stopPropagation).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("shows deletion error", () => {
    renderDialog({ isError: true });

    expect(screen.getByRole("alert")).toHaveTextContent("errorDeleteClient");
  });

  it("disables actions and notes while deletion is pending", () => {
    renderDialog({ isPending: true });

    expect(screen.getByRole("button", { name: "cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "delete" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "deleteClientNotesLabel" })).toBeDisabled();
  });
});
