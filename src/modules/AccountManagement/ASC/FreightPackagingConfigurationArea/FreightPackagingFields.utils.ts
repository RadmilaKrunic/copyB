import type Field from "@/components/generics/Field/GenericField.types";
import type { CostLimit, CostLimitValue } from "@/api/services/serviceCenters/serviceCenters.types";
import type { CountryConfig } from "@/api/services/countryConfiguration/countryConfiguration";

export const FREIGHT_RULE_DEFAULT = "level1Freight";
export const PACKAGING_RULE_DEFAULT = "level1Packaging";

type CostConfigurationType = "Freight" | "Packaging";

export interface FreightPackagingEditState {
  freight: boolean;
  packaging: boolean;
  editValues?: Partial<Record<"freight" | "packaging", Record<string, unknown>>>;
}

const COST_RULE_DEFAULTS: Record<CostConfigurationType, string> = {
  Freight: FREIGHT_RULE_DEFAULT,
  Packaging: PACKAGING_RULE_DEFAULT,
};

const COST_TOGGLE_FIELD_NAMES: Record<CostConfigurationType, string> = {
  Freight: "toggleFreightCost",
  Packaging: "togglePackagingCost",
};

const COST_INPUT_FIELD_PREFIXES: Record<CostConfigurationType, string> = {
  Freight: "freightCostType_",
  Packaging: "packagingCostType_",
};

const LIMIT_TYPE_TO_RADIO_VALUE: Record<string, string> = {
  ACTUAL_AMOUNT: "NO_LIMIT",
  CAPPED_AMOUNT: "MAXIMUM_COST",
  FIXED_AMOUNT: "FIXED_COST",
};

const COST_LIMIT_LEVELS = [
  { apiLevel: "l1", fieldSuffix: "Level1" },
  { apiLevel: "l2", fieldSuffix: "Level2" },
  { apiLevel: "l3", fieldSuffix: "Level3" },
] as const;

const COST_RULE_TO_LEVEL_SUFFIX: Record<string, string> = {
  level1Freight: "Level1",
  level2Freight: "Level2",
  level3Freight: "Level3",
  level1Packaging: "Level1",
  level2Packaging: "Level2",
  level3Packaging: "Level3",
};

export const isFreightPackagingAllowed = (
  countryConfiguration: Pick<CountryConfig, "isFreightAllowed" | "isPackagingAllowed"> | undefined,
  costType: CostConfigurationType,
): boolean =>
  costType === "Freight"
    ? countryConfiguration?.isFreightAllowed === true
    : countryConfiguration?.isPackagingAllowed === true;

export const shouldShowFreightPackagingConfiguration = (
  countryConfiguration: Pick<CountryConfig, "isFreightAllowed" | "isPackagingAllowed"> | undefined,
): boolean =>
  countryConfiguration?.isFreightAllowed !== false ||
  countryConfiguration?.isPackagingAllowed !== false;

export const isCostConfigurationEnabled = (
  values: Record<string, unknown>,
  costType: CostConfigurationType,
): boolean => values[COST_TOGGLE_FIELD_NAMES[costType]] === true;

const getNumericFormValue = (values: Record<string, unknown>, fieldName: string): number => {
  const value = values[fieldName];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsedValue = Number(value);
    if (Number.isFinite(parsedValue)) return parsedValue;
  }
  return 0;
};

const mapFormValuesToCostLimit = (
  values: Record<string, unknown>,
  costType: CostConfigurationType,
  fieldSuffix: string,
): CostLimitValue => {
  const radioValue = values[`typeOfCost${costType}${fieldSuffix}`];
  const inputPrefix = COST_INPUT_FIELD_PREFIXES[costType];
  const noLimitDefault = getNumericFormValue(
    values,
    `${inputPrefix}defaultCostNoLimit${fieldSuffix}`,
  );
  const maximumLimit = getNumericFormValue(
    values,
    `${inputPrefix}maximumCostMaximum${fieldSuffix}`,
  );
  const maximumDefault = getNumericFormValue(
    values,
    `${inputPrefix}defaultCostMaximum${fieldSuffix}`,
  );
  const fixedDefault = getNumericFormValue(values, `${inputPrefix}defaultCostFixed${fieldSuffix}`);

  if (radioValue === "MAXIMUM_COST") {
    return {
      limitType: "CAPPED_AMOUNT",
      lowestLimit: 0,
      highestLimit: maximumLimit,
      defaultValue: maximumDefault,
    };
  }

  if (radioValue === "FIXED_COST") {
    const fixedDefaultFallback = fixedDefault === 0 ? 1 : fixedDefault;
    return {
      limitType: "FIXED_AMOUNT",
      lowestLimit: fixedDefaultFallback,
      highestLimit: fixedDefaultFallback,
      defaultValue: fixedDefaultFallback,
    };
  }

  if (radioValue === "ZERO_AMOUNT") {
    return {
      limitType: "ZERO_AMOUNT",
      lowestLimit: 0,
      highestLimit: 0,
      defaultValue: 0,
    };
  }

  return {
    limitType: "ACTUAL_AMOUNT",
    lowestLimit: 0,
    highestLimit: 99999999,
    defaultValue: noLimitDefault,
  };
};

