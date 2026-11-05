import { LaborCostMethod } from "../../../../api/services/laborCost/laborCost";
import { LaborCostMethod as ServiceCenterLaborCostMethod } from "../../../../api/services/serviceCenters/serviceCenters.types";

type LaborExchangeMethodKey = "newToolExchange" | "accessoryExchange" | "sparePartsExchange";
type LaborCostMethodConfig = LaborCostMethod | ServiceCenterLaborCostMethod | undefined;

type LaborExchangeMethod = {
  reasonMapping: {
    reasonType: string;
    matrix: {
      level: string;
      laborUnit?: string | number;
      labourUnit?: string | number;
    }[];
  }[];
};

export interface LaborExchangeRow {
  reasonType: string;
  sparePartLaborUnit: number;
  newToolExchangeLaborUnit: number;
  accessoryLaborUnit: number;
}

export const LABOR_EXCHANGE_RULES_TO_LEVEL: Record<string, string> = {
  level1Exchange: "L1",
  level2Exchange: "L2",
  level3Exchange: "L3",
};

const LABOR_EXCHANGE_METHOD_ORDER: LaborExchangeMethodKey[] = [
  "sparePartsExchange",
  "newToolExchange",
  "accessoryExchange",
];

export const LABOR_COST_PER_UNIT_FIELD_BASE_NAMES: Record<LaborExchangeMethodKey, string> = {
  sparePartsExchange: "laborCostPerUnitSparePartsExchange",
  newToolExchange: "laborCostPerUnitNewToolExchange",
  accessoryExchange: "laborCostPerUnitAccessoryExchange",
};

const isLaborExchangeMethod = (
  value: string | undefined | null,
): value is LaborExchangeMethodKey => {
  return LABOR_EXCHANGE_METHOD_ORDER.includes(value as LaborExchangeMethodKey);
};

const getSelectedLaborExchangeMethod = (
  laborCostConfig: LaborCostMethod,
  selectedLaborExchangeFieldValue: string | undefined | null,
): LaborExchangeMethod | undefined => {
  if (!isLaborExchangeMethod(selectedLaborExchangeFieldValue)) {
    return undefined;
  }

  return laborCostConfig?.[selectedLaborExchangeFieldValue] as LaborExchangeMethod | undefined;
};

const getOrderedReasonTypes = (laborCostConfig: LaborCostMethodConfig): string[] => {
  const laborCostMethod = laborCostConfig;
  if (!laborCostMethod) {
    return [];
  }

  const orderedReasonTypes: string[] = [];
  const seenReasonTypes = new Set<string>();

  LABOR_EXCHANGE_METHOD_ORDER.forEach((methodKey) => {
    const reasonMappings = laborCostMethod[methodKey]?.reasonMapping ?? [];

    reasonMappings.forEach(({ reasonType }) => {
      if (seenReasonTypes.has(reasonType)) {
        return;
      }

      seenReasonTypes.add(reasonType);
      orderedReasonTypes.push(reasonType);
    });
  });

  return orderedReasonTypes;
};

const getLaborUnitForReason = (
  laborCostConfig: LaborCostMethodConfig,
  methodKey: LaborExchangeMethodKey,
  reasonType: string,
  selectedLevel: string,
) => {
  const method = laborCostConfig?.[methodKey];
  const reasonMapping = method?.reasonMapping.find((reason) => reason.reasonType === reasonType);
  const selectedMatrix = reasonMapping?.matrix.find(
    (matrixItem) => matrixItem.level === selectedLevel,
  );
  const matrixLaborUnit = selectedMatrix as
    | { laborUnit?: string | number; labourUnit?: string | number }
    | undefined;

  return String(matrixLaborUnit?.laborUnit ?? matrixLaborUnit?.labourUnit ?? "");
};

const mapReasonTypeRow = (
  laborCostConfig: LaborCostMethodConfig,
  reasonType: string,
  selectedLevel: string,
): LaborExchangeRow => {
  return {
    reasonType,
    sparePartLaborUnit: Number(
      getLaborUnitForReason(laborCostConfig, "sparePartsExchange", reasonType, selectedLevel),
    ),
    newToolExchangeLaborUnit: Number(
      getLaborUnitForReason(laborCostConfig, "newToolExchange", reasonType, selectedLevel),
    ),
    accessoryLaborUnit: Number(
      getLaborUnitForReason(laborCostConfig, "accessoryExchange", reasonType, selectedLevel),
    ),
  };
};

export const mapLaborExchangeRows = (
  laborCostConfig: LaborCostMethodConfig,
  selectedLaborExchangeRule: string | undefined | null,
): LaborExchangeRow[] => {
  const selectedLevel = LABOR_EXCHANGE_RULES_TO_LEVEL[selectedLaborExchangeRule ?? ""];

  if (!selectedLevel) {
    return [];
  }

  return getOrderedReasonTypes(laborCostConfig).map((reasonType) =>
    mapReasonTypeRow(laborCostConfig, reasonType, selectedLevel),
  );
};

export const showLaborRulesTable = (
  laborCostConfig: LaborCostMethodConfig,
  selectedLaborExchangeRule: string | undefined | null,
): LaborExchangeRow[] => {
  return mapLaborExchangeRows(laborCostConfig, selectedLaborExchangeRule);
};

export const selectedLaborExchangeAction = (
  laborCostConfig: LaborCostMethod,
  selectedLaborExchangeFieldValue: string | undefined | null,
) => {
  return getSelectedLaborExchangeMethod(laborCostConfig, selectedLaborExchangeFieldValue);
};

export const mapLaborCostPerUnitLevelFields = (
  laborCostConfig: LaborCostMethodConfig,
  selectedLaborExchangeRule: string | undefined | null,
): Record<string, number> => {
  const selectedLevel = LABOR_EXCHANGE_RULES_TO_LEVEL[selectedLaborExchangeRule ?? ""];
  const laborCostPerUnitLevels: Record<string, number> = {};
  if (!selectedLevel) {
    return {};
  }
  LABOR_EXCHANGE_METHOD_ORDER.forEach((methodKey) => {
    laborCostPerUnitLevels[methodKey] =
      laborCostConfig?.[methodKey].prices.find((price) => price.level === selectedLevel)
        ?.unitPrice ?? 0;
  });
  return laborCostPerUnitLevels;
};

export const trimReasonForExchange = (reason: string): string => {
  return reason.split(" - ").slice(1).join(" - ").trim();
};

export const getExchangeRuleMethod = (
  laborCostConfig: LaborCostMethodConfig,
  selectedLaborExchangeRule: string | undefined | null,
): string => {
  const selectedLevel = LABOR_EXCHANGE_RULES_TO_LEVEL[selectedLaborExchangeRule ?? ""];
  return (
    laborCostConfig?.newToolExchange.prices.find((price) => price.level === selectedLevel)
      ?.method ?? ""
  );
};
