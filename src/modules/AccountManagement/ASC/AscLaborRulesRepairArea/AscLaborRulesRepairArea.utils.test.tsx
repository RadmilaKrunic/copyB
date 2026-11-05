import { describe, expect, it } from "vitest";
import {
  fillLaborRateField,
  formatRangesAndValues,
  showLaborRulesMatrix,
} from "./AscLaborRulesRepairArea.utils";

const area = {
  name: "laborRulesRepair",
  fields: [{ name: "laborRateLevel1" }, { name: "laborRateLevel2" }, { name: "laborRateLevel3" }],
} as any;

describe("AscLaborRulesRepairArea.utils", () => {
  it("returns selected repair level matrix from configuration", () => {
    const config = [
      { level: "L1", ranges: [], method: "MATRIX" },
      { level: "L2", ranges: [], method: "MATRIX" },
      { level: "L3", ranges: [], method: "MATRIX" },
    ] as any;

    expect(showLaborRulesMatrix(config, "level1Repair")?.level).toBe("L1");
    expect(showLaborRulesMatrix(config, "level2Repair")?.level).toBe("L2");
    expect(showLaborRulesMatrix(config, "level3Repair")?.level).toBe("L3");
    expect(showLaborRulesMatrix(config, undefined)).toBeUndefined();
  });

  it("returns the labor rate field mapped to selected level", () => {
    expect(fillLaborRateField({ level: "L1" } as any, area)?.name).toBe("laborRateLevel1");
    expect(fillLaborRateField({ level: "L2" } as any, area)?.name).toBe("laborRateLevel2");
    expect(fillLaborRateField({ level: "L3" } as any, area)?.name).toBe("laborRateLevel3");
    expect(fillLaborRateField(undefined, area)).toBeUndefined();
  });

  it("formats labor unit ranges and values for matrix table", () => {
    const result = formatRangesAndValues({ labourUnitRange: [1, 2, 3], value: 45 } as any);

    expect(result).toEqual({ labourUnitRange: "1 - 3", laborValue: 45 });
  });
});
