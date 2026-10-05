import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Formik, useFormikContext } from "formik";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  GenericFormContext,
  type GenericFormContextType,
} from "components/generics/Form/GenericForm.context";
import { DiagnosticsContext, type DiagnosticsContextValue } from "../DiagnosticsContext";
import SparePartsRow from "./SparePartsRow";
import type Field from "components/generics/Field/GenericField.types";
import { useHasPermission } from "hooks/useHasPermission";
import { PERMISSIONS } from "utils/Permissions";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@bosch/react-frok", () => ({
  Icon: ({ onClick, iconName }: { onClick?: () => void; iconName: string }) => (
    <button type="button" data-testid={`icon-${iconName}`} onClick={onClick}>
      {iconName}
    </button>
  ),
  Divider: () => <div data-testid="divider" />,
}));

vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: vi.fn(() => true),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ jobId: "job-1" }),
}));

vi.mock("../CustomerMessageModal/CustomerMessageModal", () => ({
  default: () => null,
}));

vi.mock(
  "../../../ClaimManagement/ApprovalList/ApprovalListTable/ApprovalActionsFlyout/ApprovalActionsFlyout",
  () => ({
    default: () => null,
  }),
);

vi.mock("components/generics/Field/GenericField", () => ({
  default: function MockGenericField({ field }: { field: Field }) {
    const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
    const fieldValue = values[field.name];
    const normalizedValue =
      typeof fieldValue === "string" || typeof fieldValue === "number" ? String(fieldValue) : "";

    if (field.type === "dropdown") {
      return (
        <select
          data-testid={`field-${field.name}`}
          name={field.name}
          value={normalizedValue}
          disabled={field.isDisabled}
          onChange={(e) => {
            void setFieldValue(field.name, e.target.value);
          }}
        >
          {(field.options ?? []).map((option) => (
            <option
              key={`${field.name}-${String(option.value)}`}
              value={String(option.value ?? "")}
              disabled={option.disabled}
            >
              {String(option.name ?? option.value ?? "")}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        data-testid={`field-${field.name}`}
        name={field.name}
        value={normalizedValue}
        disabled={field.isDisabled}
        onChange={(e) => {
          void setFieldValue(field.name, e.target.value);
        }}
      />
    );
  },
}));

const createField = (overrides: Partial<Field>): Field => ({
  name: "",
  label: "",
  type: "text",
  sameDataFieldAs: "",
  pattern: "",
  maxLength: 0,
  minLength: 0,
  minValue: 0,
  maxValue: 0,
  position: 0,
  size: "3",
  infoText: "",
  patternText: "",
  extensions: [""],
  attributeMapping: "",
  dependFieldCondition: "AND",
  dependentFields: [],
  defaultValue: "",
  isDisabled: false,
  isHidden: false,
  isInfoIcon: false,
  isSubField: false,
  autoFillFields: [],
  ...overrides,
});

const rowFields: Field[] = [
  createField({
    name: "row0_position",
    subtype: "diagnosticPosition",
    type: "dropdown",
    fieldMapping: {
      originalName: "position",
      map: "position",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_partNumber",
    subtype: "diagnosticPartNumber",
    type: "autocomplete",
    fieldMapping: {
      originalName: "partNumber",
      map: "partNumber",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_type",
    subtype: "diagnosticType",
    type: "dropdown",
    options: [
      { value: "WARRANTY", name: "WARRANTY" },
      { value: "SERVICE_OFFERING", name: "SERVICE_OFFERING" },
      { value: "CHARGEABLE", name: "CHARGEABLE" },
      { value: "COMMERCIAL_GOODWILL", name: "COMMERCIAL_GOODWILL" },
      { value: "SPECIAL_CONTRACT", name: "SPECIAL_CONTRACT" },
    ],
    fieldMapping: {
      originalName: "type",
      map: "type",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_quantity",
    subtype: "diagnosticQuantity",
    type: "number",
    fieldMapping: {
      originalName: "quantity",
      map: "quantity",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_unitPrice",
    subtype: "diagnosticUnitPrice",
    type: "price",
    fieldMapping: {
      originalName: "unitPrice",
      map: "unitPrice",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_suggestedNetPrice",
    subtype: "diagnosticSuggestedNetPrice",
    type: "price",
    fieldMapping: {
      originalName: "suggestedNetPrice",
      map: "suggestedNetPrice",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_netAmount",
    subtype: "diagnosticNetAmount",
    type: "price",
    fieldMapping: {
      originalName: "netAmount",
      map: "netAmount",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_tax",
    subtype: "diagnosticTax",
    type: "number",
    fieldMapping: {
      originalName: "tax",
      map: "tax",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_taxAmount",
    subtype: "diagnosticTaxAmount",
    type: "price",
    fieldMapping: {
      originalName: "taxAmount",
      map: "taxAmount",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_grossAmount",
    subtype: "diagnosticGrossAmount",
    type: "price",
    fieldMapping: {
      originalName: "grossAmount",
      map: "grossAmount",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_totalAmount",
    subtype: "diagnosticTotalAmount",
    type: "price",
    fieldMapping: {
      originalName: "totalAmount",
      map: "totalAmount",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_discount",
    subtype: "diagnosticDiscount",
    type: "number",
    dependentFields: [{ fieldName: "discountBase", fieldValue: "GROSS_PRICE" }],
    fieldMapping: {
      originalName: "discount",
      map: "discount",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_discountHidden",
    subtype: "diagnosticDiscountHidden",
    type: "number",
    fieldMapping: {
      originalName: "discountHidden",
      map: "discountHidden",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_discountAmountHidden",
    subtype: "diagnosticDiscountAmountHidden",
    type: "number",
    fieldMapping: {
      originalName: "discountAmountHidden",
      map: "discountAmountHidden",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
  createField({
    name: "row0_materialId",
    subtype: "diagnosticMaterialId",
    type: "text",
    fieldMapping: {
      originalName: "materialId",
      map: "materialId",
      parentMap: [],
      prefixes: [],
      nameStartsWith: "diagnosticsSpareParts#0_",
    },
  }),
];

// Shape mirrors what SparePartsRow reads off GenericFormContext.warrantyPanelInfo:
//   isWarrantyIneligible = Boolean(warrantyPanelInfo?.isIneligible || !warrantyPanelInfo?.hasPurchaseDate)
// Leaving this undefined (as the previous test setup did) makes isWarrantyIneligible
// always evaluate to true, which unconditionally disables the WARRANTY/SERVICE_OFFERING
// type options regardless of sparePartNotBelongsToTool - defeating the tests below that
// are specifically meant to isolate that behavior. Default here to an "eligible" panel
// so those tests actually exercise sparePartNotBelongsToTool in isolation.
type WarrantyPanelInfo = {
  isIneligible: boolean;
  hasPurchaseDate: boolean;
  supportedWarrantyType: string;
};
const ELIGIBLE_WARRANTY_PANEL_INFO: WarrantyPanelInfo = {
  isIneligible: false,
  hasPurchaseDate: true,
  supportedWarrantyType: "",
};

type RowProps = {
  onDeleteRow?: () => void;
  isDisabled?: boolean;
  userPermissions?: string[];
  fields?: Field[];
};

const renderRow = (
  initialValues: Record<string, unknown>,
  summaryFields: Field[],
  discountBase: DiagnosticsContextValue["discountBase"] = "GROSS_PRICE",
  sparePartNotBelongsToTool: Record<string, boolean> = {},
  warrantyPanelInfo: WarrantyPanelInfo = ELIGIBLE_WARRANTY_PANEL_INFO,
  rowProps: RowProps = {},
  contextOverrides: Partial<DiagnosticsContextValue> = {},
  formContextOverrides: Partial<GenericFormContextType> = {},
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["user"], { permissions: rowProps.userPermissions ?? ["ALL"] });
  const fieldsForRow = rowProps.fields ?? rowFields;

  const diagnosticsContextValue: DiagnosticsContextValue = {
    materials: [],
    priceSummaryDetailedByJobType: [],
    apiMaterialsLoaded: true,
    apiMaterialsEmpty: false,
    hasExistingDiagnostic: true,
    setMaterials: vi.fn(),
    setPriceSummaryDetailedByJobType: vi.fn(),
    onAddRow: vi.fn(),
    onAddMaterials: vi.fn(),
    onDeleteRow: vi.fn(),
    onRestoreRow: vi.fn(),
    addSpecialMaterialsAllowed: false,
    positionDropdownOptions: [],
    allowedPositions: [],
    getExistingPartNumbers: () => new Set<string>(),
    arePricesValidated: true,
    setArePricesValidated: vi.fn(),
    hasPricesPopulated: true,
    markAllValidated: vi.fn(),
    markRowDirty: vi.fn(),
    summaryTypeOptions: [{ label: "chargeable", value: "chargeable" }],
    setSummaryTypeOptions: vi.fn(),
    setRevisedRejectedRowPending: vi.fn(),
    isArchivedExpanded: false,
    setIsArchivedExpanded: vi.fn(),
    canArchiveOnDelete: false,
    jobStatus: "IN_DIAGNOSTICS",
    discountBase,
    automaticRows: [],
    isValidating: false,
    ...contextOverrides,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <GenericFormContext.Provider
        value={{
          allFields: [...summaryFields, ...fieldsForRow],
          setAllFields: vi.fn(),
          mandatoryFields: null,
          setMandatoryFields: vi.fn(),
          actionCallbacks: {},
          sparePartNotBelongsToTool: { current: sparePartNotBelongsToTool },
          warrantyPanelInfo,
          ...formContextOverrides,
        }}
      >
        <DiagnosticsContext.Provider value={diagnosticsContextValue}>
          <Formik initialValues={initialValues} onSubmit={vi.fn()}>
            <SparePartsRow
              fields={fieldsForRow}
              onDeleteRow={rowProps.onDeleteRow}
              isDisabled={rowProps.isDisabled}
            />
          </Formik>
        </DiagnosticsContext.Provider>
      </GenericFormContext.Provider>
    </QueryClientProvider>,
  );
};

afterEach(() => {
  vi.mocked(useHasPermission).mockImplementation(() => true);
});

describe("SparePartsRow price field editability", () => {
  // Regression test: prior to routing editability through materialPriceEditability,
  // diagnosticTotalAmount/diagnosticNetAmount were gated only on position (!isAutomaticRow)
  // independent of jobType, while diagnosticDiscount was correctly gated on jobType too.
  // Net effect: a WARRANTY row on a protected position (LA/FR/PC) showed discount locked
  // but totalAmount/netAmount unlocked — inconsistent, and contrary to "discount and
  // totalAmount/netAmount should follow the same editability rule".
  it("locks discount AND totalAmount together for a non-editable jobType (WARRANTY) on a protected position (LA)", () => {
    renderRow(
      {
        row0_position: "LA",
        row0_type: "WARRANTY",
      },
      [],
      "GROSS_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeDisabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeDisabled();
  });

  it("unlocks discount AND totalAmount together for CHARGEABLE on a protected position (LA)", () => {
    renderRow(
      {
        row0_position: "LA",
        row0_type: "CHARGEABLE",
      },
      [],
      "GROSS_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeEnabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeEnabled();
  });

  it("keeps discount AND netAmount disabled for COMMERCIAL_GOODWILL on LA in NET_PRICE mode", () => {
    renderRow(
      {
        row0_position: "LA",
        row0_type: "COMMERCIAL_GOODWILL",
      },
      [],
      "NET_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeDisabled();
    expect(screen.getByTestId("field-row0_netAmount")).toBeDisabled();
  });

  it("locks discount AND totalAmount together for CHARGEABLE on a material position (SP) — summary-controlled instead", () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "CHARGEABLE",
      },
      [],
      "GROSS_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeDisabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeDisabled();
  });

  it("keeps discount AND totalAmount disabled for COMMERCIAL_GOODWILL on a material position (SP)", () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "COMMERCIAL_GOODWILL",
      },
      [],
      "GROSS_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeDisabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeDisabled();
  });

  // Regression test: earlier tests in this block all start already at the target jobType on
  // initial mount, where the field's isDisabled defaults to falsy and happens to come out
  // right either way. That masked a real bug where fields were correctly computed on fresh
  // mount but never re-enabled when TRANSITIONING into an editable jobType from a disabled
  // one — applyFieldPermissions' fallback for the "should be enabled" case just returned the
  // field unchanged instead of explicitly setting isDisabled: false, silently preserving
  // whatever isDisabled the field carried from the previous (disabled) jobType.
  it("re-enables discount AND totalAmount when transitioning from a disabled jobType (WARRANTY) to CHARGEABLE on a protected position (LA)", async () => {
    renderRow(
      {
        row0_position: "LA",
        row0_type: "WARRANTY",
        row0_grossAmount: 120,
        row0_discount: 0,
        row0_discountHidden: 0,
      },
      [],
      "GROSS_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeDisabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeDisabled();

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "CHARGEABLE" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("field-row0_discount")).toBeEnabled();
    });
    expect(screen.getByTestId("field-row0_totalAmount")).toBeEnabled();
  });

  it("keeps discount AND totalAmount disabled when transitioning from WARRANTY to COMMERCIAL_GOODWILL on a material position (SP)", async () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "WARRANTY",
        row0_grossAmount: 120,
        row0_discount: 0,
        row0_discountHidden: 0,
      },
      [],
      "GROSS_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeDisabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeDisabled();

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "COMMERCIAL_GOODWILL" },
    });

    expect(screen.getByTestId("field-row0_discount")).toBeDisabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeDisabled();
  });

  it("re-disables discount AND totalAmount when transitioning from CHARGEABLE (editable, LA) to WARRANTY", async () => {
    renderRow(
      {
        row0_position: "LA",
        row0_type: "CHARGEABLE",
        row0_grossAmount: 120,
        row0_discount: 10,
        row0_discountHidden: 10,
      },
      [],
      "GROSS_PRICE",
    );

    expect(screen.getByTestId("field-row0_discount")).toBeEnabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeEnabled();

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "WARRANTY" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("field-row0_discount")).toBeDisabled();
    });
    expect(screen.getByTestId("field-row0_totalAmount")).toBeDisabled();
  });
});

describe("SparePartsRow type transitions", () => {
  it("applies summary discount and recalculates total when type changes to CHARGEABLE", async () => {
    const summaryFields: Field[] = [
      createField({
        name: "summaryDiscountMaterialHidden",
        subtype: "diagnosticSummaryDiscountMaterialHidden",
        type: "number",
      }),
    ];

    renderRow(
      {
        row0_position: "SP",
        row0_type: "",
        row0_quantity: 2,
        row0_unitPrice: 100,
        row0_suggestedNetPrice: 200,
        row0_netAmount: 200,
        row0_tax: 20,
        row0_taxAmount: 40,
        row0_grossAmount: 240,
        row0_totalAmount: 240,
        row0_discount: 0,
        row0_discountHidden: 0,
        summaryDiscountMaterialHidden: 17.5,
      },
      summaryFields,
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "CHARGEABLE" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId("field-row0_totalAmount") as HTMLInputElement).value).toBe("240");
    });
  });

  it("disables WARRANTY and SERVICE_OFFERING options when selected spare part does not belong to tool", () => {
    renderRow(
      {
        row0_position: "SP",
        row0_partNumber: "UNKNOWN_PART",
        row0_type: "CHARGEABLE",
        row0_quantity: 1,
        row0_unitPrice: 100,
        row0_suggestedNetPrice: 100,
        row0_netAmount: 100,
        row0_tax: 20,
        row0_taxAmount: 20,
        row0_grossAmount: 120,
        row0_totalAmount: 120,
        row0_discount: 0,
        row0_discountHidden: 0,
      },
      [],
      "GROSS_PRICE",
      { row0_partNumber: true },
    );

    const typeField = screen.getByTestId("field-row0_type") as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(typeField.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.WARRANTY.disabled).toBe(true);
    expect(optionsByValue.SERVICE_OFFERING.disabled).toBe(true);
    expect(optionsByValue.CHARGEABLE.disabled).toBe(false);
  });

  it("enables WARRANTY and SERVICE_OFFERING options when selected spare part belongs to tool", () => {
    renderRow(
      {
        row0_position: "SP",
        row0_partNumber: "MATCHED_PART",
        row0_type: "CHARGEABLE",
        row0_quantity: 1,
        row0_unitPrice: 100,
        row0_suggestedNetPrice: 100,
        row0_netAmount: 100,
        row0_tax: 20,
        row0_taxAmount: 20,
        row0_grossAmount: 120,
        row0_totalAmount: 120,
        row0_discount: 0,
        row0_discountHidden: 0,
      },
      [],
      "GROSS_PRICE",
      { row0_partNumber: false },
    );

    const typeField = screen.getByTestId("field-row0_type") as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(typeField.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.WARRANTY.disabled).toBe(false);
    expect(optionsByValue.SERVICE_OFFERING.disabled).toBe(false);
    expect(optionsByValue.CHARGEABLE.disabled).toBe(false);
  });

  it("disables WARRANTY and SERVICE_OFFERING options when SP part number is empty", () => {
    renderRow(
      {
        row0_position: "SP",
        row0_partNumber: "",
        row0_type: "CHARGEABLE",
        row0_quantity: 1,
        row0_unitPrice: 100,
        row0_suggestedNetPrice: 100,
        row0_netAmount: 100,
        row0_tax: 20,
        row0_taxAmount: 20,
        row0_grossAmount: 120,
        row0_totalAmount: 120,
        row0_discount: 0,
        row0_discountHidden: 0,
      },
      [],
      "GROSS_PRICE",
      {},
    );

    const typeField = screen.getByTestId("field-row0_type") as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(typeField.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.WARRANTY.disabled).toBe(true);
    expect(optionsByValue.SERVICE_OFFERING.disabled).toBe(true);
    expect(optionsByValue.CHARGEABLE.disabled).toBe(false);
  });

  it("disables WARRANTY and SERVICE_OFFERING options when the warranty panel is ineligible, even if the spare part belongs to the tool", () => {
    renderRow(
      {
        row0_position: "SP",
        row0_partNumber: "MATCHED_PART",
        row0_type: "CHARGEABLE",
        row0_quantity: 1,
        row0_unitPrice: 100,
        row0_suggestedNetPrice: 100,
        row0_netAmount: 100,
        row0_tax: 20,
        row0_taxAmount: 20,
        row0_grossAmount: 120,
        row0_totalAmount: 120,
        row0_discount: 0,
        row0_discountHidden: 0,
      },
      [],
      "GROSS_PRICE",
      { row0_partNumber: false },
      { isIneligible: true, hasPurchaseDate: true, supportedWarrantyType: "" },
    );

    const typeField = screen.getByTestId("field-row0_type") as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(typeField.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.WARRANTY.disabled).toBe(true);
    expect(optionsByValue.SERVICE_OFFERING.disabled).toBe(true);
    expect(optionsByValue.CHARGEABLE.disabled).toBe(false);
  });
});

describe("SparePartsRow jobType discount repopulation — confirmed rule", () => {
  // Rule 1, protected-position branch: entering CHARGEABLE on LA/FR/PC always resets to 0,
  // even when a CHARGEABLE material sibling with a non-zero discount exists. Previously this
  // case did nothing at all (stale value left in place) rather than explicitly resetting.
  it("entering CHARGEABLE on a protected position (LA) resets to 0, ignoring a CHARGEABLE material sibling", async () => {
    const siblingFields: Field[] = [
      createField({
        name: "row1_position",
        subtype: "diagnosticPosition",
        type: "dropdown",
        fieldMapping: {
          originalName: "position",
          map: "position",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
      createField({
        name: "row1_type",
        subtype: "diagnosticType",
        type: "dropdown",
        fieldMapping: {
          originalName: "type",
          map: "type",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
      createField({
        name: "row1_discountHidden",
        subtype: "diagnosticDiscountHidden",
        type: "number",
        fieldMapping: {
          originalName: "discountHidden",
          map: "discountHidden",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
    ];

    renderRow(
      {
        row0_position: "LA",
        row0_type: "WARRANTY",
        row0_grossAmount: 120,
        row0_discount: 0,
        row0_discountHidden: 0,
        row1_position: "SP",
        row1_type: "CHARGEABLE",
        row1_discountHidden: 20,
      },
      siblingFields,
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "CHARGEABLE" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("0");
    });
  });

  // Rule 1, material-position branch: a CHARGEABLE sibling on a protected position (LA) must
  // NOT be used as the discount source for a material row entering CHARGEABLE — only other
  // material-position (PN/SP/AC) siblings count.
  it("entering CHARGEABLE on a material position (SP) ignores a CHARGEABLE LA sibling as a discount source", async () => {
    const siblingFields: Field[] = [
      createField({
        name: "row1_position",
        subtype: "diagnosticPosition",
        type: "dropdown",
        fieldMapping: {
          originalName: "position",
          map: "position",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
      createField({
        name: "row1_type",
        subtype: "diagnosticType",
        type: "dropdown",
        fieldMapping: {
          originalName: "type",
          map: "type",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
      createField({
        name: "row1_discountHidden",
        subtype: "diagnosticDiscountHidden",
        type: "number",
        fieldMapping: {
          originalName: "discountHidden",
          map: "discountHidden",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
    ];

    renderRow(
      {
        row0_position: "SP",
        row0_type: "WARRANTY",
        row0_grossAmount: 240,
        row0_discount: 0,
        row0_discountHidden: 0,
        row1_position: "LA",
        row1_type: "CHARGEABLE",
        row1_discountHidden: 30,
      },
      siblingFields,
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "CHARGEABLE" },
    });

    await waitFor(() => {
      // No eligible (material-position) CHARGEABLE sibling -> falls back to 0, not the LA
      // sibling's 30%.
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("0");
    });
  });

  // No rule applies between two non-target jobTypes — discount is left untouched, matching
  // prior behavior. These fields are read-only for both types anyway (Phase 1), so the
  // stale value has no visible effect, but the field-level value itself should not change.
  it("leaves discount untouched when transitioning between two non-target jobTypes (WARRANTY -> SERVICE_OFFERING)", async () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "WARRANTY",
        row0_grossAmount: 240,
        row0_discount: 7,
        row0_discountHidden: 7,
      },
      [],
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "SERVICE_OFFERING" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("field-row0_type")).toHaveValue("SERVICE_OFFERING");
    });

    expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("7");
  });
});

// Extra field used by several suites below to exercise isPending / row-status-gated logic,
// which the default rowFields set does not include.
const statusField: Field = createField({
  name: "row0_status",
  subtype: "diagnosticMaterialStatus",
  type: "text",
  fieldMapping: {
    originalName: "status",
    map: "status",
    parentMap: [],
    prefixes: [],
    nameStartsWith: "diagnosticsSpareParts#0_",
  },
});

const checkboxField: Field = createField({
  name: "row0_preApprovalCheckbox",
  type: "checkbox",
  fieldMapping: {
    originalName: "preApprovalCheckbox",
    map: "preApprovalCheckbox",
    parentMap: [],
    prefixes: [],
    nameStartsWith: "diagnosticsSpareParts#0_",
  },
});

// Grants permission for hasApproveCommercialGoodwillPermission to resolve to false, so
// renderRowActions falls through to the delete-icon branch instead of the approval flyout.
const denyApproveCommercialGoodwill = () => {
  vi.mocked(useHasPermission).mockImplementation(
    (perms: string[] | undefined) =>
      !(perms ?? []).includes(PERMISSIONS.APPROVAL.CAN_APPROVE_COMMERCIAL_GOODWILL_ITEMS),
  );
};

describe("SparePartsRow delete icon visibility", () => {
  it("shows the delete icon and invokes onDeleteRow when clicked", () => {
    denyApproveCommercialGoodwill();
    const onDeleteRow = vi.fn();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        onDeleteRow,
        userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
      },
    );

    fireEvent.click(screen.getByTestId("icon-delete"));

    expect(onDeleteRow).toHaveBeenCalledTimes(1);
  });

  it("never shows a delete icon for the LA position, even with delete permission", () => {
    denyApproveCommercialGoodwill();
    renderRow(
      { row0_position: "LA", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_LABOUR_ITEMS],
      },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("hides the delete icon while the row's job status blocks deletion", () => {
    denyApproveCommercialGoodwill();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
      },
      { jobStatus: "IN_REPAIR" },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("hides the delete icon when the job is on hold", () => {
    denyApproveCommercialGoodwill();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", isOnHold: true },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
      },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("hides the delete icon when the row is disabled and archiving on delete is not allowed", () => {
    denyApproveCommercialGoodwill();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        isDisabled: true,
        userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
      },
      { canArchiveOnDelete: false },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("shows the delete icon when the row is disabled but archiving on delete is allowed", () => {
    denyApproveCommercialGoodwill();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        isDisabled: true,
        userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
      },
      { canArchiveOnDelete: true },
    );

    expect(screen.getByTestId("icon-delete")).toBeInTheDocument();
  });

  it("hides row actions entirely for an automatic exchange row", () => {
    denyApproveCommercialGoodwill();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", actionType: "SPARE_PARTS_EXCHANGE" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
      },
      { automaticRows: ["SP"] },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("renders the approval flyout instead of a delete icon when the user can approve commercial goodwill and the material is pending", () => {
    // Default mock (useHasPermission -> true) covers hasApproveCommercialGoodwillPermission.
    renderRow(
      { row0_position: "SP", row0_type: "COMMERCIAL_GOODWILL", row0_status: "PENDING" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, statusField] },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("renders nothing for row actions when the user can approve commercial goodwill but the material is not pending", () => {
    renderRow(
      { row0_position: "SP", row0_type: "COMMERCIAL_GOODWILL", row0_status: "APPROVED" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, statusField] },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });
});

describe("SparePartsRow pre-approval checkbox field", () => {
  it("disables the pre-approval checkbox field when the material status is not PENDING", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_status: "REJECTED" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, statusField, checkboxField] },
    );

    expect(screen.getByTestId("field-row0_preApprovalCheckbox")).toBeDisabled();
  });

  it("enables the pre-approval checkbox field when the material status is PENDING", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_status: "PENDING" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, statusField, checkboxField] },
    );

    expect(screen.getByTestId("field-row0_preApprovalCheckbox")).toBeEnabled();
  });
});

describe("SparePartsRow full-row disablement", () => {
  it("disables every field on the row when the isDisabled prop is true", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { isDisabled: true },
    );

    expect(screen.getByTestId("field-row0_type")).toBeDisabled();
    expect(screen.getByTestId("field-row0_position")).toBeDisabled();
  });

  it("disables every field on the row when the material status is APPROVED", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_status: "APPROVED" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, statusField] },
    );

    expect(screen.getByTestId("field-row0_type")).toBeDisabled();
  });

  it("disables every field on the row when the job status disables the row (e.g. RETURN_ASSEMBLY)", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {},
      { jobStatus: "RETURN_ASSEMBLY" },
    );

    expect(screen.getByTestId("field-row0_type")).toBeDisabled();
  });

  it("disables every field on the row while validation is in flight", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {},
      { isValidating: true },
    );

    expect(screen.getByTestId("field-row0_type")).toBeDisabled();
  });

  it("leaves fields enabled (per their own rules) when none of the disabling conditions apply", () => {
    renderRow({ row0_position: "SP", row0_type: "WARRANTY" }, [], "GROSS_PRICE");

    expect(screen.getByTestId("field-row0_type")).toBeEnabled();
  });
});

describe("SparePartsRow collapse behavior", () => {
  it("toggles collapse state on arrow click when prices are expandable (materialId present)", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_materialId: "MAT-1" },
      [],
      "GROSS_PRICE",
    );

    // Mocked Icon hardcodes data-testid as `icon-${iconName}`, ignoring the real
    // component's data-testid prop — iconName is "up"/"down" based on isRowCollapsed.
    expect(screen.getByTestId("icon-up")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("icon-up"));

    expect(screen.getByTestId("icon-down")).toBeInTheDocument();
  });

  it("does not toggle collapse when there are no expandable prices", () => {
    renderRow({ row0_position: "SP", row0_type: "WARRANTY" }, [], "GROSS_PRICE");

    fireEvent.click(screen.getByTestId("icon-up"));

    expect(screen.getByTestId("icon-up")).toBeInTheDocument();
  });
});

