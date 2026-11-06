import { useContext, useEffect } from "react";
import { useDefaultTotalAmountPriceRanges } from "api/services/prices/hooks";
import type Field from "components/generics/Field/GenericField.types";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { useDiagnosticsContext } from "../DiagnosticsContext";
import {
  getRangedTotalAmountEditability,
  hasPriceLimit,
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

/**
 * Price fields of a job spare-parts row. FR / PC rows with a total amount range from the
 * default-parameter API (`totalAmountPriceRange`) unlock step by step (see
 * getRangedTotalAmountEditability) and have their total amount checked against the limits;
 * every other row keeps `baseEditability`.
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
  const isTotalEntryRow = isTotalEntryPosition(position);
  const ranges = useDefaultTotalAmountPriceRanges(
    {
      ...defaultParameterJobSource,
      actionType: values["actionType"],
      // The row's own type is the request's job type (chargeable rows get 0 / 0), as for the
      // row-type quantity refresh, so both share one cached call.
      jobType: rowType || values["jobType"],
      faultCode: values["faultCode"],
      faultCodeLabourQuantity: values["faultCodeLabourQuantity"],
      exchangeReason: values["exchangeReason"],
    },
    isTotalEntryRow,
  );
  const limits = isTotalEntryRow ? ranges[position.toUpperCase()] : undefined;
  useTotalAmountLimitCheck(fields, limits);

  if (!isTotalAmountInRange(limits)) return baseEditability;
  return getRangedTotalAmountEditability(
    Boolean(materialId),
    Boolean(materialId && validatedTotalAmountMaterialIds?.has(materialId)),
    baseEditability,
  );
};
