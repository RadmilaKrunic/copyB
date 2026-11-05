import {
  ReimbursementConfiguration,
  ServiceCenter,
  LaborCostMethod as ServiceCenterLaborCostMethod,
  ExchangeCostDetails,
  RepairCosts as ServiceCenterRepairCosts,
} from "../../../api/services/serviceCenters/serviceCenters.types";
import {
  LaborCostMethod as LaborCostConfigMethod,
  ExchangePrices as LaborCostExchangePrices,
  RepairCosts,
} from "../../../api/services/laborCost/laborCost";
import Section from "../../../components/generics/Section/GenericSection.types";
import { GenericActions } from "../../../components/generics/Action/GenericAction.types";
import type { LaborExchangeRow } from "./AscLaborRulesExchangeArea/AscLaborRulesExchangeArea.utils";
import { LABOR_EXCHANGE_RULES_TO_LEVEL } from "./AscLaborRulesExchangeArea/AscLaborRulesExchangeArea.utils";

const LABOR_RULE_TARGETS = {
  repair: {
    sectionName: "internalLaborConfiguration",
    areaName: "repairLaborCalculationArea",
    actionNames: ["level1Repair", "level2Repair", "level3Repair"] as readonly string[],
    defaultActionName: "level1Repair",
    patchAddLaborRule: true,
  },
  exchange: {
    sectionName: "internalLaborConfiguration",
    areaName: "exchangeLaborCalculationArea",
    actionNames: ["level1Exchange", "level2Exchange", "level3Exchange"] as readonly string[],
    defaultActionName: "level1Exchange",
    patchAddLaborRule: false,
  },
};

export const LABOR_REPAIR_UPDATE_TARGET = LABOR_RULE_TARGETS.repair;
export const LABOR_EXCHANGE_UPDATE_TARGET = LABOR_RULE_TARGETS.exchange;

const LABOR_RATE_FIELD_BY_LEVEL: Record<string, string> = {
  L1: "laborRateLevel1",
  L2: "laborRateLevel2",
  L3: "laborRateLevel3",
};

const LABOR_REPAIR_RULE_TO_LEVEL: Record<string, string> = {
  level1Repair: "L1",
  level2Repair: "L2",
  level3Repair: "L3",
};

const LABOR_REPAIR_LEVEL_TO_RULE: Record<string, string> = {
  L1: "level1Repair",
  L2: "level2Repair",
  L3: "level3Repair",
};

const LABOR_EXCHANGE_ROW_LABOR_UNIT_FIELDS = {
  sparePartsExchange: "sparePartLaborUnit",
  newToolExchange: "newToolExchangeLaborUnit",
  accessoryExchange: "accessoryLaborUnit",
} as const;

const LABOR_RULE_STABLE_PRIMARY_ACTIONS = new Set(["addLaborRule", "addLaborExchangeRule"]);

export const LABOR_RULE_DEFAULTS = {
  repair: "level1Repair",
  exchange: "level1Exchange",
};

type LaborRepairArea = Section["areas"][number];
type LaborRuleTarget = typeof LABOR_REPAIR_UPDATE_TARGET | typeof LABOR_EXCHANGE_UPDATE_TARGET;

export const shouldShowAddLaborRuleButton = (
  laborCostConfig: RepairCosts[] | ServiceCenterRepairCosts[] | undefined,
  selectedLaborRepairRule: string | null | undefined,
): boolean => {
  if (!laborCostConfig || !selectedLaborRepairRule) {
    return false;
  }

  const selectedLevel = LABOR_REPAIR_RULE_TO_LEVEL[selectedLaborRepairRule];
  if (!selectedLevel) {
    return false;
  }

  const selectedRepairCost = laborCostConfig.find(
    (repairCost) => repairCost.level === selectedLevel,
  );
  return selectedRepairCost?.method === "MATRIX";
};

export const updateLaborRepairSections = (
  sections: Section[],
  selectedActionName: string,
): Section[] => {
  return updateLaborSections(sections, selectedActionName, LABOR_REPAIR_UPDATE_TARGET);
};