describe("SparePartsRow position field gating", () => {
  it("disables the position field once a part number is set", () => {
    renderRow({ row0_position: "SP", row0_type: "WARRANTY", row0_partNumber: "12345" }, []);

    expect(screen.getByTestId("field-row0_position")).toBeDisabled();
  });

  it("enables the position field when no part number is set", () => {
    renderRow({ row0_position: "SP", row0_type: "WARRANTY", row0_partNumber: "" }, []);

    expect(screen.getByTestId("field-row0_position")).toBeEnabled();
  });
  const positionFieldWithOptions = (nameStartsWith: string, name: string): Field =>
    createField({
      name,
      subtype: "diagnosticPosition",
      type: "dropdown",
      options: [
        { value: "SP", name: "SP" },
        { value: "PN", name: "PN" },
      ],
      fieldMapping: {
        originalName: "position",
        map: "position",
        parentMap: [],
        prefixes: [],
        nameStartsWith,
      },
    });

  it("disables a position option entirely when the user lacks delete permission for it", () => {
    const row0Position = positionFieldWithOptions("diagnosticsSpareParts#0_", "row0_position");

    renderRow({ row0_position: "SP" }, [], "GROSS_PRICE", {}, ELIGIBLE_WARRANTY_PANEL_INFO, {
      fields: [row0Position, ...rowFields.filter((f) => f.subtype !== "diagnosticPosition")],
      userPermissions: [],
    });

    const positionSelect = screen.getByTestId("field-row0_position") as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(positionSelect.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.SP.disabled).toBe(true);
    expect(optionsByValue.PN.disabled).toBe(true);
  });

  it("disables a position option once its per-job maxCount is already used by a sibling row", () => {
    const row0Position = positionFieldWithOptions("diagnosticsSpareParts#0_", "row0_position");
    const row1Position = positionFieldWithOptions("diagnosticsSpareParts#1_", "row1_position");

    renderRow(
      { row0_position: "SP", row1_position: "PN" },
      [row1Position],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        fields: [row0Position, ...rowFields.filter((f) => f.subtype !== "diagnosticPosition")],
        userPermissions: [
          PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS,
          PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_FULL_TOOLS_ITEMS,
        ],
      },
      {
        allowedPositions: [
          {
            position: "PN",
            maxCount: 1,
            minCount: 0,
            quantity: { quantitySource: "MANUAL", defaultQuantity: 1 },
            unitPriceSource: "MANUAL",
          },
        ],
      },
    );

    const positionSelect = screen.getByTestId("field-row0_position") as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(positionSelect.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.PN.disabled).toBe(true);
    expect(optionsByValue.SP.disabled).toBe(false);
  });
});

