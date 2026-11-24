import { useContext, useEffect } from "react";
import { useDefaultTotalAmountPriceRanges } from "api/services/prices/hooks";
import type Field from "components/generics/Field/GenericField.types";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { useDiagnosticsContext } from "../DiagnosticsContext";
import {
  NOT_EDITABLE,
  getRangedTotalAmountEditability,
  hasPriceLimit,
  isFixedPrice,
  isTotalAmountInRange,
  isTotalEntryPosition,
  type PriceFieldEditability,
  type PriceLimits,
} from "./materialPriceEditability";

interface TotalAmountRangeParams {
  fields: Field[];
  values: Record<string, unknown>;
  position: string;
  rowType: string;
  materialId: string | undefined;
  /** The row's usual rules (getPriceFieldEditability). */
  baseEditability: PriceFieldEditability;
}

/** Writes the total amount limits into the form's runtime value ranges while they apply. */
const useTotalAmountLimitCheck = (fields: Field[], limits: PriceLimits | undefined): void => {
  const { fieldValueRanges } = useContext(GenericFormContext);
  const totalAmountFieldName =
    fields.find((field) => field.subtype === "diagnosticTotalAmount")?.name ?? "";
  // 0 / 0 or equal limits are not checked.
  const checkedLimits = hasPriceLimit(limits) ? limits : undefined;
  const minValue = checkedLimits?.lowestLimit;
  const maxValue = checkedLimits?.highestLimit;
  useEffect(() => {
    const ranges = fieldValueRanges?.current;
    if (!ranges || !totalAmountFieldName || minValue === undefined || maxValue === undefined) {
      return undefined;
    }
    ranges[totalAmountFieldName] = { minValue, maxValue };
    return () => {
      delete ranges[totalAmountFieldName];
    };
  }, [fieldValueRanges, totalAmountFieldName, minValue, maxValue]);
};

/** True when the row's own type (fallback: the job's type) is CHARGEABLE. */
const isChargeableType = (jobType: unknown): boolean =>
  typeof jobType === "string" && jobType.toUpperCase() === "CHARGEABLE";

/**
 * Price fields of a job spare-parts row. Non-chargeable FR / PC rows with a total amount range from
 * the default-parameter API (`unitPriceRange`, used as the total amount limit) unlock step by step
 * (see getRangedTotalAmountEditability) and have their total amount checked against the limits;
 * equal non-zero limits fix the price, so all price fields are disabled. Chargeable FR / PC rows
 * ignore the limits: totalAmount is always editable and never range-checked. Every other row keeps
 * `baseEditability`.
 */
export const useTotalAmountRangeEditability = ({
  fields,
  values,
  position,
  rowType,
  materialId,
  baseEditability,
}: TotalAmountRangeParams): PriceFieldEditability => {
  const { validatedTotalAmountMaterialIds, defaultParameterJobSource } = useDiagnosticsContext();
  // The row's own type is the request's job type (chargeable rows get 0 / 0), as for the
  // row-type quantity refresh, so both share one cached call.
  const requestJobType = rowType || values["jobType"];
  // Chargeable FR / PC totals are free: no limits, no steps.
  const hasTotalAmountRange = isTotalEntryPosition(position) && !isChargeableType(requestJobType);
  const ranges = useDefaultTotalAmountPriceRanges(
    {
      ...defaultParameterJobSource,
      actionType: values["actionType"],
      jobType: requestJobType,
      faultCode: values["faultCode"],
      faultCodeLabourQuantity: values["faultCodeLabourQuantity"],
      exchangeReason: values["exchangeReason"],
    },
    hasTotalAmountRange,
  );
  const limits = hasTotalAmountRange ? ranges[position.toUpperCase()] : undefined;
  useTotalAmountLimitCheck(fields, limits);

  // Equal non-zero limits (e.g. ZA): the price is fixed, the user enters nothing.
  if (isFixedPrice(limits)) return NOT_EDITABLE;
  if (!isTotalAmountInRange(limits)) return baseEditability;
  return getRangedTotalAmountEditability(
    Boolean(materialId),
    Boolean(materialId && validatedTotalAmountMaterialIds?.has(materialId)),
    baseEditability,
  );
};
