import { describe, it, expect, vi } from "vitest";
import Field from "components/generics/Field/GenericField.types";
import { convertAPIDataToFormValues, mapFieldToFieldMapping } from "components/generics/utils";
import { JobOverviewItem } from "../JobList/JobList.types";
import {
  buildJobOverviewWarrantyCheckPayload,
  clearNullMaterialValues,
  getTotalSummaryTypeValues,
  hasPriceSummary,
  isPriceSummaryMissing,
  withZeroPriceSummary,
  hasServerMaterialPrices,
  updateJobOverviewWarrantyTabs,
  getRecalculationPayloadErrors,
  isRecalculationValueEmpty,
  mergeRecalculationChanges,
  buildRecalculationChange,
  dropRejectedRecalculationChange,
  isRecalculationValueRejected,
} from "./JobOverview.utils";

vi.mock("../CreateJob/CreateJob.warranty.utils", () => ({
  buildWarrantyCheckPayloadFromFieldNames: (values: any, cfg: any, country?: string) => ({
    brand: values["brand"],
    country: country,
  }),
  updateWarrantyFields: (fields: any[]) => fields.map((f) => ({ ...f, updated: true })),
}));

describe("JobOverview utils", () => {
  it("builds warranty payload when values present", () => {
    const vals = {
      brand: "Bosch",
      baretoolNumber: "BT1",
      serialNumber: "S1",
      purchaseDate: "2023-01-01",
    };
    const payload = buildJobOverviewWarrantyCheckPayload(vals, "DE");
    expect(payload).toBeTruthy();
    expect(payload?.brand).toBe("Bosch");
    expect(payload?.country).toBe("DE");
  });

  it("updates tabs replacing fields for assetData areas", () => {
    const tabs = [
      {
        name: "assetData",
        areas: [
          { name: "customerWish", fields: [{ name: "f1" }] },
          { name: "warrantyDetails", fields: [{ name: "f2" }] },
        ],
      },
      { name: "other", areas: [] },
    ];

    const response = { evaluationStatus: "ELIGIBLE" } as any;
    const result = updateJobOverviewWarrantyTabs(tabs as any, response, null);
    const asset = result.find((t) => t.name === "assetData");
    expect(asset).toBeDefined();
    expect(asset?.areas[0].fields[0].updated).toBe(true);
    expect(asset?.areas[1].fields[0].updated).toBe(true);
  });
});

describe("getRecalculationPayloadErrors", () => {
  const field = (name: string, parentMap: string[]) =>
    ({ name, type: "text", fieldMapping: { parentMap } }) as Field;
  const fields = [
    field("row0_partNumber", ["diagnostic", "materials#"]),
    field("row1_quantity", ["diagnostic", "materials#"]),
    field("technicianNote", ["diagnostic"]),
    field("customerEmail", ["order", "customer"]),
  ];

  it("keeps errors of every field in the diagnostic payload, not only the edited row", () => {
    const errors = {
      row1_quantity: "Quantity is required",
      technicianNote: "Technician note is required",
      customerEmail: "Email is required",
    };
    expect(getRecalculationPayloadErrors(fields, errors)).toEqual({
      row1_quantity: "Quantity is required",
      technicianNote: "Technician note is required",
    });
  });

  it("returns no errors when every payload field is valid", () => {
    expect(getRecalculationPayloadErrors(fields, { customerEmail: "Email is required" })).toEqual(
      {},
    );
  });
});

describe("isRecalculationValueEmpty", () => {
  it("treats zero as a value", () => {
    expect(isRecalculationValueEmpty(0)).toBe(false);
    expect(isRecalculationValueEmpty("0")).toBe(false);
  });

  it("treats null, undefined and empty string as empty", () => {
    expect(isRecalculationValueEmpty(null)).toBe(true);
    expect(isRecalculationValueEmpty(undefined)).toBe(true);
    expect(isRecalculationValueEmpty("")).toBe(true);
  });
});