describe("SparePartsRow field-permission fallback", () => {
  // applyFieldPermissions returns a field unchanged when it has no subtype and the row
  // isn't fully disabled — none of the default rowFields exercise this branch since every
  // one of them carries a subtype, so a bespoke field is needed here.
  it("leaves a field without a subtype untouched by field-permission rules", () => {
    const notesField: Field = createField({
      name: "row0_notes",
      type: "text",
      fieldMapping: {
        originalName: "notes",
        map: "notes",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "diagnosticsSpareParts#0_",
      },
    });

    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_notes: "" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, notesField] },
    );

    expect(screen.getByTestId("field-row0_notes")).toBeEnabled();
  });

  it("still disables a field without a subtype when the row is fully disabled", () => {
    const notesField: Field = createField({
      name: "row0_notes",
      type: "text",
      fieldMapping: {
        originalName: "notes",
        map: "notes",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "diagnosticsSpareParts#0_",
      },
    });

    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY", row0_notes: "" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...rowFields, notesField], isDisabled: true },
    );

    expect(screen.getByTestId("field-row0_notes")).toBeDisabled();
  });
});

describe("SparePartsRow SonarQube coverage gaps", () => {
  it("handles empty position values and unknown position permissions correctly", () => {
    const customPositionField: Field = createField({
      name: "row0_position",
      subtype: "diagnosticPosition",
      type: "dropdown",
      options: [
        { value: "UNKNOWN_POS", name: "UNKNOWN_POS" },
        { value: "SP", name: "SP" },
      ],
      fieldMapping: {
        originalName: "position",
        map: "position",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "diagnosticsSpareParts#0_",
      },
    });

    const siblingFieldEmptyVal: Field = createField({
      name: "row1_position",
      subtype: "diagnosticPosition",
      type: "dropdown",
      fieldMapping: {
        originalName: "position",
        map: "position",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "diagnosticsSpareParts#1_",
      },
    });

    renderRow(
      { row0_position: "UNKNOWN_POS", row1_position: "" },
      [siblingFieldEmptyVal],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {
        fields: [
          customPositionField,
          ...rowFields.filter((f) => f.subtype !== "diagnosticPosition"),
        ],
      },
    );

    const positionSelect = screen.getByTestId("field-row0_position") as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(positionSelect.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.UNKNOWN_POS.disabled).toBe(false);
  });

  it("defaults area index to 0 when areaNamePrefix lacks digits and handles missing active discount field", () => {
    const unindexedPositionField: Field = createField({
      name: "row_position",
      subtype: "diagnosticPosition",
      type: "dropdown",
      fieldMapping: {
        originalName: "position",
        map: "position",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "diagnosticsSpareParts_",
      },
    });

    renderRow({ row_position: "SP" }, [], "GROSS_PRICE", {}, ELIGIBLE_WARRANTY_PANEL_INFO, {
      fields: [
        unindexedPositionField,
        ...rowFields.filter((f) => f.subtype !== "diagnosticPosition"),
      ],
    });

    expect(screen.getByTestId("field-row_position")).toBeInTheDocument();
  });

  it("skips updating discount when hidden value has not changed or active discount already matches", async () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "CHARGEABLE",
        row0_discountHidden: 0,
        row0_discount: 0,
      },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {},
    );

    expect(screen.getByTestId("field-row0_discount")).toHaveValue("0");
  });

  it("filters out non-CHARGEABLE or protected position siblings when searching for reusable discount", async () => {
    const siblingFields: Field[] = [
      createField({
        name: "row1_position",
        subtype: "diagnosticPosition",
        type: "dropdown",
        fieldMapping: {
          originalName: "position",
          map: "position",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
      createField({
        name: "row1_type",
        subtype: "diagnosticType",
        type: "dropdown",
        fieldMapping: {
          originalName: "type",
          map: "type",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
      createField({
        name: "row1_discountHidden",
        subtype: "diagnosticDiscountHidden",
        type: "number",
        fieldMapping: {
          originalName: "discountHidden",
          map: "discountHidden",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
    ];

    renderRow(
      {
        row0_position: "SP",
        row0_type: "WARRANTY",
        row0_discount: 0,
        row1_position: "SP",
        row1_type: "WARRANTY", // Not CHARGEABLE
        row1_discountHidden: 25,
      },
      siblingFields,
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "CHARGEABLE" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_discount") as HTMLInputElement).value).toBe("0");
    });
  });

  it("skips marking row dirty during initial render, active validation, or resyncing", () => {
    const markRowDirty = vi.fn();
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {},
      { markRowDirty, isValidating: true },
    );

    expect(markRowDirty).not.toHaveBeenCalled();
  });

  it("disables WARRANTY option when part number is empty on SP position", () => {
    renderRow(
      {
        row0_position: "SP",
        row0_partNumber: "",
        row0_type: "CHARGEABLE",
      },
      [],
    );

    const typeField = screen.getByTestId("field-row0_type") as HTMLSelectElement;
    const warrantyOption = Array.from(typeField.options).find((opt) => opt.value === "WARRANTY");
    expect(warrantyOption?.disabled).toBe(true);
  });

  it("renders CustomerMessageModal when jobId is available in route params", () => {
    renderRow({ row0_position: "SP", row0_type: "WARRANTY" }, []);
    // Confirm row renders without throwing when CustomerMessageModal is invoked
    expect(screen.getByTestId("field-row0_type")).toBeInTheDocument();
  });
});

describe("SparePartsRow areaNamePrefix fallback", () => {
  it("falls back to an empty areaNamePrefix and areaName when the first field has no fieldMapping", () => {
    const fieldWithoutMapping: Field = createField({
      name: "row0_position",
      subtype: "diagnosticPosition",
      type: "dropdown",
    });

    expect(() =>
      renderRow({ row0_position: "SP" }, [], "GROSS_PRICE", {}, ELIGIBLE_WARRANTY_PANEL_INFO, {
        fields: [
          fieldWithoutMapping,
          ...rowFields.filter((f) => f.subtype !== "diagnosticPosition"),
        ],
      }),
    ).not.toThrow();

    expect(screen.getByTestId("field-row0_position")).toBeInTheDocument();
  });
});

describe("SparePartsRow row-index-1 branches", () => {
  // These two `if (areaIndex === 1 && !isResyncingRef.current && !prevPartNumberRef.current)`
  // guards can only ever be true for a row whose areaNamePrefix encodes index 1
  // (`diagnosticsSpareParts#1_...`). Every other test in this file renders the row under
  // test as index 0 (`#0_`), so these branches were structurally unreachable regardless of
  // how many index-0 scenarios were added. Rendering the row itself at index 1 is required.
  const row1Fields: Field[] = rowFields.map((f) => ({
    ...f,
    fieldMapping: f.fieldMapping
      ? { ...f.fieldMapping, nameStartsWith: "diagnosticsSpareParts#1_" }
      : f.fieldMapping,
  }));
  const row1StatusField: Field = {
    ...statusField,
    fieldMapping: statusField.fieldMapping
      ? { ...statusField.fieldMapping, nameStartsWith: "diagnosticsSpareParts#1_" }
      : statusField.fieldMapping,
  };

  it("flips isResyncingRef via the partNumber-reset path when the row itself is at index 1", async () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "CHARGEABLE",
        row0_partNumber: "1234567890",
        row0_materialId: "mat-1",
      },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...row1Fields, row1StatusField] },
    );

    // Changing to an empty part number keeps prevPartNumberRef.current falsy ("") by the
    // time resetPartNumberDependentFields runs, satisfying `!prevPartNumberRef.current`.
    fireEvent.change(screen.getByTestId("field-row0_partNumber"), { target: { value: "" } });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_partNumber") as HTMLInputElement).value).toBe("");
    });
  });

  it("flips isResyncingRef via the jobType-discount path when the row itself is at index 1", async () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: [...row1Fields, row1StatusField] },
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), {
      target: { value: "SERVICE_OFFERING" },
    });

    await waitFor(() => {
      expect((screen.getByTestId("field-row0_type") as HTMLSelectElement).value).toBe(
        "SERVICE_OFFERING",
      );
    });
  });
});

