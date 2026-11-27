import { Formik, useFormikContext } from "formik";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useMemo, useState, type PropsWithChildren } from "react";
import type Area from "@/components/generics/Area/GenericArea.types";
import {
  GenericFormContext,
  type ActionCallback,
  type GenericFormContextType,
} from "@/components/generics/Form/GenericForm.context";
import { AscIdProvider } from "../AscId.context";
import FreightPackagingCostConfigurationArea from "./FreightPackagingCostConfigurationArea";
import FreightPackagingFields from "./FreightPackagingFields";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Icon: () => <span />,
  Button: ({
    children,
    onClick,
    "data-testid": testId,
  }: Readonly<{
    children: string;
    onClick: () => void;
    "data-testid"?: string;
  }>) => (
    <button type="button" data-testid={testId} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/generics/Field/GenericField", () => ({
  default: function MockGenericField({
    field,
  }: Readonly<{ field: { name: string; isDisabled?: boolean } }>) {
    const { values } = useFormikContext<Record<string, unknown>>();
    return (
      <input
        data-testid={field.name}
        data-value={formatFormValue(values[field.name])}
        type="checkbox"
        checked={values[field.name] === true}
        disabled={field.isDisabled}
        readOnly
      />
    );
  },
}));

function formatFormValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

const makeArea = (costType: "Freight" | "Packaging"): Area => ({
  name: costType === "Freight" ? "freightCostConfiguration" : "packagingCostConfiguration",
  label: "",
  position: 1,
  fields: [
    {
      name: costType === "Freight" ? "toggleFreightCost" : "togglePackagingCost",
      label: "toggleActive",
      type: "toggle",
    },
  ],
  dependFieldCondition: "",
  dependentFields: [],
  actions: [],
  isSubArea: false,
});

const makeCostFieldsArea = (costType: "Freight" | "Packaging"): Area => ({
  name: `${costType.toLowerCase()}CostType`,
  label: "",
  position: 1,
  fields: [
    {
      name: `typeOfCost${costType}Level1`,
      label: "",
      type: "radiogroup",
      defaultValue: "NO_LIMIT",
    },
    {
      name: "defaultCostNoLimitLevel1",
      label: "defaultCost",
      type: "number",
      dependentFields: [{ fieldName: `typeOfCost${costType}Level1`, fieldValue: "NO_LIMIT" }],
    },
    {
      name: "defaultCostFixedLevel1",
      label: "defaultCost",
      type: "number",
      dependentFields: [{ fieldName: `typeOfCost${costType}Level1`, fieldValue: "FIXED_COST" }],
    },
  ],
  dependFieldCondition: "",
  dependentFields: [],
  actions: [],
  isSubArea: false,
});