export const updateLaborExchangeSections = (
  sections: Section[],
  selectedActionName: string,
): Section[] => {
  return updateLaborSections(sections, selectedActionName, LABOR_EXCHANGE_UPDATE_TARGET);
};

const updateLaborSections = (
  sections: Section[],
  selectedActionName: string,
  updateTarget: LaborRuleTarget,
): Section[] => {
  return sections.map((section) => {
    if (section.name !== updateTarget.sectionName) {
      return section;
    }

    return {
      ...section,
      areas: section.areas.map((area) =>
        updateLaborAreaActions(area, selectedActionName, updateTarget),
      ),
    };
  });
};

const updateLaborAreaActions = (
  area: LaborRepairArea,
  selectedActionName: string,
  updateTarget: LaborRuleTarget,
): LaborRepairArea => {
  if (area.name !== updateTarget.areaName) {
    return area;
  }

  return {
    ...area,
    actions: (area.actions || []).map((action) => {
      if (action.name && LABOR_RULE_STABLE_PRIMARY_ACTIONS.has(action.name)) {
        return {
          ...action,
          mode: "primary",
        } as GenericActions;
      }

      return {
        ...action,
        mode: action.name === selectedActionName ? "primary" : "secondary",
      } as GenericActions;
    }),
  };
};

export const mapExchangeLaborCostTableDataFromFormValues = (
  tableData: LaborExchangeRow[],
  formValues: Record<string, string | number | undefined>,
): LaborExchangeRow[] => {
  return tableData.map((row, rowIndex) => ({
    ...row,
    sparePartLaborUnit: Number(
      formValues[`sparePartLaborUnits_${rowIndex}`] ?? row.sparePartLaborUnit,
    ),
    newToolExchangeLaborUnit: Number(
      formValues[`newToolExchangeLaborUnits_${rowIndex}`] ?? row.newToolExchangeLaborUnit,
    ),
    accessoryLaborUnit: Number(
      formValues[`accessoryLaborUnits_${rowIndex}`] ?? row.accessoryLaborUnit,
    ),
  }));
};

export const mapLaborCostDetailsToApiPayload = (
  laborCostMethod: LaborCostConfigMethod | undefined,
  formValues: Record<string, unknown>,
  exchangeLaborCostTableDataByRule?: Record<string, LaborExchangeRow[]>,
  repairLaborCostMatrixData?: Record<string, ServiceCenterRepairCosts>,
): ServiceCenterLaborCostMethod => {
  const newToolExchangeLaborCostPerUnits = LABOR_RULE_TARGETS.exchange.actionNames.map(
    (actionName) => Number(formValues[`laborCostPerUnitNewToolExchange_${actionName}`]),
  );
  const accessoryExchangeLaborCostPerUnits = LABOR_RULE_TARGETS.exchange.actionNames.map(
    (actionName) => Number(formValues[`laborCostPerUnitAccessoryExchange_${actionName}`]),
  );
  const sparePartsExchangeLaborCostPerUnits = LABOR_RULE_TARGETS.exchange.actionNames.map(
    (actionName) => Number(formValues[`laborCostPerUnitSparePartsExchange_${actionName}`]),
  );

  return {
    repairCosts:
      laborCostMethod?.repairCostConfiguration?.repairCosts.map((repairCost) =>
        mapRepairCostData(repairCost, formValues, repairLaborCostMatrixData),
      ) ?? [],
    newToolExchange: mapExchangeCostDetails(
      laborCostMethod?.newToolExchange,
      newToolExchangeLaborCostPerUnits,
      exchangeLaborCostTableDataByRule,
      LABOR_EXCHANGE_ROW_LABOR_UNIT_FIELDS.newToolExchange,
    ),
    accessoryExchange: mapExchangeCostDetails(
      laborCostMethod?.accessoryExchange,
      accessoryExchangeLaborCostPerUnits,
      exchangeLaborCostTableDataByRule,
      LABOR_EXCHANGE_ROW_LABOR_UNIT_FIELDS.accessoryExchange,
    ),
    sparePartsExchange: mapExchangeCostDetails(
      laborCostMethod?.sparePartsExchange,
      sparePartsExchangeLaborCostPerUnits,
      exchangeLaborCostTableDataByRule,
      LABOR_EXCHANGE_ROW_LABOR_UNIT_FIELDS.sparePartsExchange,
    ),
  };
};