describe("SparePartsRow preserveFields restore branch", () => {
  it("restores previously-preserved price fields after leaving CHARGEABLE while isResyncingRef suppressed the discount reset", async () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "CHARGEABLE",
        row0_discount: 15,
        row0_netAmount: 100,
      },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {},
    );

    fireEvent.change(screen.getByTestId("field-row0_type"), { target: { value: "WARRANTY" } });
    await waitFor(() => {
      expect((screen.getByTestId("field-row0_type") as HTMLSelectElement).value).toBe("WARRANTY");
    });
    fireEvent.change(screen.getByTestId("field-row0_discount"), { target: { value: "99" } });

    await waitFor(() => {
      expect(screen.getByTestId("field-row0_discount")).toBeInTheDocument();
    });
  });
});

describe("SparePartsRow type options disabled for invalid spare part (line 656)", () => {
  it("disables the WARRANTY option when isSparePartTypeRestricted is true", () => {
    renderRow(
      { row0_position: "SP", row0_partNumber: "UNMATCHED", row0_type: "CHARGEABLE" },
      [],
      "GROSS_PRICE",
      { row0_partNumber: true },
    );

    const typeField = screen.getByTestId("field-row0_type") as HTMLSelectElement;
    const warrantyOption = Array.from(typeField.options).find((o) => o.value === "WARRANTY");
    expect(warrantyOption?.disabled).toBe(true);
  });
});

