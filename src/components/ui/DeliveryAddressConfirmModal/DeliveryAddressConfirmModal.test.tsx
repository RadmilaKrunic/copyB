import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import DeliveryAddressConfirmModal from "./DeliveryAddressConfirmModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Dialog: ({
    open,
    title,
    children,
    onClose,
    "data-testid": testId,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
    onClose: (event?: React.SyntheticEvent) => void;
    "data-testid"?: string;
  }) =>
    open ? (
      <div role="dialog" data-testid={testId}>
        <h2>{title}</h2>
        <button data-testid="mock-dialog-close" onClick={(event) => onClose(event)}>
          close
        </button>
        {children}
      </div>
    ) : null,
  Button: ({
    children,
    onClick,
    "data-testid": testId,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    "data-testid"?: string;
  }) => (
    <button onClick={onClick} data-testid={testId}>
      {children}
    </button>
  ),
}));

const defaultProps = {
  isOpen: true,
  missingFieldLabels: [] as string[],
  isAddressCompletelyEmpty: false,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

function setup(overrides: Partial<typeof defaultProps> = {}) {
  const props = {
    ...defaultProps,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<DeliveryAddressConfirmModal {...props} />);
  return props;
}

describe("DeliveryAddressConfirmModal", () => {
  it("does not render the dialog when isOpen is false", () => {
    setup({ isOpen: false });

    expect(screen.queryByTestId("delivery-address-confirm-modal")).not.toBeInTheDocument();
  });

  it("renders title and description when open", () => {
    setup();

    expect(screen.getByTestId("delivery-address-confirm-modal")).toBeInTheDocument();
    expect(screen.getByText("deliveryAddressConfirmModalTitle")).toBeInTheDocument();
    expect(screen.getByText("deliveryAddressConfirmModalText")).toBeInTheDocument();
  });

  it("does not render the missing fields list when there are no missing fields", () => {
    setup({ missingFieldLabels: [] });

    expect(screen.queryByTestId("delivery-address-confirm-missing-list")).not.toBeInTheDocument();
    expect(
      screen.queryByText("deliveryAddressConfirmModalMissingFieldsLabel"),
    ).not.toBeInTheDocument();
  });

  it("renders a list item for every missing field label", () => {
    setup({ missingFieldLabels: ["neighborhood", "district"] });

    const items = within(screen.getByTestId("delivery-address-confirm-missing-list")).getAllByRole(
      "listitem",
    );

    expect(screen.getByText("deliveryAddressConfirmModalMissingFieldsLabel")).toBeInTheDocument();
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("neighborhood");
    expect(items[1]).toHaveTextContent("district");
  });

  it("shows 'addDeliveryAddress' on the cancel button when address is completely empty", () => {
    setup({ isAddressCompletelyEmpty: true });

    expect(screen.getByTestId("delivery-address-confirm-cancel-button")).toHaveTextContent(
      "addDeliveryAddress",
    );
  });

  it("shows 'completeDeliveryAddress' on the cancel button when address is partially filled", () => {
    setup({ isAddressCompletelyEmpty: false });

    expect(screen.getByTestId("delivery-address-confirm-cancel-button")).toHaveTextContent(
      "completeDeliveryAddress",
    );
  });

  it("shows 'yes' on the confirm button", () => {
    setup();

    expect(screen.getByTestId("delivery-address-confirm-yes-button")).toHaveTextContent("yes");
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    const props = setup();

    fireEvent.click(screen.getByTestId("delivery-address-confirm-yes-button"));

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when the cancel button is clicked", () => {
    const props = setup();

    fireEvent.click(screen.getByTestId("delivery-address-confirm-cancel-button"));

    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("calls onCancel and prevents the default event when the dialog is closed", () => {
    const props = setup();

    // fireEvent returns false when preventDefault was called on the event
    const notPrevented = fireEvent.click(screen.getByTestId("mock-dialog-close"));

    expect(notPrevented).toBe(false);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });
});