const mapRepairCostData = (
  repairCost: LaborCostConfigMethod["repairCostConfiguration"]["repairCosts"][number],
  formValues: Record<string, unknown>,
  repairLaborCostMatrixData?: Record<string, ServiceCenterRepairCosts>,
): ServiceCenterRepairCosts => {
  if (repairCost.method === "MATRIX") {
    return {
      method: repairCost.method,
      level: repairCost.level,
      ranges:
        repairLaborCostMatrixData?.[LABOR_REPAIR_LEVEL_TO_RULE[repairCost.level]]?.ranges?.map(
          (range) => ({
            labourUnitRange: range.labourUnitRange.map(Number),
            value: range.value,
          }),
        ) ?? repairCost.ranges,
      value: repairCost.value,
    };
  }

  if (repairCost.method === "LABOR_UNIT_X_COST_FROM_ERP") {
    return {
      method: repairCost.method,
      level: repairCost.level,
      ranges: null,
      value: null,
    };
  }

  const laborRateField = LABOR_RATE_FIELD_BY_LEVEL[repairCost.level];
  const laborRateValue = formValues[laborRateField];

  return {
    method: repairCost.method,
    level: repairCost.level,
    ranges: null,
    value:
      laborRateValue === undefined || laborRateValue === null || laborRateValue === ""
        ? repairCost.value
        : Number(laborRateValue),
  };
};

const mapExchangeCostDetails = (
  exchangeCost: LaborCostExchangePrices | undefined,
  prices: number[],
  exchangeLaborCostTableDataByRule: Record<string, LaborExchangeRow[]> | undefined,
  exchangeLaborUnitField: keyof LaborExchangeRow,
): ExchangeCostDetails => {
  const exchangeTableDataByLevel = Object.entries(exchangeLaborCostTableDataByRule ?? {}).reduce(
    (acc, [selectedRule, tableData]) => {
      const selectedLevel = LABOR_EXCHANGE_RULES_TO_LEVEL[selectedRule];

      if (!selectedLevel) {
        return acc;
      }

      acc[selectedLevel] = tableData;
      return acc;
    },
    {} as Record<string, LaborExchangeRow[]>,
  );
  return {
    prices:
      exchangeCost?.prices.map((price, index) => ({
        ...price,
        unitPrice: Number.isNaN(prices[index]) ? price.unitPrice : prices[index],
      })) ?? [],
    reasonMapping:
      exchangeCost?.reasonMapping.map((reason) => ({
        reasonType: reason.reasonType,
        matrix: reason.matrix.map((matrixItem) => {
          const tableDataForLevel = exchangeTableDataByLevel[matrixItem.level];
          const tableRow = tableDataForLevel?.find((row) => row.reasonType === reason.reasonType);
          const updatedLaborUnit = tableRow?.[exchangeLaborUnitField];
          const labourUnit = updatedLaborUnit ?? matrixItem.laborUnit ?? matrixItem.labourUnit;

          return {
            level: matrixItem.level,
            labourUnit: Number(labourUnit ?? 0),
          };
        }),
      })) ?? [],
  };
};

export const mapGeneralInfo = (generalInfo: Record<string, any>) => {
  const generalInfoData: Record<string, unknown> = {};
  generalInfoData.name = generalInfo.name;
  generalInfoData.email = generalInfo.email;
  generalInfoData.phoneNumber = generalInfo.phoneNumber;
  generalInfoData.gst = generalInfo.gst;
  generalInfoData.companyVATNumber = generalInfo.companyVATNumber;
  generalInfoData.isActive = generalInfo.isActive;
  generalInfoData.preferredSelectedCountry = generalInfo.preferredSelectedCountry;
  generalInfoData.address = {
    street: generalInfo.streetName,
    houseNumber: generalInfo.houseNumber,
    city: generalInfo.city,
    stateProvinceRegion: generalInfo.state,
    postalCode: generalInfo.postalCode,
    countryCode: generalInfo.country,
  };
  generalInfoData.logo = generalInfo.logo?.length
    ? {
        logoId: generalInfo.logo[0]?.attachmentId,
        name: generalInfo.logo[0]?.name,
      }
    : null;
  return generalInfoData;
};

