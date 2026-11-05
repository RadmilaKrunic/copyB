import { describe, expect, it } from "vitest";
import {
  getExchangeRuleMethod,
  mapLaborCostPerUnitLevelFields,
  mapLaborExchangeRows,
  selectedLaborExchangeAction,
  showLaborRulesTable,
  trimReasonForExchange,
} from "./AscLaborRulesExchangeArea.utils";

const laborCostMethod: NonNullable<Parameters<typeof showLaborRulesTable>[0]> = {
  repairCosts: [],
  newToolExchange: {
    prices: [
      { level: "L1", method: "SAP", unitPrice: 0 },
      { level: "L2", method: "SAP", unitPrice: 0 },
      { level: "L3", method: "SAP", unitPrice: 0 },
    ],
    reasonMapping: [
      {
        reasonType: "XLR",
        matrix: [
          { level: "L1", labourUnit: 3 },
          { level: "L2", labourUnit: 2 },
          { level: "L3", labourUnit: 1 },
        ],
      },
      {
        reasonType: "XCH",
        matrix: [
          { level: "L1", labourUnit: 2 },
          { level: "L2", labourUnit: 2 },
          { level: "L3", labourUnit: 2 },
        ],
      },
    ],
  },
  accessoryExchange: {
    prices: [
      { level: "L1", method: "SAP", unitPrice: 0 },
      { level: "L2", method: "SAP", unitPrice: 0 },
      { level: "L3", method: "SAP", unitPrice: 0 },
    ],
    reasonMapping: [
      {
        reasonType: "XLR",
        matrix: [
          { level: "L1", labourUnit: 6 },
          { level: "L2", labourUnit: 5 },
          { level: "L3", labourUnit: 4 },
        ],
      },
      {
        reasonType: "XCH",
        matrix: [
          { level: "L1", labourUnit: 1 },
          { level: "L2", labourUnit: 1 },
          { level: "L3", labourUnit: 1 },
        ],
      },
    ],
  },
  sparePartsExchange: {
    prices: [
      { level: "L1", method: "SAP", unitPrice: 0 },
      { level: "L2", method: "SAP", unitPrice: 0 },
      { level: "L3", method: "SAP", unitPrice: 0 },
    ],
    reasonMapping: [
      {
        reasonType: "XLR",
        matrix: [
          { level: "L1", labourUnit: 9 },
          { level: "L2", labourUnit: 8 },
          { level: "L3", labourUnit: 7 },
        ],
      },
      {
        reasonType: "XCH",
        matrix: [
          { level: "L1", labourUnit: 1 },
          { level: "L2", labourUnit: 1 },
          { level: "L3", labourUnit: 1 },
        ],
      },
    ],
  },
};

const laborCostConfigMethod: NonNullable<Parameters<typeof selectedLaborExchangeAction>[0]> = {
  repairCostConfiguration: {
    chargingMethod: [],
    repairCosts: [],
  },
  newToolExchange: laborCostMethod.newToolExchange,
  accessoryExchange: laborCostMethod.accessoryExchange,
  sparePartsExchange: laborCostMethod.sparePartsExchange,
};

