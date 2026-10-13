import { describe, it, expect, vi } from "vitest";
import Field from "components/generics/Field/GenericField.types";
import {
  buildJobOverviewWarrantyCheckPayload,
  updateJobOverviewWarrantyTabs,
  getRecalculationRowErrors,
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

describe("getRecalculationRowErrors", () => {
  const rowField = (name: string, nameStartsWith?: string) =>
    ({ name, type: "text", fieldMapping: { nameStartsWith } }) as Field;
  const fields = [
    rowField("row0_partNumber", "materials[0]"),
    rowField("row0_quantity", "materials[0]"),
    rowField("row1_quantity", "materials[1]"),
    rowField("technicianNote"),
  ];

  it("keeps only errors of the triggering field's row", () => {
    const errors = {
      row0_quantity: "Quantity is required",
      row1_quantity: "Quantity is required",
      technicianNote: "Technician note is required",
    };
    expect(getRecalculationRowErrors(fields, "row0_partNumber", errors)).toEqual({
      row0_quantity: "Quantity is required",
    });
  });

  it("returns no errors when the edited row is valid", () => {
    const errors = { row1_quantity: "Quantity is required", technicianNote: "required" };
    expect(getRecalculationRowErrors(fields, "row0_quantity", errors)).toEqual({});
  });

  it("returns no errors for a field outside a spare-part row", () => {
    expect(getRecalculationRowErrors(fields, "technicianNote", { technicianNote: "x" })).toEqual(
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
