import { describe, it, expect, vi } from "vitest";
import Field from "components/generics/Field/GenericField.types";
import { convertAPIDataToFormValues, mapFieldToFieldMapping } from "components/generics/utils";
import { JobOverviewItem } from "../JobList/JobList.types";
import {
  buildJobOverviewWarrantyCheckPayload,
  clearNullMaterialValues,
  hasPriceSummary,
  hasServerMaterialPrices,
  updateJobOverviewWarrantyTabs,
  getRecalculationPayloadErrors,
  isRecalculationValueEmpty,
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

describe("hasServerMaterialPrices", () => {
  const diagnosticWith = (materials: unknown) =>
    ({ materials }) as unknown as JobOverviewItem["diagnostic"];

  it("is true when a returned material has a price", () => {
    expect(
      hasServerMaterialPrices(diagnosticWith([{ price: null }, { price: { totalAmount: 5 } }])),
    ).toBe(true);
  });

  it("is false when every returned price is null or 0", () => {
    expect(
      hasServerMaterialPrices(diagnosticWith([{ price: null }, { price: { unitPrice: 0 } }])),
    ).toBe(false);
  });

  it("is undefined when the response has no materials", () => {
    expect(hasServerMaterialPrices(diagnosticWith([]))).toBeUndefined();
    expect(hasServerMaterialPrices(undefined)).toBeUndefined();
  });
});