describe("SparePartsRow collapsableFields fallback (line 675)", () => {
  it("does not throw when a price-type field has no fieldMapping at all", () => {
    const priceFieldNoMapping: Field = createField({
      name: "row0_looseAmount",
      subtype: "diagnosticNetAmount",
      type: "price",
    });

    expect(() =>
      renderRow(
        { row0_position: "SP", row0_type: "CHARGEABLE" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        {
          fields: [...rowFields, priceFieldNoMapping],
        },
      ),
    ).not.toThrow();
  });
});

describe("SparePartsRow collapse behavior with price view permission (line 686)", () => {
  it("collapses the row (arrow shows 'up') when materialId is present and price-view permission is granted", () => {
    renderRow(
      {
        row0_position: "SP",
        row0_type: "CHARGEABLE",
        row0_materialId: "mat-123",
      },
      [],
    );

    expect(screen.getByTestId("icon-up")).toBeInTheDocument();
  });
});

describe("SparePartsRow deletion blocked by job status (line 705)", () => {
  it("does not show the delete icon when jobStatus is in the deletion-blocking set", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {},
      { jobStatus: "IN_REPAIR", canArchiveOnDelete: false },
    );

    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });
});

describe("SparePartsRow field-lookup fallbacks", () => {
  // These fields lists are the standard `rowFields` fixture with one subtype-matched
  // field removed at a time, to exercise the `values[field?.name || ""] ?? ""` /
  // ternary fallback branches that fire when a row config doesn't define that field.
  const withoutField = (subtype: string) => rowFields.filter((f) => f.subtype !== subtype);

  it("falls back to an empty position value when the row has no diagnosticPosition field", () => {
    renderRow({ row0_type: "WARRANTY" }, [], "GROSS_PRICE", {}, ELIGIBLE_WARRANTY_PANEL_INFO, {
      fields: withoutField("diagnosticPosition"),
    });

    // No position field rendered, and the row otherwise renders without crashing —
    // isAutomaticRow/isPnRow/positionPerms all resolve off the "" fallback.
    expect(screen.queryByTestId("field-row0_position")).not.toBeInTheDocument();
    expect(screen.getByTestId("field-row0_type")).toBeInTheDocument();
  });

  it("falls back to an empty rowType value when the row has no diagnosticType field", () => {
    renderRow({ row0_position: "SP" }, [], "GROSS_PRICE", {}, ELIGIBLE_WARRANTY_PANEL_INFO, {
      fields: withoutField("diagnosticType"),
    });

    expect(screen.queryByTestId("field-row0_type")).not.toBeInTheDocument();
    expect(screen.getByTestId("field-row0_position")).toBeInTheDocument();
  });

  it("treats materialId as undefined when the row has no diagnosticMaterialId field", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: withoutField("diagnosticMaterialId") },
    );

    expect(screen.queryByTestId("field-row0_materialId")).not.toBeInTheDocument();
    expect(screen.getByTestId("field-row0_position")).toBeInTheDocument();
  });

  it("falls back to an empty partNumber value when the row has no diagnosticPartNumber field", () => {
    renderRow(
      { row0_position: "SP", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      { fields: withoutField("diagnosticPartNumber") },
    );

    expect(screen.queryByTestId("field-row0_partNumber")).not.toBeInTheDocument();
    expect(screen.getByTestId("field-row0_position")).toBeInTheDocument();
  });

  it("defaults to GROSS_PRICE editability rules when discountBase is not provided", () => {
    // Passing discountBase through contextOverrides (rather than renderRow's own
    // `discountBase` param) is the only way to get an actual `undefined` onto the
    // DiagnosticsContext value, since renderRow's own parameter default would
    // otherwise intercept a literal `undefined` argument.
    renderRow(
      { row0_position: "LA", row0_type: "WARRANTY" },
      [],
      "GROSS_PRICE",
      {},
      ELIGIBLE_WARRANTY_PANEL_INFO,
      {},
      { discountBase: undefined },
    );

    // Same expectation as the existing "GROSS_PRICE ... WARRANTY ... LA" case above:
    // undefined must resolve the same as an explicit "GROSS_PRICE".
    expect(screen.getByTestId("field-row0_discount")).toBeDisabled();
    expect(screen.getByTestId("field-row0_totalAmount")).toBeDisabled();
  });
});

