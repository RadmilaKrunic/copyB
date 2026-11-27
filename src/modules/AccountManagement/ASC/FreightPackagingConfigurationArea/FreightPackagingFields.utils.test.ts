import { describe, expect, it } from "vitest";
import type Field from "@/components/generics/Field/GenericField.types";
import {
  getCostFieldsForSelectedLevel,
  getCostInputFieldsForSelectedLevel,
  getCostInfoFieldsForSelectedLevel,
  getCostInputValuesFromLimits,
  getCostRadioValuesFromLimits,
  isFreightPackagingAllowed,
  isCostConfigurationEnabled,
  mapCostDetailsToPayload,
  shouldShowFreightPackagingConfiguration,
} from "./FreightPackagingFields.utils";

describe("isFreightPackagingAllowed", () => {
  it("checks the country flag for the matching cost type", () => {
    const countryConfiguration = { isFreightAllowed: false, isPackagingAllowed: true };

    expect(isFreightPackagingAllowed(countryConfiguration, "Freight")).toBe(false);
    expect(isFreightPackagingAllowed(countryConfiguration, "Packaging")).toBe(true);
    expect(isFreightPackagingAllowed(undefined, "Freight")).toBe(false);
  });
});

describe("shouldShowFreightPackagingConfiguration", () => {
  it("hides the configuration only when both country flags are false", () => {
    expect(
      shouldShowFreightPackagingConfiguration({
        isFreightAllowed: false,
        isPackagingAllowed: false,
      }),
    ).toBe(false);
    expect(
      shouldShowFreightPackagingConfiguration({
        isFreightAllowed: true,
        isPackagingAllowed: false,
      }),
    ).toBe(true);
    expect(shouldShowFreightPackagingConfiguration(undefined)).toBe(true);
  });
});

describe("getCostRadioValuesFromLimits", () => {
  it("maps each freight limit type to its radio choice", () => {
    const limits = [
      {
        types: [],
        l1: { limitType: "ACTUAL_AMOUNT", lowestLimit: 0, highestLimit: 0, defaultValue: 0 },
        l2: { limitType: "CAPPED_AMOUNT", lowestLimit: 0, highestLimit: 0, defaultValue: 0 },
        l3: { limitType: "FIXED_AMOUNT", lowestLimit: 0, highestLimit: 0, defaultValue: 0 },
      },
    ];

    expect(getCostRadioValuesFromLimits(limits, "Freight")).toEqual({
      typeOfCostFreightLevel1: "NO_LIMIT",
      typeOfCostFreightLevel2: "MAXIMUM_COST",
      typeOfCostFreightLevel3: "FIXED_COST",
    });
  });

  it("uses packaging radio field names and ignores unknown limit types", () => {
    const limits = [
      {
        types: [],
        l1: { limitType: "UNKNOWN", lowestLimit: 0, highestLimit: 0, defaultValue: 0 },
        l2: { limitType: "FIXED_AMOUNT", lowestLimit: 0, highestLimit: 0, defaultValue: 0 },
        l3: null,
      },
    ];

    expect(getCostRadioValuesFromLimits(limits, "Packaging")).toEqual({
      typeOfCostPackagingLevel2: "FIXED_COST",
    });
  });
});

describe("getCostInputValuesFromLimits", () => {
  it("sets inputs for each API-selected radio choice and keeps the fixed-cost minimum default", () => {
    const limits = [
      {
        types: [],
        l1: { limitType: "ACTUAL_AMOUNT", lowestLimit: 0, highestLimit: 100, defaultValue: 12 },
        l2: { limitType: "CAPPED_AMOUNT", lowestLimit: 0, highestLimit: 250, defaultValue: 75 },
        l3: { limitType: "FIXED_AMOUNT", lowestLimit: 0, highestLimit: 300, defaultValue: 42 },
      },
    ];

    expect(getCostInputValuesFromLimits(undefined, limits, "Freight")).toEqual({
      freightCostType_defaultCostNoLimitLevel1: 12,
      freightCostType_maximumCostMaximumLevel1: 0,
      freightCostType_defaultCostMaximumLevel1: 0,
      freightCostType_defaultCostFixedLevel1: 1,
      freightCostType_defaultCostNoLimitLevel2: 0,
      freightCostType_maximumCostMaximumLevel2: 250,
      freightCostType_defaultCostMaximumLevel2: 75,
      freightCostType_defaultCostFixedLevel2: 1,
      freightCostType_defaultCostNoLimitLevel3: 0,
      freightCostType_maximumCostMaximumLevel3: 0,
      freightCostType_defaultCostMaximumLevel3: 0,
      freightCostType_defaultCostFixedLevel3: 42,
    });
  });

  it("falls back to configured values for levels missing from saved ASC limits", () => {
    const configuredLimits = [
      {
        types: [],
        l1: { limitType: "ACTUAL_AMOUNT", lowestLimit: 0, highestLimit: 100, defaultValue: 12 },
        l2: { limitType: "ACTUAL_AMOUNT", lowestLimit: 0, highestLimit: 100, defaultValue: 24 },
        l3: { limitType: "ACTUAL_AMOUNT", lowestLimit: 0, highestLimit: 100, defaultValue: 36 },
      },
    ];
    const savedLimits = [
      {
        types: [],
        l1: { limitType: "CAPPED_AMOUNT", lowestLimit: 0, highestLimit: 200, defaultValue: 80 },
        l2: null,
        l3: null,
      },
    ];

    const values = getCostInputValuesFromLimits(savedLimits, configuredLimits, "Freight");

    expect(values.freightCostType_maximumCostMaximumLevel1).toBe(200);
    expect(values.freightCostType_defaultCostMaximumLevel1).toBe(80);
    expect(values.freightCostType_defaultCostNoLimitLevel2).toBe(24);
    expect(values.freightCostType_defaultCostNoLimitLevel3).toBe(36);
  });
});

