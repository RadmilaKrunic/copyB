import { FormikContextType, FormikErrors } from "formik";
import { TFunction } from "i18next";
import { getManufacturedDate } from "../../../api/services/orders/orders";
import Field from "./GenericField.types";
import type { AllowedPosition } from "api/services/countryConfiguration/countryConfiguration";
import { resolveQuantityForPosition } from "hooks/useDiagnosticsManager";
import type { ResolveDefaultQuantities } from "api/services/prices/prices.types";
import { isProtectedPosition } from "modules/JobManagement/JobOverview/SparePartsRow/materialPriceEditability";

/**
 * Reads a form value as a string. Objects (and empty values) give "" rather than
 * "[object Object]", so they never look like a position or a code.
 */
const toFieldString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : "";

export const getSerialNumberErrorKey = (
  value: string,
  brandValue: unknown,
): "serialNumberMustHave" | "dremelSerialNumberMustHave" | null => {
  if (
    (value.length < 9 && value.length !== 3 && value !== "999") ||
    value.length === 10 ||
    value.length === 11
  ) {
    return brandValue === "DREMEL" ? "dremelSerialNumberMustHave" : "serialNumberMustHave";
  }
  return null;
};

export const updateDependentFields = (
  field: Field,
  formikContext: FormikContextType<Record<string, unknown>>,
  allFields: Field[],
  t: TFunction<"translation", "app">,
  value: string,
): true | void => {
  const { setFieldValue, setFieldError, setFieldTouched, values } = formikContext;
  switch (field?.fieldMapping?.originalName) {
    case "serialNumber":
      {
        const manufacturedDateName = field.name.replace("serialNumber", "manufacturedDate");
        if (values[manufacturedDateName]) {
          void setFieldValue(manufacturedDateName, "");
        }
        const manufacturedDateField = allFields.find((f) => f.name === manufacturedDateName);
        const strippedValue = value.replaceAll(/[^a-zA-Z0-9]/g, "");
        const strippedLength = strippedValue.length;
        const brandKey = field.name.split("_serialNumber")[0] + "_brand";
        const brandValue = values[brandKey];

        if (
          strippedLength === 9 ||
          (strippedLength === 3 && strippedValue === "999") ||
          (strippedLength === 3 && brandValue === "DREMEL") ||
          strippedLength === 12 ||
          strippedLength === 13 ||
          strippedLength === 14
        ) {
          void (async () => {
            try {
              const manufacturedDate = await getManufacturedDate(value);
              if (
                manufacturedDate &&
                typeof manufacturedDate === "string" &&
                manufacturedDate.length === 6
              ) {
                const year = Number(manufacturedDate.slice(0, 4));
                const month = Number(manufacturedDate.slice(4, 6));
                if (manufacturedDateField?.name) {
                  void setFieldValue(manufacturedDateField.name, `${month}/${year}`);
                }
              } else if (
                manufacturedDate &&
                typeof manufacturedDate === "string" &&
                manufacturedDate.length === 3
              ) {
                if (manufacturedDateField?.name) {
                  void setFieldValue(manufacturedDateField.name, manufacturedDate);
                }
              } else {
                setFieldError(field.name, t("toolNotFound", { id: value }));
                await setFieldTouched(field.name, true, false);
              }
            } catch {
              setFieldError(field.name, t("toolNotFound", { id: value }));
              await setFieldTouched(field.name, true, false);
              const manufacturedDateLabel = manufacturedDateField?.label
                ? t(manufacturedDateField.label)
                : t("manufacturedDate");
              setFieldError(manufacturedDateName, `${manufacturedDateLabel} ${t("isRequired")}`);
              await setFieldTouched(manufacturedDateName, true, false);
            }
          })();
        }

        if (strippedLength > 14) {
          return true;
        }
      }
      break;
    case "brand":
      {
        const manufacturedDateName = field.name.replace("brand", "manufacturedDate");
        const serialNumberName = field.name.replace("brand", "serialNumber");
        void setFieldValue(manufacturedDateName ?? "", "");
        void setFieldValue(serialNumberName ?? "", "");
      }
      break;
    default:
      break;
  }
};