describe("clearNullMaterialValues", () => {
  const rowField = (name: string, attributeMapping: string): Field =>
    mapFieldToFieldMapping({
      name: `diagnosticData_diagnosticsSpareParts#0_${name}`,
      type: "text",
      attributeMapping,
    } as Field);

  const fields = [
    rowField("materialId", "diagnostic.materials#.id"),
    rowField("totalAmount", "diagnostic.materials#.price.totalAmount"),
    rowField("sparePartNumber", "diagnostic.materials#.partNumber"),
  ];

  const staleForm = {
    "diagnosticData_diagnosticsSpareParts#0_materialId": "old-line-id",
    "diagnosticData_diagnosticsSpareParts#0_totalAmount": 120,
    "diagnosticData_diagnosticsSpareParts#0_sparePartNumber": "1600A001HY",
  };

  const jobWith = (material: Record<string, unknown>) =>
    ({ diagnostic: { materials: [material] } }) as unknown as JobOverviewItem;

  it("clears the row id and prices the server returns as null", () => {
    const job = jobWith({ id: null, partNumber: "1600A001HY", price: null });

    const values = convertAPIDataToFormValues(clearNullMaterialValues(job), fields, staleForm);

    expect(values["diagnosticData_diagnosticsSpareParts#0_materialId"]).toBe("");
    expect(values["diagnosticData_diagnosticsSpareParts#0_totalAmount"]).toBe(0);
    expect(values["diagnosticData_diagnosticsSpareParts#0_sparePartNumber"]).toBe("1600A001HY");
  });

  it("keeps the old value without the cleanup (mapper treats null as missing)", () => {
    const job = jobWith({ id: null, partNumber: "1600A001HY", price: null });

    const values = convertAPIDataToFormValues(job, fields, staleForm);

    expect(values["diagnosticData_diagnosticsSpareParts#0_materialId"]).toBe("old-line-id");
  });

  it("clears single null prices and keeps the ones the server sent", () => {
    const job = jobWith({
      id: "line-1",
      price: { totalAmount: null, unitPrice: 10, taxTypes: [] },
    });

    const cleared = clearNullMaterialValues(job).diagnostic?.materials?.[0];

    expect(cleared?.id).toBe("line-1");
    expect(cleared?.price).toMatchObject({
      totalAmount: 0,
      unitPrice: 10,
      netAmount: 0,
      taxTypes: [],
    });
  });

  it("zeroes the summary total when priceSummaryDetailed is null", () => {
    const job = {
      diagnostic: { materials: [], priceSummaryDetailed: null },
    } as unknown as JobOverviewItem;

    const summary = clearNullMaterialValues(job).diagnostic?.priceSummaryDetailed;

    expect(summary?.total).toMatchObject({ totalAmount: 0, netAmount: 0, discount: 0 });
    expect(summary?.byJobType).toEqual([]);
  });

  it("returns the job unchanged when it has no diagnostic materials", () => {
    const job = { diagnostic: {} } as unknown as JobOverviewItem;
    expect(clearNullMaterialValues(job)).toBe(job);
  });
});

describe("hasPriceSummary", () => {
  it("is false only when the server returned priceSummaryDetailed null", () => {
    const withSummary = (priceSummaryDetailed: unknown) =>
      ({ priceSummaryDetailed }) as unknown as JobOverviewItem["diagnostic"];

    expect(hasPriceSummary(withSummary(null))).toBe(false);
    expect(hasPriceSummary(withSummary({ total: {}, byJobType: [] }))).toBe(true);
    expect(hasPriceSummary(withSummary(undefined))).toBe(true);
    expect(hasPriceSummary(undefined)).toBe(true);
  });
});

describe("withZeroPriceSummary", () => {
  it("adds an all-zero summary when the response has none or null", () => {
    [undefined, null].forEach((priceSummaryDetailed) => {
      const result = withZeroPriceSummary(
        { materials: [], priceSummaryDetailed },
        "priceSummaryDetailed",
      ) as { priceSummaryDetailed: { total: Record<string, number>; byJobType: unknown[] } };
      expect(result.priceSummaryDetailed.total).toMatchObject({
        suggestedNetPrice: 0,
        netAmount: 0,
        taxAmount: 0,
        grossAmount: 0,
        discount: 0,
        discountAmount: 0,
        totalAmount: 0,
      });
      expect(result.priceSummaryDetailed.byJobType).toEqual([]);
    });
  });

  it("keeps a summary the response has (claim key)", () => {
    const claim = { claimPriceSummaryDetailed: { total: { totalAmount: 5 }, byJobType: [] } };
    expect(withZeroPriceSummary(claim, "claimPriceSummaryDetailed")).toBe(claim);
  });

  it("isPriceSummaryMissing is true only for null or undefined", () => {
    expect(isPriceSummaryMissing(null)).toBe(true);
    expect(isPriceSummaryMissing(undefined)).toBe(true);
    expect(isPriceSummaryMissing({ total: {} })).toBe(false);
  });
});

