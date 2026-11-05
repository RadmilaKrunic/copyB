import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Formik } from "formik";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GenericFormContext } from "@/components/generics/Form/GenericForm.context";
import AscLaborRulesExchangeArea from "./AscLaborRulesExchangeArea";
import { AscIdProvider } from "../AscId.context";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHead: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
}));

vi.mock("@/components/generics/Field/GenericField", () => ({
  default: ({ field }: { field: { name: string; infoText?: string } }) => (
    <div data-testid={`field-${field.name}`}>{field.infoText || field.name}</div>
  ),
}));

const area = {
  name: "laborRulesExchange",
  fields: [
    { name: "laborCostPerUnitSparePartsExchange" },
    { name: "laborCostPerUnitNewToolExchange" },
    { name: "laborCostPerUnitAccessoryExchange" },
    { name: "infoExchangeLaborCostMatrix" },
  ],
} as any;

function renderComponent(
  method: "LABOR_UNIT_X_COST_FROM_ASC" | "MATRIX" | "LABOR_UNIT_X_COST_FROM_ERP",
  options?: {
    ascId?: string;
    ascData?: Record<string, unknown>;
  },
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ascId = options?.ascId ?? "asc-1";

  qc.setQueryData(["user"], { countryCode: "TR" });
  qc.setQueryData(["laborCostConfig", "TR"], {
    laborCostMethod: {
      repairCosts: [],
      newToolExchange: {
        prices: [{ level: "L1", method, unitPrice: 10 }],
        reasonMapping: [],
      },
      accessoryExchange: { prices: [], reasonMapping: [] },
      sparePartsExchange: { prices: [], reasonMapping: [] },
    },
  });
  if (options?.ascData) {
    qc.setQueryData(["ASC", ascId], options.ascData);
  }

  render(
    <QueryClientProvider client={qc}>
      <AscIdProvider value={ascId}>
        <Formik initialValues={{}} onSubmit={() => {}}>
          {() => (
            <GenericFormContext.Provider
              value={{
                allFields: [],
                setAllFields: vi.fn(),
                mandatoryFields: null,
                setMandatoryFields: vi.fn(),
                actionCallbacks: {},
                selectedLaborExchangeRule: "level1Exchange",
                exchangeLaborCostTableData: [
                  {
                    reasonType: "REASON_A",
                    sparePartLaborUnit: 1,
                    newToolExchangeLaborUnit: 2,
                    accessoryLaborUnit: 3,
                  },
                ],
              }}
            >
              <AscLaborRulesExchangeArea area={area} />
            </GenericFormContext.Provider>
          )}
        </Formik>
      </AscIdProvider>
    </QueryClientProvider>,
  );
}

describe("AscLaborRulesExchangeArea", () => {
  it("renders per-unit fields for ASC method", () => {
    renderComponent("LABOR_UNIT_X_COST_FROM_ASC");

    expect(
      screen.getByTestId("field-laborCostPerUnitSparePartsExchange_level1Exchange"),
    ).toBeInTheDocument();
    expect(screen.getByText("REASON_A")).toBeInTheDocument();
  });

  it("renders matrix info text for MATRIX method", () => {
    renderComponent("MATRIX");

    expect(screen.getByTestId("field-infoExchangeLaborCostMatrix")).toHaveTextContent(
      "infoExchangeLaborCostMatrixText",
    );
  });

  it("renders ERP info text for ERP method", () => {
    renderComponent("LABOR_UNIT_X_COST_FROM_ERP");

    expect(screen.getByTestId("field-infoExchangeLaborCostMatrix")).toHaveTextContent(
      "infoExchangeLaborCostERPText",
    );
  });

  it("prefers ASC serviceCenter labor config over country config", () => {
    renderComponent("LABOR_UNIT_X_COST_FROM_ASC", {
      ascData: {
        serviceCenter: {
          laborCostMethod: {
            newToolExchange: {
              prices: [{ level: "L1", method: "LABOR_UNIT_X_COST_FROM_ERP", unitPrice: 9 }],
              reasonMapping: [],
            },
            accessoryExchange: { prices: [], reasonMapping: [] },
            sparePartsExchange: { prices: [], reasonMapping: [] },
          },
        },
      },
    });

    expect(screen.getByTestId("field-infoExchangeLaborCostMatrix")).toHaveTextContent(
      "infoExchangeLaborCostERPText",
    );
    expect(
      screen.queryByTestId("field-laborCostPerUnitSparePartsExchange_level1Exchange"),
    ).not.toBeInTheDocument();
  });
});
