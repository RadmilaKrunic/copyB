import { describe, it, expect, vi } from "vitest";
import {
  buildJobOverviewWarrantyCheckPayload,
  isSparePartAlreadyPriced,
  updateJobOverviewWarrantyTabs,
} from "./JobOverview.utils";
import { JobDiagnostic } from "../JobList/JobList.types";

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

describe("isSparePartAlreadyPriced", () => {
  const diagnostic = {
    materials: [{ id: "m1", partNumber: "1600A00001" }],
  } as unknown as JobDiagnostic;

  it("is true for the part the server priced, ignoring dots, spaces and case", () => {
    expect(isSparePartAlreadyPriced(diagnostic, "m1", "1600.a0000 1")).toBe(true);
  });

  it("is false for a part the server has not priced yet (blocked or failed change)", () => {
    expect(isSparePartAlreadyPriced(diagnostic, "m1", "1600A00002")).toBe(false);
  });

  it("is false when the row is unknown to the server or there is no diagnostic", () => {
    expect(isSparePartAlreadyPriced(diagnostic, "m2", "1600A00001")).toBe(false);
    expect(isSparePartAlreadyPriced(undefined, "m1", "1600A00001")).toBe(false);
  });
});