describe("getTotalSummaryTypeValues", () => {
  it("selects totalSummary on every summary-type radio", () => {
    const fields = [
      { name: "summaryType", subtype: "diagnosticSummaryType" },
      { name: "claimsSummaryType", subtype: "diagnosticSummaryType" },
      { name: "summaryTotalTotalAmount", subtype: "diagnosticSummaryTotalAmount" },
    ] as Field[];
    expect(getTotalSummaryTypeValues(fields)).toEqual({
      summaryType: "totalSummary",
      claimsSummaryType: "totalSummary",
    });
  });
});

describe("hasServerMaterialPrices", () => {
  const diagnosticWith = (materials: unknown) =>
    ({ materials }) as unknown as JobOverviewItem["diagnostic"];

  it("is true when a returned material has a price", () => {
    expect(
      hasServerMaterialPrices(diagnosticWith([{ price: null }, { price: { totalAmount: 5 } }])),
    ).toBe(true);
  });

  it("is false when every returned price is null or has no amounts", () => {
    expect(
      hasServerMaterialPrices(
        diagnosticWith([{ price: null }, { price: { unitPrice: null, totalAmount: "" } }]),
      ),
    ).toBe(false);
  });

  it("is true when every returned amount is 0 (free rows, e.g. accessory exchange)", () => {
    expect(
      hasServerMaterialPrices(
        diagnosticWith([
          { price: { unitPrice: 0, netAmount: 0, grossAmount: 0, totalAmount: 0 } },
          { price: { unitPrice: "0", totalAmount: "0" } },
        ]),
      ),
    ).toBe(true);
  });

  it("is undefined when the response has no materials", () => {
    expect(hasServerMaterialPrices(diagnosticWith([]))).toBeUndefined();
    expect(hasServerMaterialPrices(undefined)).toBeUndefined();
  });
});

describe("mergeRecalculationChanges", () => {
  const summaryScope = { positions: ["SP", "PN", "AC"], jobTypes: ["CHARGEABLE"] };

  it("keeps only the last change of the same row field", () => {
    let changes: Record<string, unknown>[] = [];
    changes = mergeRecalculationChanges(changes, [
      { type: "quantity", lineId: "L1", value: 1, scope: null },
    ]);
    changes = mergeRecalculationChanges(changes, [
      { type: "discount", lineId: "L1", value: 5, scope: null },
    ]);
    changes = mergeRecalculationChanges(changes, [
      { type: "quantity", lineId: "L2", value: 4, scope: null },
    ]);
    changes = mergeRecalculationChanges(changes, [
      { type: "quantity", lineId: "L1", value: 3, scope: null },
    ]);

    expect(changes).toEqual([
      { type: "discount", lineId: "L1", value: 5, scope: null },
      { type: "quantity", lineId: "L2", value: 4, scope: null },
      { type: "quantity", lineId: "L1", value: 3, scope: null },
    ]);
  });

  it("keeps only the last summary change, discount or amount", () => {
    let changes: Record<string, unknown>[] = [
      { type: "quantity", lineId: "L1", value: 2, scope: null },
    ];
    changes = mergeRecalculationChanges(changes, [
      { type: "summaryDiscount", lineId: "", value: 10, scope: summaryScope },
    ]);
    changes = mergeRecalculationChanges(changes, [
      { type: "summaryTotalAmount", lineId: "", value: 90, scope: summaryScope },
    ]);

    expect(changes).toEqual([
      { type: "quantity", lineId: "L1", value: 2, scope: null },
      { type: "summaryTotalAmount", lineId: "", value: 90, scope: summaryScope },
    ]);

    changes = mergeRecalculationChanges(changes, [
      { type: "summaryDiscount", lineId: "", value: 15, scope: summaryScope },
    ]);
    expect(changes).toEqual([
      { type: "quantity", lineId: "L1", value: 2, scope: null },
      { type: "summaryDiscount", lineId: "", value: 15, scope: summaryScope },
    ]);
  });

  it("does not mutate the previous list", () => {
    const previous = [{ type: "quantity", lineId: "L1", value: 1, scope: null }];
    mergeRecalculationChanges(previous, [
      { type: "quantity", lineId: "L1", value: 2, scope: null },
    ]);
    expect(previous).toEqual([{ type: "quantity", lineId: "L1", value: 1, scope: null }]);
  });
});

