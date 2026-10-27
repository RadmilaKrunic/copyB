import { describe, it, expect } from "vitest";
import {
  applyClaimRecalculation,
  findClaimRowIndex,
  getClaimFieldOriginalName,
  getClaimRecalculationPayloadErrors,
  getClaimSparePartsAreas,
  getRecalculationErrorKeys,
  hasRecalculationErrors,
  makeFieldGetter,
} from "./ClaimOverview.utils";

describe("ClaimOverview utils", () => {
  it("makeFieldGetter returns form value by subtype mapping", () => {
    const fields = [
      { name: "a.position", subtype: "diagnosticPosition" },
      { name: "a.partNumber", subtype: "diagnosticPartNumber" },
    ];
    const formValues = { "a.position": "POS1", "a.partNumber": "PN1" };
    const get = makeFieldGetter(fields as any, formValues);
    expect(get("diagnosticPosition")).toBe("POS1");
    expect(get("diagnosticPartNumber")).toBe("PN1");
    expect(get("unknown")).toBeUndefined();
  });
});

const area = (name: string, fieldNames: string[], isMultiple = true) =>
  ({ name, isMultiple, fields: fieldNames.map((n) => ({ name: n })) }) as any;

describe("claim recalculation utils", () => {
  const tabs = [
    {
      name: "claims",
      areas: [
        area("claimSpareParts#0", ["r0_quantity"]),
        area("claimSpareParts#2", ["r2_quantity"]),
        area("claimSpareParts_claimArchivedSpareParts#0", ["arch_quantity"]),
        area("claimData", ["claimData_x"], false),
      ],
    },
  ] as any;

  it("getClaimSparePartsAreas keeps the active rows only, in order", () => {
    expect(getClaimSparePartsAreas(tabs).map((a) => a.name)).toEqual([
      "claimSpareParts#0",
      "claimSpareParts#2",
    ]);
    expect(getClaimSparePartsAreas([])).toEqual([]);
  });

  it("findClaimRowIndex finds the row by field name", () => {
    const areas = getClaimSparePartsAreas(tabs);
    expect(findClaimRowIndex(areas, "r2_quantity")).toBe(1);
    expect(findClaimRowIndex(areas, "arch_quantity")).toBe(-1);
  });

  it("getClaimFieldOriginalName prefers fieldMapping, else strips the row prefix", () => {
    expect(
      getClaimFieldOriginalName({
        name: "claims_claimSpareParts#2_quantity",
        fieldMapping: { originalName: "qty" },
      } as any),
    ).toBe("qty");
    expect(getClaimFieldOriginalName({ name: "claims_claimSpareParts#2_unitPrice" } as any)).toBe(
      "unitPrice",
    );
  });

  it("getClaimRecalculationPayloadErrors keeps errors of active row fields only", () => {
    const errors = { r0_quantity: "required", arch_quantity: "x", claimData_x: "y" };
    expect(getClaimRecalculationPayloadErrors(getClaimSparePartsAreas(tabs), errors)).toEqual({
      r0_quantity: "required",
    });
  });

  it("applyClaimRecalculation copies only the price parts that are present", () => {
    const claim = { id: "C1", materials: [], claimPriceSummary: { netAmount: 1 } } as any;
    const result = applyClaimRecalculation(claim, {
      materials: [{ id: "L1" }],
      claimPriceSummary: null,
      claimStatus: "APPROVED",
    });
    expect(result).toEqual({
      id: "C1",
      materials: [{ id: "L1" }],
      claimPriceSummary: { netAmount: 1 },
    });
    expect(result).not.toBe(claim);
  });

  it("getRecalculationErrorKeys dedupes keys and drops 2004", () => {
    expect(
      getRecalculationErrorKeys({
        errorMessages: [{ key: "A" }, { key: "A" }, { key: "2004" }, {}],
      }),
    ).toEqual(["A"]);
    expect(getRecalculationErrorKeys({})).toEqual([]);
  });

  it("hasRecalculationErrors is true for any error message", () => {
    expect(hasRecalculationErrors({ errorMessages: [{ key: "2004" }] })).toBe(true);
    expect(hasRecalculationErrors({ errorMessages: [] })).toBe(false);
    expect(hasRecalculationErrors({})).toBe(false);
  });
});