function renderArea({
  costType = "Freight",
  defaultValue = false,
  limits = [],
  ascValue,
  ascLimits = [],
  formValue,
  onSaveUpdate,
}: {
  costType?: "Freight" | "Packaging";
  defaultValue?: boolean;
  limits?: Array<Record<string, unknown>>;
  ascValue?: boolean;
  ascLimits?: Array<Record<string, unknown>>;
  formValue?: boolean;
  onSaveUpdate?: ActionCallback;
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ascId = ascValue === undefined ? undefined : "asc-1";
  const toggleName = costType === "Freight" ? "toggleFreightCost" : "togglePackagingCost";
  const detailName = costType === "Freight" ? "freightCostDetails" : "packagingCostDetails";

  queryClient.setQueryData(["user"], { countryCode: "TR" });
  queryClient.setQueryData(["countryConfiguration", "TR"], {
    isFreightAllowed: true,
    isPackagingAllowed: true,
  });
  queryClient.setQueryData(["laborCostConfig", "TR"], {
    [detailName]: { isAllowed: defaultValue, limits },
  });
  if (ascValue !== undefined) {
    queryClient.setQueryData(["ASC", ascId], {
      serviceCenter: { [detailName]: { isAllowed: ascValue, limits: ascLimits } },
    });
  }

  function EditStateProvider({ children }: Readonly<PropsWithChildren>) {
    const [freightPackagingEditState, setFreightPackagingEditState] = useState({
      freight: false,
      packaging: false,
    });
    const contextValue = useMemo<GenericFormContextType>(() => {
      const actionCallbacks: Record<string, ActionCallback> = {};
      if (onSaveUpdate) actionCallbacks.onSaveUpdate = onSaveUpdate;
      return {
        allFields: [],
        setAllFields: () => {},
        mandatoryFields: null,
        setMandatoryFields: () => {},
        actionCallbacks,
        freightPackagingEditState,
        setFreightPackagingEditState,
        selectedFreightRule: "level1Freight",
        selectedPackagingRule: "level1Packaging",
      };
    }, [freightPackagingEditState, onSaveUpdate]);
    return (
      <GenericFormContext.Provider value={contextValue}>{children}</GenericFormContext.Provider>
    );
  }

  render(
    <QueryClientProvider client={queryClient}>
      <AscIdProvider value={ascId}>
        <EditStateProvider>
          <Formik
            initialValues={{
              ...(formValue === undefined ? {} : { [toggleName]: formValue }),
              [`typeOfCost${costType}Level1`]: "NO_LIMIT",
            }}
            onSubmit={() => {}}
          >
            {({ values, setFieldValue }) => (
              <>
                {[1, 2, 3].map((level) => (
                  <output key={level} data-testid={`radio-level-${level}`}>
                    {formatFormValue(values[`typeOfCost${costType}Level${level}`])}
                  </output>
                ))}
                {[1, 2, 3].flatMap((level) =>
                  [
                    "defaultCostNoLimit",
                    "maximumCostMaximum",
                    "defaultCostMaximum",
                    "defaultCostFixed",
                  ].map((fieldPrefix) => {
                    const fieldName = `${costType.toLowerCase()}CostType_${fieldPrefix}Level${level}`;
                    return (
                      <output key={fieldName} data-testid={`input-${fieldName}`}>
                        {formatFormValue(values[fieldName])}
                      </output>
                    );
                  }),
                )}
                <button
                  type="button"
                  data-testid="change-level-1-radio"
                  onClick={() => void setFieldValue(`typeOfCost${costType}Level1`, "FIXED_COST")}
                >
                  Change radio
                </button>
                <button
                  type="button"
                  data-testid="change-toggle"
                  onClick={() => void setFieldValue(toggleName, !values[toggleName])}
                >
                  Change toggle
                </button>
                <FreightPackagingCostConfigurationArea area={makeArea(costType)} />
                <FreightPackagingFields area={makeCostFieldsArea(costType)} />
              </>
            )}
          </Formik>
        </EditStateProvider>
      </AscIdProvider>
    </QueryClientProvider>,
  );

  return screen.getByTestId(toggleName);
}

describe("FreightPackagingCostConfigurationArea", () => {
  const limitValue = (limitType: string, defaultValue = 0, highestLimit = 0) => ({
    limitType,
    lowestLimit: 0,
    highestLimit,
    defaultValue,
  });

  const allLevelLimits = (l1: string, l2: string, l3: string) => [
    { types: [], l1: limitValue(l1), l2: limitValue(l2), l3: limitValue(l3) },
  ];

  it("sets the freight toggle from service-cost configuration when creating an ASC", async () => {
    renderArea({ defaultValue: true });

    await waitFor(() =>
      expect(screen.getByTestId("toggleFreightCost")).toHaveAttribute("data-value", "true"),
    );
  });

  it("prefers a saved draft value over the service-cost default", async () => {
    renderArea({ defaultValue: true, ascValue: false });

    await waitFor(() =>
      expect(screen.getByTestId("toggleFreightCost")).toHaveAttribute("data-value", "false"),
    );
  });

  it("does not overwrite an existing Formik value", async () => {
    renderArea({ defaultValue: true, formValue: false });

    await waitFor(() =>
      expect(screen.getByTestId("toggleFreightCost")).toHaveAttribute("data-value", "false"),
    );
  });

  it("sets the packaging toggle from service-cost configuration", async () => {
    renderArea({ costType: "Packaging", defaultValue: true });

    await waitFor(() =>
      expect(screen.getByTestId("togglePackagingCost")).toHaveAttribute("data-value", "true"),
    );
  });

  it("selects radio defaults from the service-cost limit types", async () => {
    renderArea({
      limits: allLevelLimits("ACTUAL_AMOUNT", "CAPPED_AMOUNT", "FIXED_AMOUNT"),
    });

    await waitFor(() => {
      expect(screen.getByTestId("radio-level-1")).toHaveTextContent("NO_LIMIT");
      expect(screen.getByTestId("radio-level-2")).toHaveTextContent("MAXIMUM_COST");
      expect(screen.getByTestId("radio-level-3")).toHaveTextContent("FIXED_COST");
    });
  });

  it("populates only inputs for the API-selected radio option", async () => {
    renderArea({
      limits: [
        {
          types: [],
          l1: { ...limitValue("ACTUAL_AMOUNT"), defaultValue: 12 },
          l2: { ...limitValue("CAPPED_AMOUNT"), highestLimit: 250, defaultValue: 75 },
          l3: { ...limitValue("FIXED_AMOUNT"), defaultValue: 42 },
        },
      ],
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("input-freightCostType_defaultCostNoLimitLevel1"),
      ).toHaveTextContent("12");
      expect(
        screen.getByTestId("input-freightCostType_maximumCostMaximumLevel1"),
      ).toHaveTextContent("0");
      expect(
        screen.getByTestId("input-freightCostType_maximumCostMaximumLevel2"),
      ).toHaveTextContent("250");
      expect(
        screen.getByTestId("input-freightCostType_defaultCostMaximumLevel2"),
      ).toHaveTextContent("75");
      expect(screen.getByTestId("input-freightCostType_defaultCostFixedLevel3")).toHaveTextContent(
        "42",
      );
      expect(
        screen.getByTestId("input-freightCostType_defaultCostNoLimitLevel3"),
      ).toHaveTextContent("0");
    });
  });

  it("prefers saved ASC radio values over service-cost defaults", async () => {
    const savedLimits = allLevelLimits("CAPPED_AMOUNT", "FIXED_AMOUNT", "ACTUAL_AMOUNT")[0];
    renderArea({
      limits: allLevelLimits("ACTUAL_AMOUNT", "ACTUAL_AMOUNT", "ACTUAL_AMOUNT"),
      ascValue: true,
      ascLimits: [{ ...savedLimits, l3: null }],
    });

    await waitFor(() => {
      expect(screen.getByTestId("radio-level-1")).toHaveTextContent("MAXIMUM_COST");
      expect(screen.getByTestId("radio-level-2")).toHaveTextContent("FIXED_COST");
      expect(screen.getByTestId("radio-level-3")).toHaveTextContent("NO_LIMIT");
    });
  });

  it("does not reset a radio after the user changes it", async () => {
    renderArea({
      limits: [{ types: [], l1: limitValue("ACTUAL_AMOUNT", 12), l2: null, l3: null }],
    });

    await waitFor(() => {
      expect(screen.getByTestId("radio-level-1")).toHaveTextContent("NO_LIMIT");
      expect(
        screen.getByTestId("input-freightCostType_defaultCostNoLimitLevel1"),
      ).toHaveTextContent("12");
    });
    fireEvent.click(screen.getByTestId("change-level-1-radio"));

    await waitFor(() => {
      expect(screen.getByTestId("radio-level-1")).toHaveTextContent("FIXED_COST");
      expect(screen.getByTestId("input-freightCostType_defaultCostFixedLevel1")).toHaveTextContent(
        "1",
      );
    });
  });

  it("hides the pencil and enters edit mode when clicked", async () => {
    const view = renderArea({});
    await waitFor(() =>
      expect(screen.getByTestId("toggleFreightCost")).toHaveAttribute("data-value", "false"),
    );
    expect(view).toBeDisabled();

    fireEvent.click(screen.getByTestId("edit-button-freight-cost-configuration"));

    expect(screen.queryByTestId("edit-button-freight-cost-configuration")).not.toBeInTheDocument();
    expect(view).toBeEnabled();
  });

  it("restores the pre-edit toggle and radio values when canceled", async () => {
    const user = userEvent.setup();
    const view = renderArea({ formValue: false });
    await waitFor(() =>
      expect(screen.getByTestId("toggleFreightCost")).toHaveAttribute("data-value", "false"),
    );

    await user.click(screen.getByTestId("edit-button-freight-cost-configuration"));
    await user.click(screen.getByTestId("change-toggle"));
    await user.click(screen.getByTestId("change-level-1-radio"));
    await user.click(screen.getByTestId("cancel-button-freight-cost-configuration"));

    expect(view).toHaveAttribute("data-value", "false");
    expect(screen.getByTestId("radio-level-1")).toHaveTextContent("NO_LIMIT");
    expect(screen.getByTestId("edit-button-freight-cost-configuration")).toBeInTheDocument();
  });

  it("saves through the ASC update callback with the edited values", async () => {
    const user = userEvent.setup();
    const onSaveUpdate = vi.fn();
    renderArea({ formValue: false, onSaveUpdate });
    await waitFor(() =>
      expect(screen.getByTestId("toggleFreightCost")).toHaveAttribute("data-value", "false"),
    );

    await user.click(screen.getByTestId("edit-button-freight-cost-configuration"));
    await user.click(screen.getByTestId("change-toggle"));
    await user.click(screen.getByTestId("save-button-freight-cost-configuration"));

    expect(onSaveUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ toggleFreightCost: true }),
      expect.objectContaining({ setFieldValue: expect.any(Function) }),
    );
  });
});
