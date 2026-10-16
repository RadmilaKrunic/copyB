import { describe, it, expect } from "vitest";
import Field from "components/generics/Field/GenericField.types";
import { getClaimRowMaterialIndex } from "./ClaimSparePartsRow.utils";

const rowFields = (...indices: number[]): Field[] =>
  indices.flatMap((i) => [
    { name: `claims_claimSpareParts#${i}_position`, label: "p", type: "dropdown" },
    { name: `claims_claimSpareParts#${i}_sparePartNumber`, label: "pn", type: "text" },
  ]) as Field[];

describe("getClaimRowMaterialIndex", () => {
  it("matches the name index when no row was deleted", () => {
    expect(getClaimRowMaterialIndex("claims_claimSpareParts#2_", rowFields(0, 1, 2))).toBe(2);
  });

  it("returns the row's position among active rows after a delete and add", () => {
    // #1 deleted, #3 added: materials = [#0, #2, #3]
    const fields = rowFields(0, 2, 3);
    expect(getClaimRowMaterialIndex("claims_claimSpareParts#0_", fields)).toBe(0);
    expect(getClaimRowMaterialIndex("claims_claimSpareParts#2_", fields)).toBe(1);
    expect(getClaimRowMaterialIndex("claims_claimSpareParts#3_", fields)).toBe(2);
  });

  it("ignores archived rows", () => {
    const fields = [
      ...rowFields(0, 2),
      { name: "claims_claimArchivedSpareParts#0_position", label: "p", type: "dropdown" },
    ] as Field[];
    expect(getClaimRowMaterialIndex("claims_claimSpareParts#2_", fields)).toBe(1);
  });

  it("falls back to the name index when the row is not in allFields yet", () => {
    expect(getClaimRowMaterialIndex("claims_claimSpareParts#4_", rowFields(0))).toBe(4);
  });

  it("returns 0 for a prefix without an index", () => {
    expect(getClaimRowMaterialIndex("", rowFields(0))).toBe(0);
  });
});
