import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Formik } from "formik";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RepairLaborCostMatrixModal from "./RepairLaborCostMatrixModal";

const tMock = vi.hoisted(() => vi.fn((key: string) => key));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: tMock }),
}));

vi.mock("@bosch/react-frok", () => ({
  Dialog: ({
    open,
    children,
    onClose,
  }: {
    open: boolean;
    children: React.ReactNode;
    onClose?: () => void;
  }) =>
    open ? (
      <div data-testid="repair-modal">
        <button type="button" data-testid="dialog-close" onClick={onClose}>
          close
        </button>
        {children}
      </div>
    ) : null,
  Button: ({ children, onClick, ...rest }: any) => (
    <button type="button" onClick={onClick} {...rest}>
      {children}
    </button>
  ),
  Notification: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Icon: () => <span data-testid="icon" />,
}));

vi.mock("@/components/generics/Field/GenericField", () => ({
  default: ({ field }: { field: { name: string } }) => <div data-testid={`field-${field.name}`} />,
}));

function renderModal(ranges: Array<{ labourUnitRange: number[]; value: number }>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  queryClient.setQueryData(["user"], { countryCode: "TR" });
  queryClient.setQueryData(["UIConfiguration", "TR"], {
    forms: [
      {
        name: "AddASC",
        sections: [
          {
            name: "internalLaborConfiguration",
            areas: [
              {
                name: "laborRulesRepair",
                fields: [
                  { name: "minimumLaborUnitMatrix" },
                  { name: "maximumLaborUnitMatrix" },
                  { name: "laborPriceMatrix" },
                  { name: "infoRepairLaborCost" },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  const onClose = vi.fn();
  const onSave = vi.fn();
  const matrixData = {
    level: "L1",
    laborRate: 0,
    method: "MATRIX",
    ranges,
  };

  render(
    <QueryClientProvider client={queryClient}>
      <Formik
        initialValues={{
          minimumLaborUnitMatrix_0: ranges[0]?.labourUnitRange[0],
          maximumLaborUnitMatrix_0: ranges[0]?.labourUnitRange.at(-1),
          laborPriceMatrix_0: ranges[0]?.value,
        }}
        onSubmit={() => {}}
      >
        {() => (
          <RepairLaborCostMatrixModal
            isOpen
            onClose={onClose}
            onSave={onSave}
            matrixData={matrixData as any}
          />
        )}
      </Formik>
    </QueryClientProvider>,
  );

  return { onClose, onSave };
}

function renderModalWithOptions(options: {
  isOpen: boolean;
  ranges: Array<{ labourUnitRange: number[]; value: number }>;
  includeInfoField?: boolean;
  matrixDataNullable?: boolean;
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  queryClient.setQueryData(["user"], { countryCode: "TR" });
  queryClient.setQueryData(["UIConfiguration", "TR"], {
    forms: [
      {
        name: "AddASC",
        sections: [
          {
            name: "internalLaborConfiguration",
            areas: [
              {
                name: "laborRulesRepair",
                fields: [
                  { name: "minimumLaborUnitMatrix" },
                  { name: "maximumLaborUnitMatrix" },
                  { name: "laborPriceMatrix" },
                  ...(options.includeInfoField === false ? [] : [{ name: "infoRepairLaborCost" }]),
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  const onClose = vi.fn();
  const onSave = vi.fn();
  const matrixData = options.matrixDataNullable
    ? null
    : {
        level: "L1",
        laborRate: 0,
        method: "MATRIX",
        ranges: options.ranges,
      };

  render(
    <QueryClientProvider client={queryClient}>
      <Formik
        initialValues={{
          minimumLaborUnitMatrix_0: options.ranges[0]?.labourUnitRange[0],
          maximumLaborUnitMatrix_0: options.ranges[0]?.labourUnitRange.at(-1),
          laborPriceMatrix_0: options.ranges[0]?.value,
        }}
        onSubmit={() => {}}
      >
        {() => (
          <RepairLaborCostMatrixModal
            isOpen={options.isOpen}
            onClose={onClose}
            onSave={onSave}
            matrixData={matrixData as any}
          />
        )}
      </Formik>
    </QueryClientProvider>,
  );

  return { onClose, onSave };
}

function renderModalWithMatrixData(matrixData: {
  level: string;
  laborRate: number;
  method: string;
  ranges: Array<{ labourUnitRange: number[]; value: number }>;
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  queryClient.setQueryData(["user"], { countryCode: "TR" });
  queryClient.setQueryData(["UIConfiguration", "TR"], {
    forms: [
      {
        name: "AddASC",
        sections: [
          {
            name: "internalLaborConfiguration",
            areas: [
              {
                name: "laborRulesRepair",
                fields: [
                  { name: "minimumLaborUnitMatrix" },
                  { name: "maximumLaborUnitMatrix" },
                  { name: "laborPriceMatrix" },
                  { name: "infoRepairLaborCost" },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  const onClose = vi.fn();
  const onSave = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <Formik
        initialValues={{
          minimumLaborUnitMatrix_0: matrixData.ranges[0]?.labourUnitRange[0],
          maximumLaborUnitMatrix_0: matrixData.ranges[0]?.labourUnitRange.at(-1),
          laborPriceMatrix_0: matrixData.ranges[0]?.value,
          minimumLaborUnitMatrix_1: matrixData.ranges[1]?.labourUnitRange[0],
          maximumLaborUnitMatrix_1: matrixData.ranges[1]?.labourUnitRange.at(-1),
          laborPriceMatrix_1: matrixData.ranges[1]?.value,
        }}
        onSubmit={() => {}}
      >
        {() => (
          <RepairLaborCostMatrixModal
            isOpen
            onClose={onClose}
            onSave={onSave}
            matrixData={matrixData as any}
          />
        )}
      </Formik>
    </QueryClientProvider>,
  );

  return { onClose, onSave };
}

describe("RepairLaborCostMatrixModal", () => {
  it("blocks save when matrix ranges are invalid", () => {
    const { onClose, onSave } = renderModal([{ labourUnitRange: [1, 10], value: 10 }]);

    fireEvent.click(screen.getByTestId("save-button-repair-labor-cost-modal"));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("matrixCoverageValidation")).toBeInTheDocument();
  });

  it("saves mapped and sorted matrix rows when validation passes", () => {
    const { onClose, onSave } = renderModal([{ labourUnitRange: [1, 40], value: 50 }]);

    fireEvent.click(screen.getByTestId("save-button-repair-labor-cost-modal"));

    expect(onSave).toHaveBeenCalledTimes(1);
    const savedData = onSave.mock.calls[0][0][0];
    expect(savedData.value).toBe(50);
    expect(savedData.labourUnitRange[0]).toBe(1);
    expect(savedData.labourUnitRange[savedData.labourUnitRange.length - 1]).toBe(40);
    expect(onClose).toHaveBeenCalled();
  });

  it("adds a new row when units are not fully mapped", () => {
    renderModal([{ labourUnitRange: [1, 10], value: 10 }]);

    fireEvent.click(screen.getByText("addNewRow"));

    expect(screen.getByTestId("field-minimumLaborUnitMatrix_1")).toBeInTheDocument();
    expect(screen.getByTestId("field-maximumLaborUnitMatrix_1")).toBeInTheDocument();
    expect(screen.getByTestId("field-laborPriceMatrix_1")).toBeInTheDocument();
  });

  it("deletes selected row and blocks save when coverage becomes invalid", () => {
    const { onClose, onSave } = renderModalWithMatrixData({
      level: "L1",
      laborRate: 0,
      method: "MATRIX",
      ranges: [
        { labourUnitRange: [1, 20], value: 10 },
        { labourUnitRange: [21, 40], value: 30 },
      ],
    });

    fireEvent.click(screen.getByTestId("delete-row-0"));
    fireEvent.click(screen.getByTestId("save-button-repair-labor-cost-modal"));

    expect(screen.queryByTestId("delete-row-1")).not.toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("matrixCoverageValidation")).toBeInTheDocument();
  });

  it("triggers close from dialog close icon and clears modal rows", () => {
    const { onClose } = renderModal([{ labourUnitRange: [1, 40], value: 50 }]);

    fireEvent.click(screen.getByTestId("dialog-close"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("delete-row-0")).not.toBeInTheDocument();
  });

  it("handles cancel action", () => {
    const { onClose } = renderModal([{ labourUnitRange: [1, 40], value: 50 }]);

    fireEvent.click(screen.getByTestId("cancel-button-repair-labor-cost-modal"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render when modal is closed", () => {
    renderModalWithOptions({
      isOpen: false,
      ranges: [{ labourUnitRange: [1, 40], value: 50 }],
    });

    expect(screen.queryByTestId("repair-modal")).not.toBeInTheDocument();
  });

  it("hides add row button when all units are mapped", () => {
    renderModal([{ labourUnitRange: [1, 40], value: 50 }]);

    expect(screen.queryByText("addNewRow")).not.toBeInTheDocument();
  });

  it("does not render info field when configuration omits it", () => {
    renderModalWithOptions({
      isOpen: true,
      ranges: [{ labourUnitRange: [1, 40], value: 50 }],
      includeInfoField: false,
    });

    expect(screen.queryByTestId("field-infoRepairLaborCost")).not.toBeInTheDocument();
  });

  it("adds first row when matrix data is null", () => {
    renderModalWithOptions({
      isOpen: true,
      ranges: [],
      matrixDataNullable: true,
    });

    fireEvent.click(screen.getByText("addNewRow"));

    expect(screen.getByTestId("field-minimumLaborUnitMatrix_0")).toBeInTheDocument();
    expect(screen.getByTestId("field-maximumLaborUnitMatrix_0")).toBeInTheDocument();
  });

  it("wraps next minimum unit to 1 when highest unit reaches max", () => {
    renderModal([{ labourUnitRange: [40, 40], value: 10 }]);

    fireEvent.click(screen.getByText("addNewRow"));

    expect(screen.getByTestId("field-minimumLaborUnitMatrix_1")).toBeInTheDocument();
    expect(screen.getByTestId("field-maximumLaborUnitMatrix_1")).toBeInTheDocument();
  });

  it("handles closed state when matrix data is null", () => {
    renderModalWithOptions({
      isOpen: false,
      ranges: [],
      matrixDataNullable: true,
    });

    expect(screen.queryByTestId("repair-modal")).not.toBeInTheDocument();
  });
});
