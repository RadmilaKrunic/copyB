import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Formik } from "formik";
import ExchangeLaborCostModal from "./ExchangeLaborCostModal";

const tMock = vi.hoisted(() => vi.fn((key: string) => key));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: tMock }),
}));

vi.mock("@bosch/react-frok", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="exchange-modal">{children}</div> : null,
  Button: ({ children, onClick, ...rest }: any) => (
    <button type="button" onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/generics/Field/GenericField", () => ({
  default: ({ field }: { field: { name: string; infoText?: string } }) => (
    <div data-testid={`field-${field.name}`}>{field.infoText || field.name}</div>
  ),
}));

function renderModal(
  method: "LABOR_UNIT_X_COST_FROM_ASC" | "MATRIX",
  overrides?: Partial<React.ComponentProps<typeof ExchangeLaborCostModal>>,
  options?: {
    includeInfoField?: boolean;
    includeEditField?: boolean;
    tableData?: React.ComponentProps<typeof ExchangeLaborCostModal>["tableData"];
    currentExchangeMethod?: React.ComponentProps<
      typeof ExchangeLaborCostModal
    >["currentExchangeMethod"];
  },
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  qc.setQueryData(["user"], { countryCode: "TR" });
  qc.setQueryData(["UIConfiguration", "TR"], {
    forms: [
      {
        name: "AddASC",
        sections: [
          {
            name: "internalLaborConfiguration",
            areas: [
              {
                name: "laborRulesExchange",
                fields: [
                  { name: "laborCostPerUnitSparePartsExchange" },
                  { name: "laborCostPerUnitNewToolExchange" },
                  { name: "laborCostPerUnitAccessoryExchange" },
                  { name: "exchangeReason" },
                  { name: "exchangeCode" },
                  { name: "sparePartLaborUnits" },
                  { name: "newToolExchangeLaborUnits" },
                  { name: "accessoryLaborUnits" },
                  ...(options?.includeEditField === true ? [{ name: "editExchangeRule" }] : []),
                  ...(options?.includeInfoField === false
                    ? []
                    : [{ name: "infoExchangeLaborCost" }]),
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
  const defaultTableData = [
    {
      reasonType: "REASON_A",
      sparePartLaborUnit: 1,
      newToolExchangeLaborUnit: 2,
      accessoryLaborUnit: 3,
    },
  ];
  const tableData = options?.tableData ?? defaultTableData;

  const defaultExchangeMethod = {
    repairCosts: [],
    newToolExchange: {
      prices: [{ level: "L1", method, unitPrice: 10 }],
      reasonMapping: [],
    },
    accessoryExchange: { prices: [], reasonMapping: [] },
    sparePartsExchange: { prices: [], reasonMapping: [] },
  };
  const currentExchangeMethod = options?.currentExchangeMethod ?? defaultExchangeMethod;

  render(
    <QueryClientProvider client={qc}>
      <Formik
        initialValues={{
          sparePartLaborUnits_level1Exchange_0: 9,
          newToolExchangeLaborUnits_level1Exchange_0: 8,
          accessoryLaborUnits_level1Exchange_0: 7,
        }}
        onSubmit={() => {}}
      >
        {() => (
          <ExchangeLaborCostModal
            isOpen
            onClose={onClose}
            onSave={onSave}
            tableData={tableData}
            currentExchangeLaborRule="level1Exchange"
            currentExchangeMethod={currentExchangeMethod as any}
            {...overrides}
          />
        )}
      </Formik>
    </QueryClientProvider>,
  );

  return { onClose, onSave };
}

describe("ExchangeLaborCostModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders labor cost per unit fields for ASC method and saves mapped row values", () => {
    const { onClose, onSave } = renderModal("LABOR_UNIT_X_COST_FROM_ASC");

    expect(
      screen.getByTestId("field-laborCostPerUnitSparePartsExchange_level1Exchange"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("save-button-exchange-labor-cost-modal"));

    expect(onSave).toHaveBeenCalledWith([
      {
        reasonType: "REASON_A",
        sparePartLaborUnit: 1,
        newToolExchangeLaborUnit: 2,
        accessoryLaborUnit: 3,
      },
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders info field for MATRIX method", () => {
    renderModal("MATRIX");

    expect(
      screen.queryByTestId("field-laborCostPerUnitSparePartsExchange_level1Exchange"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("field-infoExchangeLaborCost")).toBeInTheDocument();
  });

  it("does not render modal when isOpen is false", () => {
    renderModal("MATRIX", { isOpen: false });

    expect(screen.queryByTestId("exchange-modal")).not.toBeInTheDocument();
  });

  it("calls onClose from cancel button without saving", () => {
    const { onClose, onSave } = renderModal("LABOR_UNIT_X_COST_FROM_ASC");

    fireEvent.click(screen.getByTestId("cancel-button-exchange-labor-cost-modal"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("does not render info field when configuration omits it", () => {
    renderModal("MATRIX", undefined, { includeInfoField: false });

    expect(screen.queryByTestId("field-infoExchangeLaborCost")).not.toBeInTheDocument();
  });

  it("does not render labor cost per unit fields when exchange rule level does not match", () => {
    renderModal("LABOR_UNIT_X_COST_FROM_ASC", { currentExchangeLaborRule: "level2Exchange" });

    expect(
      screen.queryByTestId("field-laborCostPerUnitSparePartsExchange_level2Exchange"),
    ).not.toBeInTheDocument();
  });

  it("filters edit and info fields from row rendering", () => {
    renderModal("LABOR_UNIT_X_COST_FROM_ASC", undefined, { includeEditField: true });

    expect(screen.queryByTestId("field-editExchangeRule_level1Exchange_0")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("field-infoExchangeLaborCost_level1Exchange_0"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("field-exchangeReason_level1Exchange_0")).toBeInTheDocument();
  });

  it("saves empty table data when no rows are present", () => {
    const { onSave, onClose } = renderModal("MATRIX", undefined, { tableData: [] });

    fireEvent.click(screen.getByTestId("save-button-exchange-labor-cost-modal"));

    expect(onSave).toHaveBeenCalledWith([]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
