import axiosClient from "../../axios-client/axiosClient";

export interface Ranges {
  labourUnitRange: number[];
  value: number;
}
export interface RepairCosts {
  method: string;
  level: string;
  ranges: Ranges[];
  value: number | null;
}
export interface ChargingMethod {
  types: string[];
  method: {
    l1: string;
    l2: string;
    l3: string;
  };
}
export interface RepairCostConfiguration {
  chargingMethod: ChargingMethod[];
  repairCosts: RepairCosts[];
}
export interface ExchangeMatrix {
  laborUnit?: number;
  labourUnit?: number;
  level: string;
}
export interface ReasonMapping {
  matrix: ExchangeMatrix[];
  reasonType: string;
}
export interface Prices {
  level: string;
  method: string;
  unitPrice: number;
}
export interface ExchangePrices {
  prices: Prices[];
  reasonMapping: ReasonMapping[];
}
export interface CostLimitValue {
  lowestLimit: number;
  highestLimit: number;
  defaultValue: number;
}
export interface CostLimit {
  types: string[];
  l1: CostLimitValue | null;
  l2: CostLimitValue | null;
  l3: CostLimitValue | null;
}
export interface CostDetails {
  isAllowed: boolean;
  limits: CostLimit[];
}
export interface LaborCostMethod {
  repairCostConfiguration: RepairCostConfiguration;
  newToolExchange: ExchangePrices;
  accessoryExchange: ExchangePrices;
  sparePartsExchange: ExchangePrices;
}
export interface LaborCostConfigurationResponse {
  laborCostMethod: LaborCostMethod;
  freightCostDetails: CostDetails;
  packagingCostDetails: CostDetails;
  id: string;
}

export const getLaborCostConfig = async (
  countryCode: string,
): Promise<LaborCostConfigurationResponse> => {
  try {
    const response = await axiosClient.get<LaborCostConfigurationResponse>(
      `/v1/countries/${countryCode}/service-cost-configuration`,
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching labor cost configuration:", error);
    throw error;
  }
};