export const mapBanking = (bankingInfo: Record<string, unknown>) => {
  const bankAccountData: Record<string, unknown> = {};
  bankAccountData.bankName = bankingInfo.bankName;
  bankAccountData.accountNumber = bankingInfo.accountNumber;
  return bankAccountData;
};

export const mapPricing = (pricingInfo: Record<string, unknown>) => {
  const pricingData: Record<string, number> = {};
  pricingData.laPriceChargeable = +pricingInfo.laPriceChargeable!;
  pricingData.frPriceChargeable = +pricingInfo.frPriceChargeable!;
  pricingData.pkPriceChargeable = +pricingInfo.pkPriceChargeable!;
  return pricingData;
};

export const mapBoschConfig = (boschConfigInfo: Record<string, unknown>) => {
  const boschConfigData: Record<string, unknown> = {};
  boschConfigData.biqicName = boschConfigInfo.biqicName;
  boschConfigData.customerCode = boschConfigInfo.customerCode;
  boschConfigData.serviceCenterType = boschConfigInfo.serviceCenterType;
  boschConfigData.laPrice = +boschConfigInfo.laPrice!;
  boschConfigData.frPrice = +boschConfigInfo.frPrice!;
  boschConfigData.pkPrice = +boschConfigInfo.pkPrice!;
  boschConfigData.sparePartsDiscount = +boschConfigInfo.sparePartsDiscount!;
  boschConfigData.accessoriesDiscount = +boschConfigInfo.accessoriesDiscount!;
  boschConfigData.sparePartsIncentive = +boschConfigInfo.sparePartsIncentive!;
  boschConfigData.accessoriesIncentive = +boschConfigInfo.accessoriesIncentive!;
  boschConfigData.packagingCost = +boschConfigInfo.packagingCost!;

  return boschConfigData;
};

export const mapReimbursement = (formValues: Record<string, any>, asc: ServiceCenter) => {
  const reimbursementConfig: ReimbursementConfiguration[] = [];
  asc?.reimbursementConfig?.forEach((config) => {
    const repairName = `reimbursementMethod_${config.category}_repair`;
    const exchangeName = `reimbursementMethod_${config.category}_exchange`;
    reimbursementConfig.push({
      category: config.category,
      reimbursementMethods: {
        REPAIR: formValues[repairName] || config.reimbursementMethods.REPAIR || "",
        EXCHANGE: formValues[exchangeName] || config.reimbursementMethods.EXCHANGE || "",
      },
    });
  });
  return {
    reimbursementConfig,
    reimbursementCreateOn: formValues.reimbursementCreateOn || asc.reimbursementCreateOn,
    reimbursementPeriodType: formValues.reimbursementPeriodType || asc.reimbursementPeriodType,
  };
};

export const mapNotifications = (formValues: Record<string, any>) => {
  const notifications: Record<string, string[]> = {};
  const notification: string[] = [];
  const parentNotification: string[] = [];
  if (formValues.notificationEmail) {
    notification.push("EMAIL");
  }
  if (formValues.notificationSMS) {
    notification.push("SMS");
  }
  if (formValues.parentNotificationEmail) {
    parentNotification.push("EMAIL");
  }
  if (formValues.parentNotificationSMS) {
    parentNotification.push("SMS");
  }

  if (notification.length > 0) {
    notifications.notification = notification;
  } else {
    notifications.notification = [];
  }
  if (parentNotification.length > 0) {
    notifications.parentNotification = parentNotification;
  } else {
    notifications.parentNotification = [];
  }

  return notifications;
};