describe("buildRecalculationChange", () => {
  it("sends a row change with its line id and no scope", () => {
    expect(buildRecalculationChange("quantity", "SP_1611016003_CHARGEABLE", "10.00")).toEqual({
      type: "quantity",
      lineId: "SP_1611016003_CHARGEABLE",
      value: "10.00",
      scope: null,
    });
  });

  it("maps row field names to change types", () => {
    expect(buildRecalculationChange("type", "L1", "WARRANTY").type).toBe("jobType");
    expect(buildRecalculationChange("sparePartNumber", "L1", "1").type).toBe("partNumber");
    expect(buildRecalculationChange("position", "L1", "LA").type).toBe("position");
  });

  it("sends a summary change with the chargeable scope", () => {
    expect(buildRecalculationChange("summaryDiscountMaterial", "", 5)).toEqual({
      type: "summaryDiscount",
      lineId: "",
      value: 5,
      scope: { positions: ["SP", "PN", "AC"], jobTypes: ["CHARGEABLE"] },
    });
  });
});

describe("isRecalculationValueRejected", () => {
  it("is true when the response returns another number than was sent", () => {
    expect(isRecalculationValueRejected("99999", 1250)).toBe(true);
    expect(isRecalculationValueRejected(3, "2")).toBe(true);
  });

  it("is false when the response keeps the sent number, rounding to cents included", () => {
    expect(isRecalculationValueRejected("1250", 1250)).toBe(false);
    expect(isRecalculationValueRejected("10.00", 10)).toBe(false);
    expect(isRecalculationValueRejected("12.345", 12.35)).toBe(false);
    expect(isRecalculationValueRejected(0, "0")).toBe(false);
  });

  it("is false for non-numeric or missing values", () => {
    expect(isRecalculationValueRejected("LA", "PN")).toBe(false);
    expect(isRecalculationValueRejected("5", undefined)).toBe(false);
    expect(isRecalculationValueRejected("5", "")).toBe(false);
    expect(isRecalculationValueRejected("", 5)).toBe(false);
  });
});

describe("dropRejectedRecalculationChange", () => {
  const totalChange = buildRecalculationChange("summaryTotalAmountMaterial", "", "99999");
  const quantityChange = buildRecalculationChange("quantity", "L1", "2");
  const pending = [quantityChange, totalChange];
  const sentTotal = { fieldName: "summaryTotalAmountMaterial", change: totalChange };

  it("removes the sent change when the response returns the previous value", () => {
    expect(
      dropRejectedRecalculationChange(pending, sentTotal, { summaryTotalAmountMaterial: 1250 }),
    ).toEqual([quantityChange]);
  });

  it("keeps the changes when the response accepts the sent value", () => {
    expect(
      dropRejectedRecalculationChange(pending, sentTotal, { summaryTotalAmountMaterial: 99999 }),
    ).toBe(pending);
  });

  it("keeps the changes when nothing was sent or the field is not in the response", () => {
    expect(dropRejectedRecalculationChange(pending, null, {})).toBe(pending);
    expect(dropRejectedRecalculationChange(pending, sentTotal, {})).toBe(pending);
  });

  it("keeps a later change of the same field that replaced the sent one", () => {
    const laterTotal = buildRecalculationChange("summaryTotalAmountMaterial", "", "1300");
    expect(
      dropRejectedRecalculationChange([quantityChange, laterTotal], sentTotal, {
        summaryTotalAmountMaterial: 1250,
      }),
    ).toEqual([quantityChange, laterTotal]);
  });
});