describe("AscLaborRulesExchangeArea.utils", () => {
  it("maps L1 exchange rows from country config top to bottom", () => {
    const rows = showLaborRulesTable(laborCostMethod, "level1Exchange");

    expect(rows).toEqual([
      {
        reasonType: "XLR",
        sparePartLaborUnit: 9,
        newToolExchangeLaborUnit: 3,
        accessoryLaborUnit: 6,
      },
      {
        reasonType: "XCH",
        sparePartLaborUnit: 1,
        newToolExchangeLaborUnit: 2,
        accessoryLaborUnit: 1,
      },
    ]);
  });

  it("returns empty rows for unknown selection", () => {
    expect(showLaborRulesTable(laborCostMethod, null)).toEqual([]);
  });

  it("supports laborUnit fallback key when mapping rows", () => {
    const fallbackLaborConfig = {
      repairCosts: [],
      newToolExchange: {
        prices: [{ level: "L1", method: "SAP", unitPrice: 0 }],
        reasonMapping: [
          {
            reasonType: "XLR",
            matrix: [{ level: "L1", laborUnit: 5 }],
          },
        ],
      },
      accessoryExchange: {
        prices: [{ level: "L1", method: "SAP", unitPrice: 0 }],
        reasonMapping: [
          {
            reasonType: "XLR",
            matrix: [{ level: "L1", laborUnit: 7 }],
          },
        ],
      },
      sparePartsExchange: {
        prices: [{ level: "L1", method: "SAP", unitPrice: 0 }],
        reasonMapping: [
          {
            reasonType: "XLR",
            matrix: [{ level: "L1", laborUnit: 9 }],
          },
        ],
      },
    } as unknown as NonNullable<Parameters<typeof mapLaborExchangeRows>[0]>;

    const rows = mapLaborExchangeRows(fallbackLaborConfig, "level1Exchange");

    expect(rows).toEqual([
      {
        reasonType: "XLR",
        sparePartLaborUnit: 9,
        newToolExchangeLaborUnit: 5,
        accessoryLaborUnit: 7,
      },
    ]);
  });

  it("returns empty rows when config is undefined", () => {
    expect(mapLaborExchangeRows(undefined, "level1Exchange")).toEqual([]);
  });

  it("maps missing reason-level values to 0", () => {
    const partialConfig = {
      ...laborCostMethod,
      accessoryExchange: {
        ...laborCostMethod.accessoryExchange,
        reasonMapping: [
          {
            reasonType: "XLR",
            matrix: [{ level: "L1", labourUnit: 6 }],
          },
        ],
      },
    } as NonNullable<Parameters<typeof mapLaborExchangeRows>[0]>;

    const rows = mapLaborExchangeRows(partialConfig, "level1Exchange");

    expect(rows).toEqual([
      {
        reasonType: "XLR",
        sparePartLaborUnit: 9,
        newToolExchangeLaborUnit: 3,
        accessoryLaborUnit: 6,
      },
      {
        reasonType: "XCH",
        sparePartLaborUnit: 1,
        newToolExchangeLaborUnit: 2,
        accessoryLaborUnit: 0,
      },
    ]);
  });

  it("returns selected exchange method for valid method key and undefined for invalid", () => {
    const selected = selectedLaborExchangeAction(laborCostConfigMethod, "newToolExchange");

    expect(selected).toEqual(laborCostConfigMethod.newToolExchange);
    expect(selectedLaborExchangeAction(laborCostConfigMethod, "not-valid-key")).toBeUndefined();
    expect(selectedLaborExchangeAction(laborCostConfigMethod, null)).toBeUndefined();
  });

  it("maps per-unit prices by selected level and falls back to 0 when level is missing", () => {
    expect(mapLaborCostPerUnitLevelFields(laborCostMethod, "level1Exchange")).toEqual({
      sparePartsExchange: 0,
      newToolExchange: 0,
      accessoryExchange: 0,
    });

    const missingPriceConfig = {
      ...laborCostMethod,
      sparePartsExchange: {
        ...laborCostMethod.sparePartsExchange,
        prices: [{ level: "L2", method: "SAP", unitPrice: 99 }],
      },
    };

    expect(mapLaborCostPerUnitLevelFields(missingPriceConfig as any, "level1Exchange")).toEqual({
      sparePartsExchange: 0,
      newToolExchange: 0,
      accessoryExchange: 0,
    });
    expect(mapLaborCostPerUnitLevelFields(laborCostMethod, "unknown")).toEqual({});
  });

  it("returns exchange method for selected level and empty string for invalid selection", () => {
    expect(getExchangeRuleMethod(laborCostMethod, "level1Exchange")).toBe("SAP");
    expect(getExchangeRuleMethod(laborCostMethod, "unknown")).toBe("");
    expect(getExchangeRuleMethod(undefined, "level1Exchange")).toBe("");
  });

  it("trims exchange reason display text", () => {
    expect(trimReasonForExchange("XLR - Exchange Reason")).toBe("Exchange Reason");
    expect(trimReasonForExchange("NoDelimiter")).toBe("");
  });
});