export const mapCostDetailsToPayload = (
  costDetails: { isAllowed: boolean; limits: CostLimit[] } | undefined,
  values: Record<string, unknown>,
  costType: CostConfigurationType,
): { isAllowed: boolean; limits: CostLimit[] } => ({
  isAllowed:
    typeof values[COST_TOGGLE_FIELD_NAMES[costType]] === "boolean"
      ? (values[COST_TOGGLE_FIELD_NAMES[costType]] as boolean)
      : (costDetails?.isAllowed ?? false),
  limits: (costDetails?.limits ?? []).map((limit) => ({
    types: limit.types,
    l1: mapFormValuesToCostLimit(values, costType, COST_LIMIT_LEVELS[0].fieldSuffix),
    l2: mapFormValuesToCostLimit(values, costType, COST_LIMIT_LEVELS[1].fieldSuffix),
    l3: mapFormValuesToCostLimit(values, costType, COST_LIMIT_LEVELS[2].fieldSuffix),
  })),
});

export const getCostRadioValuesFromLimits = (
  limits: CostLimit[] | undefined,
  costType: CostConfigurationType,
): Record<string, string> => {
  const radioValues: Record<string, string> = {};

  COST_LIMIT_LEVELS.forEach(({ apiLevel, fieldSuffix }) => {
    const limitType = limits?.find((limit) => limit[apiLevel]?.limitType)?.[apiLevel]?.limitType;
    const radioValue = LIMIT_TYPE_TO_RADIO_VALUE[limitType ?? ""];
    if (radioValue) {
      radioValues[`typeOfCost${costType}${fieldSuffix}`] = radioValue;
    }
  });

  return radioValues;
};

export const getCostInputValuesFromLimits = (
  savedLimits: CostLimit[] | undefined,
  configuredLimits: CostLimit[] | undefined,
  costType: CostConfigurationType,
): Record<string, number> => {
  const inputValues: Record<string, number> = {};
  const fieldPrefix = COST_INPUT_FIELD_PREFIXES[costType];

  COST_LIMIT_LEVELS.forEach(({ apiLevel, fieldSuffix }) => {
    const noLimitDefaultField = `${fieldPrefix}defaultCostNoLimit${fieldSuffix}`;
    const maximumField = `${fieldPrefix}maximumCostMaximum${fieldSuffix}`;
    const maximumDefaultField = `${fieldPrefix}defaultCostMaximum${fieldSuffix}`;
    const fixedDefaultField = `${fieldPrefix}defaultCostFixed${fieldSuffix}`;

    inputValues[noLimitDefaultField] = 0;
    inputValues[maximumField] = 0;
    inputValues[maximumDefaultField] = 0;
    inputValues[fixedDefaultField] = 1;

    const savedLevelLimit = savedLimits?.find((limit) => limit[apiLevel] !== null)?.[apiLevel];
    const configuredLevelLimit = configuredLimits?.find((limit) => limit[apiLevel] !== null)?.[
      apiLevel
    ];
    const levelLimit = savedLevelLimit ?? configuredLevelLimit;
    if (!levelLimit) return;

    switch (levelLimit.limitType) {
      case "ACTUAL_AMOUNT":
        inputValues[noLimitDefaultField] = levelLimit.defaultValue ?? 0;
        break;
      case "CAPPED_AMOUNT":
        inputValues[maximumField] = levelLimit.highestLimit ?? 0;
        inputValues[maximumDefaultField] = levelLimit.defaultValue ?? 0;
        break;
      case "FIXED_AMOUNT":
        inputValues[fixedDefaultField] = levelLimit.defaultValue ?? 1;
        break;
    }
  });

  return inputValues;
};

const getRadioFieldName = (
  selectedRule: string | null | undefined,
  costType: CostConfigurationType,
): string => {
  const levelSuffix =
    COST_RULE_TO_LEVEL_SUFFIX[selectedRule ?? ""] ??
    COST_RULE_TO_LEVEL_SUFFIX[COST_RULE_DEFAULTS[costType]];
  return `typeOfCost${costType}${levelSuffix}`;
};

export const getCostFieldsForSelectedLevel = (
  fields: Field[],
  selectedRule: string | null | undefined,
  costType: CostConfigurationType,
): Field[] => {
  const radioFieldName = getRadioFieldName(selectedRule, costType);
  const levelSuffix = radioFieldName.slice(`typeOfCost${costType}`.length);
  const radioFieldPrefix = `typeOfCost${costType}`;

  return fields
    .filter((field) => field.name.endsWith(levelSuffix))
    .map((field) => ({
      ...field,
      dependentFields: field.dependentFields?.map((dependency) =>
        dependency.fieldName === radioFieldPrefix ||
        dependency.fieldName.startsWith(`${radioFieldPrefix}Level`)
          ? { ...dependency, fieldName: radioFieldName }
          : dependency,
      ),
    }));
};

export const getCostInputFieldsForSelectedLevel = (
  fields: Field[],
  radioFieldName: string | undefined,
  selectedRadioValue: unknown,
  costType: CostConfigurationType,
): Field[] => {
  const costFieldPrefix = `${costType.toLowerCase()}CostType_`;

  return fields
    .filter((field) => field.type === "number")
    .filter((field) => {
      const radioDependency = field.dependentFields?.find(
        (dependency) => dependency.fieldName === radioFieldName,
      );
      return !radioDependency || radioDependency.fieldValue === selectedRadioValue;
    })
    .map((field) =>
      field.name.startsWith(costFieldPrefix)
        ? field
        : { ...field, name: `${costFieldPrefix}${field.name}` },
    );
};

export const getCostInfoFieldsForSelectedLevel = (
  fields: Field[],
  selectedRule: string | null | undefined,
  costType: CostConfigurationType,
  values: Record<string, unknown>,
): Field[] => {
  const radioFieldName = getRadioFieldName(selectedRule, costType);
  const selectedCostType = values[radioFieldName];

  return fields.filter(
    (field) =>
      field.type === "infoIcon" &&
      field.dependentFields?.some(
        (dependency) =>
          dependency.fieldName === radioFieldName && dependency.fieldValue === selectedCostType,
      ),
  );
};
