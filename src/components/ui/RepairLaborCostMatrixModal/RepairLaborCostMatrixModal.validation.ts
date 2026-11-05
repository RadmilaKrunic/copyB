import { Ranges } from "@/api/services/laborCost/laborCost";
import { Ranges as ServiceCenterRanges } from "../../../api/services/serviceCenters/serviceCenters.types";
import { useTranslation } from "react-i18next";

interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export const MAX_LABOR_UNIT = 40;

export const useValidateRanges = (
  localMatrixData: Ranges[] | ServiceCenterRanges[] | null,
  values: Record<string, unknown>,
): ValidationResult => {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const visitedUnits = new Set<number>();
  const minUnits: number[] = [];
  const maxUnits: number[] = [];

  localMatrixData?.forEach((_row, rowIndex) => {
    minUnits.push(Number(values[`minimumLaborUnitMatrix_${rowIndex}`] || 0));
    maxUnits.push(Number(values[`maximumLaborUnitMatrix_${rowIndex}`] || 0));
  });

  for (let i = 0; i < minUnits.length; i++) {
    const min = minUnits[i];
    const max = maxUnits[i];

    for (let u = min; u <= max; u++) {
      if (visitedUnits.has(u)) {
        return {
          isValid: false,
          errorMessage: t("matrixOverlapValidation", { laborUnit: u }),
        };
      }
      visitedUnits.add(u);
    }
  }
  for (let u = 1; u <= MAX_LABOR_UNIT; u++) {
    if (!visitedUnits.has(u)) {
      return {
        isValid: false,
        errorMessage: t("matrixCoverageValidation", { laborUnit: u }),
      };
    }
  }

  if (maxUnits.some((max) => max < 1 || max > MAX_LABOR_UNIT)) {
    return {
      isValid: false,
      errorMessage: t("matrixMaxValueValidation", { maxValue: MAX_LABOR_UNIT }),
    };
  }

  return { isValid: true };
};

export const hasUnmappedUnits = (
  localMatrixData: any[] | null,
  values: Record<string, unknown>,
): boolean => {
  if (!localMatrixData || localMatrixData.length === 0) return true;

  const coveredUnits = new Set<number>();

  localMatrixData.forEach((_, rowIndex) => {
    const minUnit = Number(values[`minimumLaborUnitMatrix_${rowIndex}`] || 0);
    const maxUnit = Number(values[`maximumLaborUnitMatrix_${rowIndex}`] || 0);

    if (minUnit > 0 && maxUnit >= minUnit) {
      for (let i = minUnit; i <= maxUnit; i++) {
        coveredUnits.add(i);
      }
    }
  });

  for (let u = 1; u <= MAX_LABOR_UNIT; u++) {
    if (!coveredUnits.has(u)) {
      return true;
    }
  }

  return false;
};
