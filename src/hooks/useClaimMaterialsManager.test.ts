import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Field from "components/generics/Field/GenericField.types";
import Section from "components/generics/Section/GenericSection.types";
import { useClaimMaterialsManager } from "./useClaimMaterialsManager";
import { buildMaterialsRowValues } from "hooks/useDiagnosticsManager";

vi.mock("components/generics/utils", () => ({
  setDuplicatedArea: vi.fn((area, index, tabName) => ({
    ...area,
    name: `${tabName}_${area.name}#${index}`,
    index,
  })),
  mapFieldToFieldMapping: vi.fn((f) => ({
    ...f,
    fieldMapping: {
      originalName: f.name,
      map: f.name,
      parentMap: "",
      prefixes: [],
    },
  })),
}));

vi.mock("hooks/useDiagnosticsManager", () => ({
  buildRowValues: vi.fn(() => ({
    "claims_claimSpareParts#0_sparePartNumber": "PN-1",
  })),
  buildMaterialsRowValues: vi.fn(() => ({
    "claims_claimSpareParts#0_sparePartNumber": "PN-1",
  })),
}));

const claimsTab: Section = {
  name: "claims",
  label: "Claims",
  areas: [
    {
      name: "claims_claimSpareParts#0",
      label: "sp",
      isMultiple: true,
      index: 0,
      fields: [
        { name: "claims_claimSpareParts#0_position", label: "p", type: "dropdown" },
        {
          name: "claims_claimSpareParts#0_sparePartNumber",
          label: "pn",
          type: "text",
          subtype: "diagnosticPartNumber",
        },
      ],
    },
  ],
} as unknown as Section;

const allFields: Field[] = [
  { name: "claims_claimSpareParts#0_position", label: "p", type: "dropdown" },
  {
    name: "claims_claimSpareParts#0_sparePartNumber",
    label: "pn",
    type: "text",
    subtype: "diagnosticPartNumber",
  },
];

