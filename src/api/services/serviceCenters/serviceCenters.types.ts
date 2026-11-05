export interface ServiceCenterName {
  ascId: string;
  name: string;
}

export interface ServiceCenterNamesResponse {
  serviceCenterNames: ServiceCenterName[];
}

export interface ReimbursementConfiguration {
  category: string;
  reimbursementMethods: {
    REPAIR: string;
    EXCHANGE: string;
  };
}

export interface LaborUnitValue {
  value: number | null;
}
export interface Ranges {
  labourUnitRange: number[];
  value: number;
}

export interface RepairCosts {
  method: string;
  level: string;
  ranges: Ranges[] | null;
  value: number | null;
}

export interface ExchangePrices {
  level: string;
  method: string;
  unitPrice: number;
}
export interface ReasonMapping {
  reasonType: string;
  matrix: ReasonLabourUnit[];
}

export interface ReasonLabourUnit {
  level: string;
  labourUnit: number;
}
export interface ExchangeCostDetails {
  prices: ExchangePrices[];
  reasonMapping: ReasonMapping[];
}
export interface LaborCostMethod {
  repairCosts: RepairCosts[];
  newToolExchange: ExchangeCostDetails;
  accessoryExchange: ExchangeCostDetails;
  sparePartsExchange: ExchangeCostDetails;
}

export interface LaborRateLimitRange {
  lowestLimit: number;
  highestLimit: number;
  defaultValue: number;
}
export interface Limits {
  types: string[];
  l1: LaborRateLimitRange | null;
  l2: LaborRateLimitRange | null;
  l3: LaborRateLimitRange | null;
}
export interface FreightPackagingCostDetails {
  isAllowed: boolean;
  limits: Limits[];
}
export interface ServiceCenter {
  ascId: string;
  name: string;
  gst: string;
  email: string;
  phoneNumber: string;
  biqicName: string;
  customerCode: string;
  companyVATNumber: string;
  serviceCenterType: string;
  reimbursementType: string;
  reimbursementConfig: ReimbursementConfiguration[];
  reimbursementCreateOn: string;
  reimbursementPeriodType: string;
  address: {
    street: string;
    houseNumber: string;
    additionalDetails: string | null;
    neighborhood: string | null;
    district: string | null;
    city: string;
    stateProvinceRegion: string;
    postalCode: string;
    countryCode: string;
  };
  defaultCountry: string;
  preferredSelectedCountry: string;
  bankAccount: {
    accountId: number;
    accountNumber: string;
    bankName: string;
  };
  currency: string;
  currencySymbol: string;
  laPrice: number;
  frPrice: number;
  pkPrice: number;
  sparePartsDiscount: number;
  accessoriesDiscount: number;
  sparePartsIncentive: number;
  accessoriesIncentive: number;
  packagingCost: number;
  laborCostMethod: LaborCostMethod;
  freightCostDetails: FreightPackagingCostDetails;
  packagingCostDetails: FreightPackagingCostDetails;
  notification: string[];
  parentNotification: string[];
  isActive: boolean;
  isDraft: boolean;
  logo: {
    logoId: string;
    name: string;
    type: string;
  };
  createdOn: string;
  laPriceChargeable: number;
  frPriceChargeable: number;
  pkPriceChargeable: number;
}

export interface DraftServiceCenter {
  serviceCenter: {
    ascId: string;
    name: string;
    gst: string;
    email: string;
    phoneNumber: string;
    biqicName: string;
    customerCode: string;
    companyVATNumber: string;
    serviceCenterType: string;
    reimbursementType: string;
    reimbursementConfig: ReimbursementConfiguration[];
    address: {
      street: string;
      houseNumber: string;
      additionalDetails: string | null;
      neighborhood: string | null;
      district: string | null;
      city: string;
      stateProvinceRegion: string;
      postalCode: string;
      countryCode: string;
    };
    defaultCountry: string | null;
    preferredSelectedCountry: string | null;
    zone: string | null;
    createdOn: string;
    logo: {
      logoId: string;
      name: string;
      type: string;
    };
    bankAccount: {
      accountId: number;
      accountNumber: string;
      bankName: string;
    } | null;
    currency: string;
    currencySymbol: string;
    laPrice: number;
    frPrice: number;
    pkPrice: number;
    sparePartsDiscount: number | null;
    accessoriesDiscount: number | null;
    sparePartsIncentive: number | null;
    accessoriesIncentive: number | null;
    packagingCost: number | null;
    notification: string[] | null;
    parentNotification: string[] | null;
    laPriceChargeable: number;
    frPriceChargeable: number;
    pkPriceChargeable: number;
    isDraft: true;
    isActive: true;
    reimbursementCreateOn: string;
    reimbursementPeriodType: string;
    laborCostMethod: LaborCostMethod;
  };
  firstUser: {
    userId: string;
    type: "ASC";
    ascId: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    createdOn: string;
    accountRoles: [
      {
        id: string;
        name: string;
      },
    ];
    employeeCode: string;
    isActive: boolean;
  };
}