export const onBlurActions = (
  field: Field,
  e: React.FocusEvent<HTMLInputElement>,
  formikContext: FormikContextType<Record<string, unknown>>,
  t: TFunction<"translation", "app">,
): void => {
  const { setFieldError, setFieldTouched, values } = formikContext;
  if (field?.fieldMapping?.originalName === "serialNumber") {
    const brandKey = field.name.split("_serialNumber")[0] + "_brand";
    const brandValue = values[brandKey];
    const serialErrorKey = getSerialNumberErrorKey(e.target.value, brandValue);
    if (serialErrorKey) {
      void setFieldTouched(field.name, true, false);
      setFieldError(field.name, t(serialErrorKey));
    }
  }
};

/** A protected-row quantity field that a fault code selection changed, with its new value. */
export interface ChangedQuantityField {
  field: Field;
  value: number;
}

/**
 * Handles populating related fields when a fault code is selected from the dropdown.
 * Sets faultCode, faultCodeDescription, faultCodeLabourQuantity from the raw API item,
 * and updates the quantity of the protected spare-parts rows (LA, FR, PC).
 * The quantities come from the default-parameter API (`resolveDefaultQuantities`); the fault
 * code is often the last value the request needs, so this is where existing rows get them.
 * When the API is not supplied or gives no LA quantity, the country config decides for LA:
 * the fault code's labour quantity is used only when LA's quantitySource is "FAULT_CODES".
 * When `allowedPositions` is not supplied, the LA-source check is skipped (legacy behavior).
 * Returns the quantity fields whose value actually changed, so the caller can run their field
 * action (recalculate) as for a user edit: a programmatic set fires no blur.
 */
export const handleFaultCodeSelection = async (
  rawItem: Record<string, unknown>,
  setFieldValue: (field: string, value: unknown) => Promise<void | FormikErrors<unknown>>,
  allFields: Field[] | null,
  formValues: Record<string, unknown>,
  allowedPositions?: AllowedPosition[],
  resolveDefaultQuantities?: ResolveDefaultQuantities,
): Promise<ChangedQuantityField[]> => {
  const changedQuantities: ChangedQuantityField[] = [];
  if (!allFields) return changedQuantities;

  const faultCodeNameList = ["faultCode", "faultCodeDescription", "faultCodeLabourQuantity"];

  for (const fieldName of faultCodeNameList) {
    void setFieldValue(fieldName, rawItem?.[fieldName]);
  }

  const protectedPositions = allFields.filter(
    (f) =>
      f.subtype === "diagnosticPosition" && isProtectedPosition(toFieldString(formValues[f.name])),
  );
  if (protectedPositions.length === 0) return changedQuantities;

  const serverQuantities = resolveDefaultQuantities
    ? await resolveDefaultQuantities({
        ...formValues,
        faultCode: rawItem?.faultCode,
        faultCodeLabourQuantity: rawItem?.faultCodeLabourQuantity,
      })
    : null;
  const quantityFieldOf = (positionField: Field) =>
    allFields.find(
      (f) =>
        f.subtype === "diagnosticQuantity" &&
        f.fieldMapping?.nameStartsWith === positionField.fieldMapping?.nameStartsWith,
    );
  const setQuantity = (qtyField: Field, quantity: number) => {
    void setFieldValue(qtyField.name, quantity);
    if (Number(formValues[qtyField.name]) !== Number(quantity)) {
      changedQuantities.push({ field: qtyField, value: quantity });
    }
  };

  // FR / PC rows take the API quantity only; their config quantity does not depend on the fault code.
  for (const positionField of protectedPositions) {
    const position = toFieldString(formValues[positionField.name]).toUpperCase();
    const quantity = serverQuantities?.[position];
    const qtyField = quantityFieldOf(positionField);
    if (position !== "LA" && quantity !== undefined && qtyField) {
      setQuantity(qtyField, quantity);
    }
  }

  const labourPosition = protectedPositions.find((f) => formValues[f.name] === "LA");
  if (!labourPosition) return changedQuantities;
  const serverLabourQty = serverQuantities?.LA;

  if (serverLabourQty === undefined && allowedPositions) {
    const laPosConfig = allowedPositions.find((p) => p.position === "LA");
    if (laPosConfig?.quantity.quantitySource !== "FAULT_CODES") return changedQuantities;
  }

  const labourQty = serverLabourQty ?? (Number(rawItem?.faultCodeLabourQuantity) || 0);

  const qtyField = quantityFieldOf(labourPosition);
  if (qtyField) setQuantity(qtyField, labourQty);
  return changedQuantities;
};