describe("mapCostDetailsToPayload", () => {
  it("maps selected radios and number fields to all level limit payloads", () => {
    const costDetails = {
      isAllowed: true,
      limits: [{ types: ["REPAIR"], l1: null, l2: null, l3: null }],
    };
    const values = {
      toggleFreightCost: false,
      typeOfCostFreightLevel1: "NO_LIMIT",
      typeOfCostFreightLevel2: "MAXIMUM_COST",
      typeOfCostFreightLevel3: "FIXED_COST",
      freightCostType_defaultCostNoLimitLevel1: "17",
      freightCostType_maximumCostMaximumLevel2: "250",
      freightCostType_defaultCostMaximumLevel2: "75",
      freightCostType_defaultCostFixedLevel3: "42",
    };

    expect(mapCostDetailsToPayload(costDetails, values, "Freight")).toEqual({
      isAllowed: false,
      limits: [
        {
          types: ["REPAIR"],
          l1: {
            limitType: "ACTUAL_AMOUNT",
            lowestLimit: 0,
            highestLimit: 99999999,
            defaultValue: 17,
          },
          l2: {
            limitType: "CAPPED_AMOUNT",
            lowestLimit: 0,
            highestLimit: 250,
            defaultValue: 75,
          },
          l3: {
            limitType: "FIXED_AMOUNT",
            lowestLimit: 42,
            highestLimit: 42,
            defaultValue: 42,
          },
        },
      ],
    });
  });

  it("uses packaging-specific form fields", () => {
    const costDetails = { isAllowed: true, limits: [{ types: [], l1: null, l2: null, l3: null }] };

    const payload = mapCostDetailsToPayload(
      costDetails,
      {
        typeOfCostPackagingLevel1: "FIXED_COST",
        packagingCostType_defaultCostFixedLevel1: 33,
      },
      "Packaging",
    );

    expect(payload.limits[0].l1).toEqual({
      limitType: "FIXED_AMOUNT",
      lowestLimit: 33,
      highestLimit: 33,
      defaultValue: 33,
    });
  });
});

describe("isCostConfigurationEnabled", () => {
  it("uses the freight toggle value", () => {
    expect(isCostConfigurationEnabled({ toggleFreightCost: false }, "Freight")).toBe(false);
    expect(isCostConfigurationEnabled({ toggleFreightCost: true }, "Freight")).toBe(true);
  });

  it("uses the packaging toggle value", () => {
    expect(isCostConfigurationEnabled({ togglePackagingCost: false }, "Packaging")).toBe(false);
    expect(isCostConfigurationEnabled({ togglePackagingCost: true }, "Packaging")).toBe(true);
  });
});

