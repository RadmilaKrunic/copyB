import { Ranges, RepairCosts } from "../../../../api/services/laborCost/laborCost";
import {
  RepairCosts as ServiceCenterRepairCosts,
  Ranges as ServiceCenterRanges,
} from "../../../../api/services/serviceCenters/serviceCenters.types";
import Area from "@/components/generics/Area/GenericArea.types";
import { LABOR_REPAIR_UPDATE_TARGET } from "../ASC.utils";

const LABOR_RATE_FIELDS = ["laborRateLevel1", "laborRateLevel2", "laborRateLevel3"];
const PRICE_LEVEL = ["L1", "L2", "L3"];

export const showLaborRulesMatrix = (
  laborCostConfig: RepairCosts[] | ServiceCenterRepairCosts[] | undefined,
  selectedLaborRepairRule: string | undefined | null,
): RepairCosts | ServiceCenterRepairCosts | undefined => {
  switch (selectedLaborRepairRule) {
    case LABOR_REPAIR_UPDATE_TARGET.actionNames[0]:
      return laborCostConfig?.find((rc) => rc.level === PRICE_LEVEL[0]);
    case LABOR_REPAIR_UPDATE_TARGET.actionNames[1]:
      return laborCostConfig?.find((rc) => rc.level === PRICE_LEVEL[1]);
    case LABOR_REPAIR_UPDATE_TARGET.actionNames[2]:
      return laborCostConfig?.find((rc) => rc.level === PRICE_LEVEL[2]);
  }
};

export const fillLaborRateField = (
  laborRulesTable: RepairCosts | ServiceCenterRepairCosts | undefined,
  area: Area,
) => {
  if (!laborRulesTable) return undefined;
  switch (laborRulesTable.level) {
    case PRICE_LEVEL[0]:
      return area.fields.find((field) => field.name === LABOR_RATE_FIELDS[0]);
    case PRICE_LEVEL[1]:
      return area.fields.find((field) => field.name === LABOR_RATE_FIELDS[1]);
    case PRICE_LEVEL[2]:
      return area.fields.find((field) => field.name === LABOR_RATE_FIELDS[2]);
  }
};

export const formatRangesAndValues = (
  range: Ranges | ServiceCenterRanges,
): {
  labourUnitRange: string;
  laborValue: number;
} => {
  return {
    labourUnitRange: `${range.labourUnitRange[0]} - ${range.labourUnitRange.at(-1)}`,
    laborValue: range.value,
  };
};
