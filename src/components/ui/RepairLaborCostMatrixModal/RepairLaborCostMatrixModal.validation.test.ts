import { describe, expect, it, vi } from "vitest";
import {
  MAX_LABOR_UNIT,
  hasUnmappedUnits,
  useValidateRanges,
} from "./RepairLaborCostMatrixModal.validation";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => `${key}:${JSON.stringify(params || {})}`,
  }),
}));

describe("RepairLaborCostMatrixModal.validation", () => {
  it("returns overlap validation error when unit ranges overlap", () => {
    const result = useValidateRanges(
      [
        { labourUnitRange: [1, 2], value: 10 },
        { labourUnitRange: [2, 3], value: 10 },
      ],
      {
        minimumLaborUnitMatrix_0: 1,
        maximumLaborUnitMatrix_0: 2,
        minimumLaborUnitMatrix_1: 2,
        maximumLaborUnitMatrix_1: 3,
      },
    );

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("matrixOverlapValidation");
  });

  it("returns coverage validation error when not all units are mapped", () => {
    const result = useValidateRanges([{ labourUnitRange: [1, 10], value: 10 }], {
      minimumLaborUnitMatrix_0: 1,
      maximumLaborUnitMatrix_0: 10,
    });

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("matrixCoverageValidation");
  });

  it("returns max value validation error when max unit exceeds allowed range", () => {
    const result = useValidateRanges([{ labourUnitRange: [1, MAX_LABOR_UNIT + 1], value: 10 }], {
      minimumLaborUnitMatrix_0: 1,
      maximumLaborUnitMatrix_0: MAX_LABOR_UNIT + 1,
    });

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("matrixMaxValueValidation");
  });

  it("returns valid result for complete non-overlapping coverage", () => {
    const result = useValidateRanges(
      [
        { labourUnitRange: [1, 20], value: 10 },
        { labourUnitRange: [21, MAX_LABOR_UNIT], value: 20 },
      ],
      {
        minimumLaborUnitMatrix_0: 1,
        maximumLaborUnitMatrix_0: 20,
        minimumLaborUnitMatrix_1: 21,
        maximumLaborUnitMatrix_1: MAX_LABOR_UNIT,
      },
    );

    expect(result).toEqual({ isValid: true });
  });

  it("detects unmapped units correctly", () => {
    expect(
      hasUnmappedUnits([{ labourUnitRange: [1, 10], value: 10 }], {
        minimumLaborUnitMatrix_0: 1,
        maximumLaborUnitMatrix_0: 10,
      }),
    ).toBe(true);

    expect(
      hasUnmappedUnits(
        [
          { labourUnitRange: [1, 20], value: 10 },
          { labourUnitRange: [21, MAX_LABOR_UNIT], value: 10 },
        ],
        {
          minimumLaborUnitMatrix_0: 1,
          maximumLaborUnitMatrix_0: 20,
          minimumLaborUnitMatrix_1: 21,
          maximumLaborUnitMatrix_1: MAX_LABOR_UNIT,
        },
      ),
    ).toBe(false);
  });
});