describe("getCostFieldsForSelectedLevel", () => {
  const fields = [
    {
      name: "typeOfCostFreightLevel1",
      label: "",
      type: "radiogroup",
    },
    {
      name: "defaultCostNoLimitLevel1",
      label: "defaultCost",
      type: "number",
      dependentFields: [{ fieldName: "typeOfCostFreight", fieldValue: "NO_LIMIT" }],
    },
    {
      name: "typeOfCostFreightLevel2",
      label: "",
      type: "radiogroup",
    },
    {
      name: "defaultCostNoLimitLevel2",
      label: "defaultCost",
      type: "number",
      dependentFields: [{ fieldName: "typeOfCostFreightLevel2", fieldValue: "NO_LIMIT" }],
    },
  ] as Field[];
  const packagingFields = [
    {
      name: "typeOfCostPackagingLevel2",
      label: "",
      type: "radiogroup",
    },
    {
      name: "defaultCostNoLimitLevel2",
      label: "defaultCost",
      type: "number",
      dependentFields: [{ fieldName: "typeOfCostPackagingLevel2", fieldValue: "NO_LIMIT" }],
    },
  ] as Field[];
  const infoFields = [
    {
      name: "infoNoLimit",
      type: "infoIcon",
      dependentFields: [
        { fieldName: "typeOfCostFreightLevel1", fieldValue: "NO_LIMIT" },
        { fieldName: "typeOfCostFreightLevel2", fieldValue: "NO_LIMIT" },
      ],
    },
    {
      name: "infoMaximumCost",
      type: "infoIcon",
      dependentFields: [
        { fieldName: "typeOfCostFreightLevel1", fieldValue: "MAXIMUM_COST" },
        { fieldName: "typeOfCostFreightLevel2", fieldValue: "MAXIMUM_COST" },
      ],
    },
    {
      name: "infoFixedCost",
      type: "infoIcon",
      dependentFields: [
        { fieldName: "typeOfCostFreightLevel1", fieldValue: "FIXED_COST" },
        { fieldName: "typeOfCostFreightLevel2", fieldValue: "FIXED_COST" },
      ],
    },
  ] as Field[];

  it("returns only the selected level fields and normalizes its radio dependency", () => {
    const selectedFields = getCostFieldsForSelectedLevel(fields, "level1Freight", "Freight");

    expect(selectedFields.map((field) => field.name)).toEqual([
      "typeOfCostFreightLevel1",
      "defaultCostNoLimitLevel1",
    ]);
    expect(selectedFields[1].dependentFields?.[0].fieldName).toBe("typeOfCostFreightLevel1");
  });

  it("defaults to level 1 when no freight rule is selected", () => {
    const selectedFields = getCostFieldsForSelectedLevel(fields, undefined, "Freight");

    expect(selectedFields.map((field) => field.name)).toEqual([
      "typeOfCostFreightLevel1",
      "defaultCostNoLimitLevel1",
    ]);
  });

  it("returns fields matching level 2 without changing valid dependencies", () => {
    const selectedFields = getCostFieldsForSelectedLevel(fields, "level2Freight", "Freight");

    expect(selectedFields.map((field) => field.name)).toEqual([
      "typeOfCostFreightLevel2",
      "defaultCostNoLimitLevel2",
    ]);
    expect(selectedFields[1].dependentFields?.[0].fieldName).toBe("typeOfCostFreightLevel2");
  });

  it("returns the selected packaging level fields and dependency", () => {
    const selectedFields = getCostFieldsForSelectedLevel(
      packagingFields,
      "level2Packaging",
      "Packaging",
    );

    expect(selectedFields.map((field) => field.name)).toEqual([
      "typeOfCostPackagingLevel2",
      "defaultCostNoLimitLevel2",
    ]);
    expect(selectedFields[1].dependentFields?.[0].fieldName).toBe("typeOfCostPackagingLevel2");
  });

  it("returns only the info field matching the selected level radio value", () => {
    const selectedInfoFields = getCostInfoFieldsForSelectedLevel(
      infoFields,
      "level2Freight",
      "Freight",
      { typeOfCostFreightLevel2: "FIXED_COST" },
    );

    expect(selectedInfoFields.map((field) => field.name)).toEqual(["infoFixedCost"]);
  });
});

describe("getCostInputFieldsForSelectedLevel", () => {
  it("filters by selected radio value and prefixes unqualified input names", () => {
    const fields = [
      { name: "typeOfCostFreightLevel1", label: "", type: "radiogroup" },
      {
        name: "defaultCostNoLimitLevel1",
        label: "defaultCost",
        type: "number",
        dependentFields: [{ fieldName: "typeOfCostFreightLevel1", fieldValue: "NO_LIMIT" }],
      },
      {
        name: "defaultCostFixedLevel1",
        label: "defaultCost",
        type: "number",
        dependentFields: [{ fieldName: "typeOfCostFreightLevel1", fieldValue: "FIXED_COST" }],
      },
      { name: "freightCostType_customLevel1", label: "custom", type: "number" },
    ] as Field[];

    const inputFields = getCostInputFieldsForSelectedLevel(
      fields,
      "typeOfCostFreightLevel1",
      "NO_LIMIT",
      "Freight",
    );

    expect(inputFields.map((field) => field.name)).toEqual([
      "freightCostType_defaultCostNoLimitLevel1",
      "freightCostType_customLevel1",
    ]);
  });
});