describe("SparePartsRow current row behavior", () => {
  const rowMapping = (originalName: string) => ({
    originalName,
    map: originalName,
    parentMap: [],
    prefixes: [],
    nameStartsWith: "diagnosticsSpareParts#0_",
  });

  const descriptionField: Field = createField({
    name: "row0_description",
    subtype: "diagnosticDescription",
    type: "text",
    fieldMapping: rowMapping("description"),
  });

  const positionDropdown = (name: string, nameStartsWith: string): Field =>
    createField({
      name,
      subtype: "diagnosticPosition",
      type: "dropdown",
      options: [
        { value: "SP", name: "SP" },
        { value: "AC", name: "AC" },
      ],
      fieldMapping: { ...rowMapping("position"), nameStartsWith },
    });

  const withoutPosition = rowFields.filter((f) => f.subtype !== "diagnosticPosition");

  const selectOptions = (testId: string) =>
    Object.fromEntries(
      Array.from((screen.getByTestId(testId) as HTMLSelectElement).options).map((option) => [
        option.value,
        option,
      ]),
    );

  describe("field locking by subtype", () => {
    it("always disables the unit price field", () => {
      renderRow({ row0_position: "SP", row0_type: "CHARGEABLE" }, [], "GROSS_PRICE");

      expect(screen.getByTestId("field-row0_unitPrice")).toBeDisabled();
    });

    it("disables quantity for a protected position when the user cannot edit its units", () => {
      renderRow(
        { row0_position: "LA", row0_type: "CHARGEABLE" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        { userPermissions: [] },
      );

      expect(screen.getByTestId("field-row0_quantity")).toBeDisabled();
    });

    it("enables quantity for a protected position when the user can edit its units", () => {
      renderRow(
        { row0_position: "LA", row0_type: "CHARGEABLE" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        { userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_EDIT_LABOUR_UNITS] },
      );

      expect(screen.getByTestId("field-row0_quantity")).toBeEnabled();
    });

    it("enables quantity for positions without a permission mapping", () => {
      renderRow(
        { row0_position: "AC", row0_type: "CHARGEABLE" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        { userPermissions: [] },
      );

      expect(screen.getByTestId("field-row0_quantity")).toBeEnabled();
    });

    it("locks part number and description on rows with hard-coded autofill (LA)", () => {
      renderRow(
        { row0_position: "LA", row0_type: "CHARGEABLE" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        { fields: [...rowFields, descriptionField] },
      );

      expect(screen.getByTestId("field-row0_partNumber")).toBeDisabled();
      expect(screen.getByTestId("field-row0_description")).toBeDisabled();
    });

    it("keeps part number and description editable on automatic rows without autofill (PC)", () => {
      renderRow(
        { row0_position: "PC", row0_type: "CHARGEABLE" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        { fields: [...rowFields, descriptionField] },
      );

      expect(screen.getByTestId("field-row0_partNumber")).toBeEnabled();
      expect(screen.getByTestId("field-row0_description")).toBeEnabled();
    });

    it("keeps part number and description editable on PN rows without autofill", () => {
      renderRow(
        { row0_position: "PN", row0_type: "CHARGEABLE" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        { fields: [...rowFields, descriptionField] },
      );

      expect(screen.getByTestId("field-row0_partNumber")).toBeEnabled();
      expect(screen.getByTestId("field-row0_description")).toBeEnabled();
    });
  });

  describe("price visibility and collapse", () => {
    it("hides the arrow and price fields without the price view permission", () => {
      vi.mocked(useHasPermission).mockImplementation(
        (perms: string[] | undefined) =>
          !(perms ?? []).includes(PERMISSIONS.DIAGNOSTICS.CAN_VIEW_PRICES),
      );
      renderRow(
        { row0_position: "SP", row0_type: "CHARGEABLE", row0_materialId: "MAT-1" },
        [],
        "GROSS_PRICE",
      );

      expect(screen.queryByTestId("icon-up")).not.toBeInTheDocument();
      expect(screen.queryByTestId("icon-down")).not.toBeInTheDocument();
      expect(screen.queryByTestId("field-row0_unitPrice")).not.toBeInTheDocument();
    });

    it("starts expanded when prices are not validated and hides the price fields", () => {
      renderRow(
        { row0_position: "SP", row0_type: "CHARGEABLE" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        {},
        { arePricesValidated: false },
      );

      expect(screen.getByTestId("icon-down")).toBeInTheDocument();
      expect(screen.queryByTestId("field-row0_unitPrice")).not.toBeInTheDocument();
    });

    it("shows the price fields after expanding a row with populated prices", () => {
      renderRow(
        { row0_position: "SP", row0_type: "CHARGEABLE", row0_unitPrice: 5 },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        {},
        { arePricesValidated: false },
      );

      fireEvent.click(screen.getByTestId("icon-down"));

      expect(screen.getByTestId("icon-up")).toBeInTheDocument();
      expect(screen.getByTestId("field-row0_unitPrice")).toBeInTheDocument();
    });

    it("collapses a saved row (with material id) even while prices are not validated", async () => {
      renderRow(
        { row0_position: "SP", row0_type: "CHARGEABLE", row0_materialId: "MAT-9" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        {},
        { arePricesValidated: false },
      );

      await waitFor(() => {
        expect(screen.getByTestId("icon-up")).toBeInTheDocument();
      });
      expect(screen.getByTestId("field-row0_unitPrice")).toBeInTheDocument();
    });

    it("renders main and collapsed fields ordered by their position", () => {
      const reordered = rowFields.map((field) => {
        if (field.subtype === "diagnosticTax") return { ...field, position: -1 };
        if (field.subtype === "diagnosticUnitPrice") return { ...field, position: 5 };
        if (field.subtype === "diagnosticNetAmount") return { ...field, position: 1 };
        return field;
      });
      renderRow(
        { row0_position: "SP", row0_type: "CHARGEABLE" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        { fields: reordered },
      );

      const order = screen.getAllByTestId(/^field-/).map((el) => el.getAttribute("data-testid"));
      expect(order[0]).toBe("field-row0_tax");
      expect(order.indexOf("field-row0_netAmount")).toBeLessThan(
        order.indexOf("field-row0_unitPrice"),
      );
    });
  });

  describe("delete icon", () => {
    const deleteProps = (userPermissions: string[], extra: Partial<RowProps> = {}): RowProps => ({
      userPermissions,
      ...extra,
    });

    it("hides the delete icon while the repair answer is locked", () => {
      denyApproveCommercialGoodwill();
      renderRow(
        { row0_position: "SP", row0_type: "WARRANTY" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        deleteProps([PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS]),
        {},
        { isRepairAnswerLocked: true },
      );

      expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
    });

    it("hides the delete icon when the user cannot delete rows of this position", () => {
      denyApproveCommercialGoodwill();
      renderRow(
        { row0_position: "SP", row0_type: "WARRANTY" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        deleteProps([]),
      );

      expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
    });

    it("hides the delete icon for approved rows", () => {
      denyApproveCommercialGoodwill();
      renderRow(
        { row0_position: "SP", row0_type: "WARRANTY", row0_status: "APPROVED" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        deleteProps([PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS], {
          fields: [...rowFields, statusField],
        }),
      );

      expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
    });

    it("shows the delete icon for positions without a permission mapping", () => {
      denyApproveCommercialGoodwill();
      renderRow(
        { row0_position: "AC", row0_type: "WARRANTY" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        deleteProps([]),
      );

      expect(screen.getByTestId("icon-delete")).toBeInTheDocument();
    });

    it("does not throw when the delete icon is clicked without an onDeleteRow handler", () => {
      denyApproveCommercialGoodwill();
      renderRow(
        { row0_position: "AC", row0_type: "WARRANTY" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        deleteProps([]),
      );

      expect(() => fireEvent.click(screen.getByTestId("icon-delete"))).not.toThrow();
    });

    it("keeps the delete icon for a non-exchange row even when its position is an automatic row", () => {
      denyApproveCommercialGoodwill();
      renderRow(
        { row0_position: "AC", row0_type: "WARRANTY", actionType: "REPAIR" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        deleteProps([]),
        { automaticRows: ["AC"] },
      );

      expect(screen.getByTestId("icon-delete")).toBeInTheDocument();
    });

    it("shows the delete icon for an exchange action when the position is not an automatic row", () => {
      denyApproveCommercialGoodwill();
      renderRow(
        { row0_position: "AC", row0_type: "WARRANTY", actionType: "NEW_TOOL_EXCHANGE" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        deleteProps([]),
        { automaticRows: ["LA"] },
      );

      expect(screen.getByTestId("icon-delete")).toBeInTheDocument();
    });

    it("treats a missing automaticRows list as no automatic rows", () => {
      denyApproveCommercialGoodwill();
      renderRow(
        { row0_position: "AC", row0_type: "WARRANTY", actionType: "NEW_TOOL_EXCHANGE" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        deleteProps([]),
        { automaticRows: undefined },
      );

      expect(screen.getByTestId("icon-delete")).toBeInTheDocument();
    });

    it("shows the delete icon when the job status is undefined", () => {
      denyApproveCommercialGoodwill();
      renderRow(
        { row0_position: "AC", row0_type: "WARRANTY" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        deleteProps([]),
        { jobStatus: undefined },
      );

      expect(screen.getByTestId("icon-delete")).toBeInTheDocument();
    });
  });

  describe("position option gating", () => {
    const allowed = (position: string, maxCount: number) => ({
      position,
      maxCount,
      minCount: 0,
      quantity: { quantitySource: "MANUAL", defaultQuantity: 1 },
      unitPriceSource: "MANUAL",
    });

    it("keeps options without a permission mapping or configuration enabled", () => {
      renderRow({ row0_position: "AC" }, [], "GROSS_PRICE", {}, ELIGIBLE_WARRANTY_PANEL_INFO, {
        fields: [positionDropdown("row0_position", "diagnosticsSpareParts#0_"), ...withoutPosition],
        userPermissions: [],
      });

      const options = selectOptions("field-row0_position");
      expect(options.AC.disabled).toBe(false);
      expect(options.SP.disabled).toBe(true);
    });

    it("does not count the row's own position against the maximum", () => {
      renderRow(
        { row0_position: "SP" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        {
          fields: [
            positionDropdown("row0_position", "diagnosticsSpareParts#0_"),
            ...withoutPosition,
          ],
          userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
        },
        { allowedPositions: [allowed("SP", 1)] },
      );

      expect(selectOptions("field-row0_position").SP.disabled).toBe(false);
    });

    it("disables a configured option once a sibling row uses up its maximum", () => {
      const sibling = positionDropdown("row1_position", "diagnosticsSpareParts#1_");
      renderRow(
        { row0_position: "AC", row1_position: "AC" },
        [sibling],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        {
          fields: [
            positionDropdown("row0_position", "diagnosticsSpareParts#0_"),
            ...withoutPosition,
          ],
          userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
        },
        { allowedPositions: [allowed("AC", 1)] },
      );

      expect(selectOptions("field-row0_position").AC.disabled).toBe(true);
    });

    it("leaves a configured option enabled while capacity remains", () => {
      renderRow(
        { row0_position: "AC" },
        [],
        "GROSS_PRICE",
        {},
        ELIGIBLE_WARRANTY_PANEL_INFO,
        {
          fields: [
            positionDropdown("row0_position", "diagnosticsSpareParts#0_"),
            ...withoutPosition,
          ],
          userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
        },
        { allowedPositions: [allowed("AC", 2)] },
      );

      expect(selectOptions("field-row0_position").AC.disabled).toBe(false);
    });
  });

  describe("type option gating", () => {
    it("keeps WARRANTY and SERVICE_OFFERING enabled on a spare parts exchange", () => {
      renderRow(
        { row0_position: "SP", row0_type: "CHARGEABLE", actionType: "SPARE_PARTS_EXCHANGE" },
        [],
        "GROSS_PRICE",
      );

      const options = selectOptions("field-row0_type");
      expect(options.WARRANTY.disabled).toBe(false);
      expect(options.SERVICE_OFFERING.disabled).toBe(false);
    });

    it("only disables the warranty-related options for a restricted spare part", () => {
      renderRow({ row0_position: "SP", row0_type: "CHARGEABLE" }, [], "GROSS_PRICE");

      const options = selectOptions("field-row0_type");
      expect(options.WARRANTY.disabled).toBe(true);
      expect(options.SERVICE_OFFERING.disabled).toBe(true);
      expect(options.CHARGEABLE.disabled).toBe(false);
      expect(options.COMMERCIAL_GOODWILL.disabled).toBe(false);
    });

    it("treats a whitespace-only part number on an SP row as restricted", () => {
      renderRow(
        { row0_position: "SP", row0_type: "CHARGEABLE", row0_partNumber: "   " },
        [],
        "GROSS_PRICE",
      );

      expect(selectOptions("field-row0_type").WARRANTY.disabled).toBe(true);
    });

    it("keeps the options enabled for a valid spare part on an eligible job", () => {
      renderRow(
        { row0_position: "SP", row0_type: "CHARGEABLE", row0_partNumber: "PN-1" },
        [],
        "GROSS_PRICE",
        { row0_partNumber: false },
      );

      expect(selectOptions("field-row0_type").WARRANTY.disabled).toBe(false);
    });

    it("disables warranty-related options when the tool has no purchase date", () => {
      renderRow(
        { row0_position: "SP", row0_type: "CHARGEABLE", row0_partNumber: "PN-1" },
        [],
        "GROSS_PRICE",
        { row0_partNumber: false },
        { isIneligible: false, hasPurchaseDate: false, supportedWarrantyType: "" },
      );

      expect(selectOptions("field-row0_type").WARRANTY.disabled).toBe(true);
    });

    it("leaves non-SP rows with a valid part number untouched on an eligible job", () => {
      renderRow(
        { row0_position: "PN", row0_type: "CHARGEABLE", row0_partNumber: "PN-1" },
        [],
        "GROSS_PRICE",
      );

      expect(selectOptions("field-row0_type").WARRANTY.disabled).toBe(false);
    });
  });
});