/**
 * Form fields that feed the default-parameter request and are changed through a plain dropdown.
 * actionType / jobType changes rebuild the job's rows (useDiagnosticsManager Effect 2), which
 * loads the API quantities itself; the fault code has its own handler (handleFaultCodeSelection).
 */
export const DEFAULT_PARAMETER_DROPDOWN_FIELDS = new Set(["exchangeReason"]);

/**
 * Re-reads the default-parameter API quantities after one of its inputs changed (e.g. the
 * exchange reason) and writes them onto the protected rows (LA, FR, PC) already shown.
 * Rows the API gives no quantity for keep theirs. Returns the quantity fields whose value
 * actually changed, so the caller can run their field action (recalculate) as for a user edit.
 */
export const refreshProtectedRowQuantities = async ({
  allFields,
  formValues,
  setFieldValue,
  resolveDefaultQuantities,
}: {
  allFields: Field[] | null;
  formValues: Record<string, unknown>;
  setFieldValue: (field: string, value: unknown) => Promise<void | FormikErrors<unknown>>;
  resolveDefaultQuantities?: ResolveDefaultQuantities;
}): Promise<ChangedQuantityField[]> => {
  const changedQuantities: ChangedQuantityField[] = [];
  if (!allFields || !resolveDefaultQuantities) return changedQuantities;

  const protectedPositions = allFields.filter(
    (f) =>
      f.subtype === "diagnosticPosition" && isProtectedPosition(toFieldString(formValues[f.name])),
  );
  if (protectedPositions.length === 0) return changedQuantities;

  const serverQuantities = await resolveDefaultQuantities(formValues);
  if (!serverQuantities) return changedQuantities;

  for (const positionField of protectedPositions) {
    const position = toFieldString(formValues[positionField.name]).toUpperCase();
    const quantity = serverQuantities[position];
    const qtyField = allFields.find(
      (f) =>
        f.subtype === "diagnosticQuantity" &&
        f.fieldMapping?.nameStartsWith === positionField.fieldMapping?.nameStartsWith,
    );
    if (quantity === undefined || !qtyField) continue;
    if (Number(formValues[qtyField.name]) === Number(quantity)) continue;
    await setFieldValue(qtyField.name, quantity);
    changedQuantities.push({ field: qtyField, value: quantity });
  }
  return changedQuantities;
};

/**
 * True when the rule's `maxCount` for this position is already used up by the other rows
 * of the same list. The claim page also holds the job's read-only rows, so rows are counted
 * per list prefix (`...#N_` -> `...#`), never across the whole form.
 */
