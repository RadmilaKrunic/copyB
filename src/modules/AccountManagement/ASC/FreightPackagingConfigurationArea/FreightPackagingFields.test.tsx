import { Formik, useFormikContext } from "formik";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMemo, useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type Area from "@/components/generics/Area/GenericArea.types";
import { GenericFormContext } from "@/components/generics/Form/GenericForm.context";
import useFieldVisibilityReset from "@/components/generics/Field/useFieldVisibilityReset";
import type Field from "@/components/generics/Field/GenericField.types";
import FreightPackagingFields from "./FreightPackagingFields";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/generics/Field/GenericField", () => ({
  default: function MockGenericField({ field }: Readonly<{ field: Field }>) {
    const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
    const dependency = field.dependentFields?.[0];
    const isVisible = !dependency || values[dependency.fieldName] === dependency.fieldValue;

    useFieldVisibilityReset({
      isVisible,
      name: field.name,
      formValues: values,
      setFieldValue: (name, value) => void setFieldValue(name, value),
      defaultValue: field.defaultValue,
    });

    if (!isVisible) return null;
    if (field.type === "radiogroup") {
      return (
        <button
          type="button"
          data-testid={field.name}
          disabled={field.isDisabled}
          onClick={() =>
            void setFieldValue(
              field.name,
              values[field.name] === "FIXED_COST" ? "NO_LIMIT" : "FIXED_COST",
            )
          }
        >
          {formatFormValue(values[field.name])}
        </button>
      );
    }

    return (
      <output data-testid={field.name} data-disabled={String(field.isDisabled)}>
        {formatFormValue(values[field.name])}
      </output>
    );
  },
}));

function formatFormValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function renderWithCountryConfiguration(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["user"], { countryCode: "TR" });
  queryClient.setQueryData(["countryConfiguration", "TR"], {
    isFreightAllowed: true,
    isPackagingAllowed: true,
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const area: Area = {
  name: "freightCostType",
  label: "",
  position: 1,
  fields: [
    {
      name: "typeOfCostFreightLevel1",
      label: "",
      type: "radiogroup",
      defaultValue: "NO_LIMIT",
    },
    {
      name: "defaultCostNoLimitLevel1",
      label: "",
      type: "number",
      isSubField: true,
      dependentFields: [{ fieldName: "typeOfCostFreight", fieldValue: "NO_LIMIT" }],
    },
    {
      name: "defaultCostFixedLevel1",
      label: "",
      type: "number",
      isSubField: true,
      dependentFields: [{ fieldName: "typeOfCostFreight", fieldValue: "FIXED_COST" }],
    },
    {
      name: "typeOfCostFreightLevel2",
      label: "",
      type: "radiogroup",
      defaultValue: "NO_LIMIT",
    },
    {
      name: "defaultCostNoLimitLevel2",
      label: "",
      type: "number",
      isSubField: true,
      dependentFields: [{ fieldName: "typeOfCostFreight", fieldValue: "NO_LIMIT" }],
    },
    {
      name: "defaultCostFixedLevel2",
      label: "",
      type: "number",
      isSubField: true,
      dependentFields: [{ fieldName: "typeOfCostFreight", fieldValue: "FIXED_COST" }],
    },
  ] as Field[],
  dependFieldCondition: "",
  dependentFields: [],
  actions: [],
  isSubArea: false,
};

function TestForm({ isEditing }: Readonly<{ isEditing?: boolean }>) {
  const [selectedFreightRule, setSelectedFreightRule] = useState("level1Freight");
  const { setFieldValue } = useFormikContext<Record<string, unknown>>();
  const { values } = useFormikContext<Record<string, unknown>>();
  const contextValue = useMemo(
    () => ({
      allFields: area.fields,
      setAllFields: () => {},
      mandatoryFields: null,
      setMandatoryFields: () => {},
      actionCallbacks: {},
      selectedFreightRule,
      freightPackagingEditState:
        isEditing === undefined ? undefined : { freight: isEditing, packaging: false },
    }),
    [isEditing, selectedFreightRule],
  );

  return (
    <GenericFormContext.Provider value={contextValue}>
      <button type="button" onClick={() => setSelectedFreightRule("level2Freight")}>
        Level 2
      </button>
      <button type="button" onClick={() => setSelectedFreightRule("level1Freight")}>
        Level 1
      </button>
      <FreightPackagingFields area={area} />
      <output data-testid="level-1-no-limit-value">
        {typeof values.freightCostType_defaultCostNoLimitLevel1 === "number"
          ? values.freightCostType_defaultCostNoLimitLevel1
          : ""}
      </output>
      <output data-testid="level-1-fixed-value">
        {typeof values.freightCostType_defaultCostFixedLevel1 === "number"
          ? values.freightCostType_defaultCostFixedLevel1
          : ""}
      </output>
      <button
        type="button"
        onClick={() => void setFieldValue("typeOfCostFreightLevel2", "FIXED_COST")}
      >
        Change level 2 radio
      </button>
    </GenericFormContext.Provider>
  );
}

describe("FreightPackagingFields", () => {
  it("disables radio and number fields until freight editing is enabled", () => {
    renderWithCountryConfiguration(
      <Formik
        initialValues={{
          toggleFreightCost: true,
          typeOfCostFreightLevel1: "NO_LIMIT",
        }}
        onSubmit={() => {}}
      >
        <TestForm isEditing={false} />
      </Formik>,
    );

    expect(screen.getByTestId("typeOfCostFreightLevel1")).toBeDisabled();
    expect(screen.getByTestId("freightCostType_defaultCostNoLimitLevel1")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("keeps controls editable when no overview edit state is provided", () => {
    renderWithCountryConfiguration(
      <Formik
        initialValues={{
          toggleFreightCost: true,
          typeOfCostFreightLevel1: "NO_LIMIT",
        }}
        onSubmit={() => {}}
      >
        <TestForm />
      </Formik>,
    );

    expect(screen.getByTestId("typeOfCostFreightLevel1")).toBeEnabled();
    expect(screen.getByTestId("freightCostType_defaultCostNoLimitLevel1")).toHaveAttribute(
      "data-disabled",
      "false",
    );
  });

  it("preserves values for other radio choices while changing levels and choices", async () => {
    const user = userEvent.setup();

    renderWithCountryConfiguration(
      <Formik
        initialValues={{
          toggleFreightCost: true,
          typeOfCostFreightLevel1: "NO_LIMIT",
          typeOfCostFreightLevel2: "NO_LIMIT",
          freightCostType_defaultCostNoLimitLevel1: 11,
          freightCostType_defaultCostFixedLevel1: 12,
          freightCostType_defaultCostNoLimitLevel2: 21,
          freightCostType_defaultCostFixedLevel2: 22,
        }}
        onSubmit={() => {}}
      >
        <TestForm />
      </Formik>,
    );

    await user.click(screen.getByTestId("typeOfCostFreightLevel1"));
    await user.click(screen.getByText("Level 2"));
    await user.click(screen.getByText("Change level 2 radio"));
    await user.click(screen.getByText("Level 1"));

    expect(screen.getByTestId("level-1-no-limit-value")).toHaveTextContent("11");
    await user.click(screen.getByTestId("typeOfCostFreightLevel1"));
    expect(screen.getByTestId("freightCostType_defaultCostNoLimitLevel1")).toHaveTextContent("11");
    expect(screen.getByTestId("level-1-fixed-value")).toHaveTextContent("12");
  });
});
