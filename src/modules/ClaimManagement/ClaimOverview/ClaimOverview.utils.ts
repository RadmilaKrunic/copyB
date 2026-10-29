import Field from "components/generics/Field/GenericField.types";
import Area from "components/generics/Area/GenericArea.types";
import Section from "components/generics/Section/GenericSection.types";
import type { ClaimItem } from "./Claims.types";
import GenericForm, { ActionMandatoryFields } from "components/generics/Form/GenericForm.types";

export function makeFieldGetter(
  fields: Field[],
  formValues: Record<string, unknown>,
): (subtype: string) => unknown {
  return (subtype) => {
    const field = fields.find((af) => af.subtype === subtype);
    return field ? formValues[field.name] : undefined;
  };
}

/**
 * Claim Validate runs the field checks of job diagnostics Validate. Both use the UI config
 * action named "validate" (mandatory-field keys are lowercased action names).
 */
export const CLAIM_VALIDATE_ACTION = "validate";

/** Row fields the claim Validate payload needs, whatever the UI config lists. */
export const CLAIM_VALIDATE_MANDATORY_FIELDS = ["position", "sparePartNumber", "type", "quantity"];

/**
 * Mandatory fields per action, where the claim "validate" action always includes the claim
 * spare-part row fields, so a row with type "Select" shows its own error instead of a failed
 * price validation. Fields the UI config lists are kept.
 */
export const withClaimValidateMandatoryFields = (
  mandatoryFields: Record<string, ActionMandatoryFields> | null,
): Record<string, ActionMandatoryFields> => {
  const configured = mandatoryFields?.[CLAIM_VALIDATE_ACTION];
  const configuredList = configured?.fieldList ?? [];
  const configuredNames = new Set(configuredList.map((name) => name.toLowerCase()));
  const missing = CLAIM_VALIDATE_MANDATORY_FIELDS.filter(
    (name) => !configuredNames.has(name.toLowerCase()),
  );
  if (configuredList.length > 0 && missing.length === 0) return mandatoryFields ?? {};
  return {
    ...mandatoryFields,
    [CLAIM_VALIDATE_ACTION]: { ...configured, fieldList: [...configuredList, ...missing] },
  };
};

const CLAIM_RECALCULATE_ACTION = "onRecalculatePrices";

/** Claim spare-part row fields that re-price the claim, and their trigger (as on job rows). */
const CLAIM_RECALCULATE_TRIGGERS: Record<string, "onValueChange" | "onBlur"> = {
  position: "onValueChange",
  type: "onValueChange",
  sparePartNumber: "onBlur",
  quantity: "onBlur",
  unitPrice: "onBlur",
  suggestedNetPrice: "onBlur",
  discountNet: "onBlur",
  netAmount: "onBlur",
  tax: "onBlur",
  taxAmount: "onBlur",
  grossAmount: "onBlur",
  discount: "onBlur",
  totalAmount: "onBlur",
};

const withRecalculateAction = (field: Field): Field => {
  const trigger = CLAIM_RECALCULATE_TRIGGERS[field.name];
  if (!trigger || field.onValueChange || field.onBlur) return field;
  return { ...field, [trigger]: CLAIM_RECALCULATE_ACTION };
};

/**
 * Claim spare-part row edits re-price the claim like job diagnostics rows. A UI config without
 * the "onRecalculatePrices" field actions on the claim rows gets the job row defaults; a field
 * that already names an action keeps it.
 */
export const withClaimRecalculateActions = (form: GenericForm | null): GenericForm | null => {
  if (!form) return form;
  return {
    ...form,
    sections: form.sections.map((section) => ({
      ...section,
      areas: section.areas.map((area) =>
        area.name === "claimSpareParts"
          ? { ...area, fields: area.fields.map(withRecalculateAction) }
          : area,
      ),
    })),
  };
};

/** Editable claim spare-parts row areas, in row order (same order as the manager's materials). */
export const getClaimSparePartsAreas = (tabs: Section[]): Area[] =>
  (tabs.find((t) => t.name === "claims")?.areas ?? []).filter(
    (a) =>
      a.isMultiple &&
      a.name.includes("claimSpareParts") &&
      !a.name.includes("claimArchivedSpareParts"),
  );

/**
 * Claim areas in job diagnostics order: rows, summary, then archived rows. The UI config gives
 * archived rows and the summary the same position, so archived rows move after every other area.
 */
export const orderClaimAreasLikeDiagnostics = (areas: Area[]): Area[] => {
  const isArchived = (a: Area) => a.name.includes("claimArchivedSpareParts");
  if (!areas.some(isArchived)) return areas;
  const lastPosition = Math.max(
    0,
    ...areas.filter((a) => !isArchived(a)).map((a) => a.position ?? 0),
  );
  return areas.map((a) =>
    isArchived(a) && (a.position ?? 0) <= lastPosition ? { ...a, position: lastPosition + 1 } : a,
  );
};

/** Row index of the spare-parts area that holds `fieldName`, or -1. */
export const findClaimRowIndex = (areas: Area[], fieldName: string): number =>
  areas.findIndex((a) => a.fields.some((f) => f.name === fieldName));

/** Field name without its row prefix: `claims_claimSpareParts#2_quantity` -> `quantity`. */
export const getClaimFieldOriginalName = (field: Field): string =>
  field.fieldMapping?.originalName || field.name.split("_").at(-1) || field.name;

/**
 * Keeps the errors of the fields the recalculate payload reads from the form: the claim
 * spare-parts rows. Everything else in the claim payload comes from the loaded claim.
 */
export const getClaimRecalculationPayloadErrors = (
  areas: Area[],
  formErrors: Record<string, string>,
): Record<string, string> => {
  const payloadErrors: Record<string, string> = {};
  areas.forEach((a) =>
    a.fields.forEach((f) => {
      if (formErrors[f.name]) payloadErrors[f.name] = formErrors[f.name];
    }),
  );
  return payloadErrors;
};

/** Price-related parts of a recalculate response, applied over the cached claim. */
const RECALCULATED_CLAIM_KEYS = [
  "materials",
  "archivedMaterials",
  "claimPriceSummary",
  "claimPriceSummaryDetailed",
] as const;

/**
 * Copies only the re-priced parts of the recalculate response onto the claim, so the
 * query cache keeps the GET /v1/claims/{id} shape (the response shape can differ).
 */
export const applyClaimRecalculation = (
  claim: ClaimItem,
  response: Record<string, unknown>,
): ClaimItem => {
  const updated: ClaimItem = { ...claim };
  RECALCULATED_CLAIM_KEYS.forEach((key) => {
    if (response[key] !== undefined && response[key] !== null) {
      (updated as Record<string, unknown>)[key] = response[key];
    }
  });
  return updated;
};

/** Distinct price error keys from a recalculate response ("2004" is not a price error). */
export const getRecalculationErrorKeys = (response: Record<string, unknown>): string[] => {
  const errorMessages = response.errorMessages;
  if (!Array.isArray(errorMessages)) return [];
  const keys = errorMessages
    .map((item: unknown) =>
      item && typeof item === "object" ? (item as Record<string, unknown>).key : undefined,
    )
    .filter((key): key is string => typeof key === "string" && key !== "2004");
  return [...new Set(keys)];
};

/** True when the response reports errors at all (including only "2004"). */
export const hasRecalculationErrors = (response: Record<string, unknown>): boolean =>
  Array.isArray(response.errorMessages) && response.errorMessages.length > 0;