const isPositionCapReached = (
  allFields: Field[],
  field: Field,
  rowPrefix: string | undefined,
  position: string,
  values: Record<string, unknown>,
  maxCount: number,
): boolean => {
  const rowGroup = /^(.*#)\d+_$/.exec(rowPrefix ?? "")?.[1] ?? "";
  const usedByOtherRows = allFields.filter(
    (f) =>
      f.subtype === "diagnosticPosition" &&
      f.name !== field.name &&
      f.name.startsWith(rowGroup) &&
      values[f.name] === position,
  ).length;
  return usedByOtherRows >= maxCount;
};

/** Fills the fixed part number and description of an autofilled position (LA, FR). */
const applyPositionAutofill = async (
  autofill: { partNumber: string; description: string } | undefined,
  rowField: (subtype: string) => Field | undefined,
  setFieldValue: (field: string, value: unknown) => Promise<void | FormikErrors<unknown>>,
): Promise<void> => {
  if (!autofill) return;
  const partNumberField = rowField("diagnosticPartNumber");
  const descriptionField = rowField("diagnosticDescription");
  if (partNumberField) await setFieldValue(partNumberField.name, autofill.partNumber);
  if (descriptionField) await setFieldValue(descriptionField.name, autofill.description);
};

/**
 * Applies the matched diagnostic rule (job or claim) to a spare-parts row whose position is
 * changing, before any price action runs (positions the rule does not list only get the
 * API quantity):
 * - rejects a position the rule caps (maxCount already used by the other rows);
 * - sets the quantity: protected positions (LA, FR, PC) take it from the default-parameter API
 *   when `resolveDefaultQuantities` is supplied (job and claim rows); otherwise, or when the
 *   API gives none, the quantity the rule prescribes (DEFAULT / FAULT_CODES sources);
 * - fills the fixed part number and description of autofilled positions (LA, FR).
 * Returns false when the position is rejected; the row is left unchanged in that case.
 */
export const applyPositionRules = async ({
  field,
  position,
  allFields,
  values,
  allowedPositions,
  positionAutofill,
  setFieldValue,
  resolveDefaultQuantities,
}: {
  field: Field;
  position: string;
  allFields: Field[];
  values: Record<string, unknown>;
  allowedPositions?: AllowedPosition[];
  positionAutofill: Record<string, { partNumber: string; description: string }>;
  setFieldValue: (field: string, value: unknown) => Promise<void | FormikErrors<unknown>>;
  resolveDefaultQuantities?: ResolveDefaultQuantities;
}): Promise<boolean> => {
  const rowPrefix = field.fieldMapping?.nameStartsWith;
  const rowFields = rowPrefix
    ? allFields.filter((f) => f.fieldMapping?.nameStartsWith === rowPrefix)
    : [];
  const rowField = (subtype: string) => rowFields.find((f) => f.subtype === subtype);
  const positionRule = allowedPositions?.find((p) => p.position === position);
  // Positions outside the matched rule (e.g. special-material SP, claim rows) have no rules.
  const rulePositions = positionRule ? allowedPositions : undefined;

  if (
    positionRule &&
    isPositionCapReached(allFields, field, rowPrefix, position, values, positionRule.maxCount)
  ) {
    return false;
  }

  const serverQuantities =
    resolveDefaultQuantities && isProtectedPosition(position)
      ? await resolveDefaultQuantities(values)
      : null;
  const quantity =
    serverQuantities?.[position.toUpperCase()] ??
    (rulePositions
      ? resolveQuantityForPosition(
          rulePositions,
          position,
          values.faultCode as string | undefined,
          Number(values.faultCodeLabourQuantity) || 0,
        )
      : undefined);
  const quantityField = rowField("diagnosticQuantity");

  if (quantity !== undefined && quantityField) {
    await setFieldValue(quantityField.name, quantity);
  }

  if (!positionRule) return true;

  await applyPositionAutofill(positionAutofill[position], rowField, setFieldValue);

  return true;
};

export const resolveIsRequired = (
  field: Field,
  values: Record<string, unknown>,
): boolean | undefined => {
  const dep = field.requiredDependentFields;
  if (!dep || (!dep.byValueOr?.length && !dep.byValueAnd?.length)) {
    return field.isRequired;
  }
  const andMet = dep.byValueAnd?.length
    ? dep.byValueAnd.every((el) => values[el.fieldName] === el.fieldValue)
    : false;
  const orMet = dep.byValueOr?.length
    ? dep.byValueOr.some((el) => values[el.fieldName] === el.fieldValue)
    : false;
  return andMet || orMet;
};