const loadedClaimMaterials = [
  {
    position: "SP",
    partNumber: "P-1",
    jobType: "WARRANTY",
    status: "APPROVED",
    approvedBy: "",
    approvedByName: "",
    approvedAt: "",
    description: "Part 1",
    quantity: 1,
    isValidated: true,
    isPriceManuallySet: true,
    reimbursementPaymentMethod: "BANK_TRANSFER",
    price: {
      unitPrice: 10,
      suggestedNetPrice: 10,
      netAmount: 10,
      tax: 0,
      taxAmount: 0,
      grossAmount: 10,
      discount: 0,
      totalAmount: 10,
    },
  },
] as const;

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useClaimMaterialsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns defaults when no country configuration is cached", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });

    const setTabs = vi.fn();
    const setAllFields = vi.fn();
    const setInitialFormValues = vi.fn();
    const setArePricesValidated = vi.fn();

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: undefined,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs,
          allFields,
          setAllFields,
          setInitialFormValues,
          skipFormResetRef: { current: false },
          formValuesRef: { current: {} },
          arePricesValidated: false,
          setArePricesValidated,
          readOnly: false,
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.discountBase).toBe("NET_PRICE");
    expect(result.current.allowedPositions).toEqual([]);
    expect(result.current.addSpecialMaterialsAllowed).toBe(false);
  });

  it("filters allowed positions by permission", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });
    queryClient.setQueryData(["countryConfiguration", "ZA"], {
      diagnosticsConfiguration: {
        discountBase: "GROSS_PRICE",
        addSpecialMaterialsAllowed: true,
        rules: [
          {
            actionType: "REPAIR",
            jobType: "WARRANTY",
            rule: {
              allowedPositions: [
                { position: "SP", maxCount: 5, unitPriceSource: "USER" },
                { position: "PN", maxCount: 3, unitPriceSource: "SYSTEM" },
              ],
            },
          },
        ],
      },
    });

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: undefined,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs: vi.fn(),
          allFields,
          setAllFields: vi.fn(),
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          formValuesRef: { current: {} },
          arePricesValidated: false,
          setArePricesValidated: vi.fn(),
          readOnly: false,
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.discountBase).toBe("GROSS_PRICE");
    expect(result.current.addSpecialMaterialsAllowed).toBe(true);
    expect(result.current.allowedPositions).toHaveLength(1);
    expect(result.current.allowedPositions[0].position).toBe("SP");
  });

  it("onAddRow exits early when readOnly is true", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });

    const setArePricesValidated = vi.fn();

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: undefined,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs: vi.fn(),
          allFields,
          setAllFields: vi.fn(),
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          formValuesRef: { current: {} },
          arePricesValidated: false,
          setArePricesValidated,
          readOnly: true,
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.onAddRow({});
    });

    expect(setArePricesValidated).not.toHaveBeenCalled();
  });

  it("onAddMaterials appends only non-duplicate materials", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });

    const formValuesRef = {
      current: {
        "claims_claimSpareParts#0_sparePartNumber": "P-EXISTING",
      },
    };

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: undefined,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs: vi.fn(),
          allFields,
          setAllFields: vi.fn(),
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          formValuesRef,
          arePricesValidated: false,
          setArePricesValidated: vi.fn(),
          readOnly: false,
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.onAddMaterials([
        { partNumber: "P-EXISTING", quantity: 1 },
        { partNumber: "P-NEW", quantity: 2, description: "new part" },
      ] as never);
    });

    expect(result.current.materials).toHaveLength(1);
    expect(result.current.materials[0].partNumber).toBe("P-NEW");
  });

  it("getExistingPartNumbers returns part numbers from form values", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: undefined,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs: vi.fn(),
          allFields,
          setAllFields: vi.fn(),
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          formValuesRef: { current: {} },
          arePricesValidated: false,
          setArePricesValidated: vi.fn(),
          readOnly: false,
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    const values = {
      "claims_claimSpareParts#0_sparePartNumber": "P-1",
    };

    const existing = result.current.getExistingPartNumbers(values);
    expect(existing.has("P-1")).toBe(true);
  });

  it("markAllValidated marks materials as validated and sets global validated", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });

    const setArePricesValidated = vi.fn();

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: undefined,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs: vi.fn(),
          allFields,
          setAllFields: vi.fn(),
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          formValuesRef: { current: {} },
          arePricesValidated: false,
          setArePricesValidated,
          readOnly: false,
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.setMaterials([
        {
          partNumber: "P-1",
          position: "SP",
          description: "",
          type: "WARRANTY",
          quantity: 1,
          unitPrice: 1,
          suggestedNetPrice: 1,
          netAmount: 1,
          tax: 0,
          taxAmount: 0,
          grossAmount: 1,
          discount: 0,
          totalAmount: 1,
        },
      ] as never);
    });

    act(() => {
      result.current.markAllValidated();
    });

    expect(result.current.materials[0].isValidated).toBe(true);
    expect(setArePricesValidated).toHaveBeenCalledWith(true);
  });

  it("markRowDirty marks one row dirty and unsets global validation", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });

    const setArePricesValidated = vi.fn();

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: undefined,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs: vi.fn(),
          allFields,
          setAllFields: vi.fn(),
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          formValuesRef: { current: {} },
          arePricesValidated: false,
          setArePricesValidated,
          readOnly: false,
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.setMaterials([
        { partNumber: "P-1", isValidated: true },
        { partNumber: "P-2", isValidated: true },
      ] as never);
    });

    act(() => {
      result.current.markRowDirty(1);
    });

    expect(result.current.materials[0].isValidated).toBe(true);
    expect(result.current.materials[1].isValidated).toBe(false);
    expect(setArePricesValidated).toHaveBeenCalledWith(false);
  });

  it("preserves reimbursement payment method when archiving a loaded material", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: loadedClaimMaterials as never,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs: vi.fn(),
          allFields,
          setAllFields: vi.fn(),
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          formValuesRef: { current: {} },
          arePricesValidated: false,
          setArePricesValidated: vi.fn(),
          readOnly: false,
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.materials).toHaveLength(1));

    act(() => {
      result.current.onDeleteRow("claims_claimSpareParts#0");
    });

    expect(result.current.archivedMaterials[0].reimbursementPaymentMethod).toBe("BANK_TRANSFER");
  });

  it("applies default values when claim material price fields are missing", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });

    const materialWithoutPrice = [
      {
        partNumber: "P-2",
        jobType: "CHARGEABLE",
        status: "PENDING",
      },
    ];

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: materialWithoutPrice as never,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs: vi.fn(),
          allFields,
          setAllFields: vi.fn(),
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          formValuesRef: { current: {} },
          arePricesValidated: false,
          setArePricesValidated: vi.fn(),
          readOnly: false,
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.materials).toHaveLength(1));

    const item = result.current.materials[0];
    expect(item.position).toBe("");
    expect(item.description).toBe("");
    expect(item.quantity).toBe(1);
    expect(item.unitPrice).toBe(0);
    expect(item.suggestedNetPrice).toBe(0);
    expect(item.netAmount).toBe(0);
    expect(item.tax).toBe(0);
    expect(item.grossAmount).toBe(0);
    expect(item.discount).toBe(0);
    expect(item.discountAmount).toBe(0);
    expect(item.totalAmount).toBe(0);
    expect(item.taxAmount).toBe(0);
  });
  describe("row values use the shared diagnostics row builder", () => {
    const netField = {
      name: "claims_claimSpareParts#0_netAmount",
      label: "net",
      type: "price",
      subtype: "diagnosticNetAmount",
    };
    const priceTab = {
      ...claimsTab,
      areas: [{ ...claimsTab.areas[0], fields: [...claimsTab.areas[0].fields, netField] }],
    } as unknown as Section;
    const priceFields = [...allFields, netField] as unknown as Field[];

    const renderWithFormValues = async (formValues: Record<string, unknown>) => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });
      const { result } = renderHook(
        () =>
          useClaimMaterialsManager({
            claimId: "C1",
            claimMaterials: undefined,
            currentActionType: "REPAIR",
            currentJobType: "WARRANTY",
            tabs: [priceTab],
            setTabs: vi.fn(),
            allFields: priceFields,
            setAllFields: vi.fn(),
            setInitialFormValues: vi.fn(),
            skipFormResetRef: { current: false },
            formValuesRef: { current: formValues },
            arePricesValidated: false,
            setArePricesValidated: vi.fn(),
            readOnly: false,
          }),
        { wrapper: makeWrapper(queryClient) },
      );
      act(() => {
        result.current.setMaterials([
          {
            ...loadedClaimMaterials[0].price,
            partNumber: "P-1",
            position: "SP",
            type: "WARRANTY",
            quantity: 1,
            description: "",
          },
        ] as never);
      });
      return result;
    };

    it("passes the live form values and existing row count for local material changes", async () => {
      const formValues = { [netField.name]: 25 };
      await renderWithFormValues(formValues);
      await waitFor(() => expect(buildMaterialsRowValues).toHaveBeenCalled());
      expect(buildMaterialsRowValues).toHaveBeenCalledWith(
        expect.objectContaining({ formValues, currentCount: 1, forceRebuild: false }),
      );
    });

    it("force-rebuilds rows from the API on every fresh claim fetch", async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });
      const setInitialFormValues = vi.fn();
      const props = {
        claimId: "C1",
        claimMaterials: loadedClaimMaterials as never,
        currentActionType: "REPAIR",
        currentJobType: "WARRANTY",
        tabs: [priceTab],
        setTabs: vi.fn(),
        allFields: priceFields,
        setAllFields: vi.fn(),
        setInitialFormValues,
        skipFormResetRef: { current: false },
        formValuesRef: { current: { [netField.name]: 0 } },
        arePricesValidated: false,
        setArePricesValidated: vi.fn(),
        readOnly: false,
      };
      const { rerender } = renderHook((p: typeof props) => useClaimMaterialsManager(p), {
        wrapper: makeWrapper(queryClient),
        initialProps: props,
      });
      await waitFor(() => expect(buildMaterialsRowValues).toHaveBeenCalledTimes(1));
      expect(buildMaterialsRowValues).toHaveBeenLastCalledWith(
        expect.objectContaining({ forceRebuild: true }),
      );

      rerender({ ...props, claimMaterials: structuredClone(loadedClaimMaterials) as never });
      await waitFor(() => expect(buildMaterialsRowValues).toHaveBeenCalledTimes(2));
      expect(buildMaterialsRowValues).toHaveBeenLastCalledWith(
        expect.objectContaining({ forceRebuild: true }),
      );
    });
  });
});
