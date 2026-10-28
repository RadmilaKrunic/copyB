import Field from "components/generics/Field/GenericField.types";
import Area from "components/generics/Area/GenericArea.types";
import Section from "components/generics/Section/GenericSection.types";
import type { ClaimItem } from "./Claims.types";
import type { ActionMandatoryFields } from "components/generics/Form/GenericForm.types";

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

/** Row fields the claim Validate payload needs, when the UI config lists none. */
export const CLAIM_VALIDATE_MANDATORY_FIELDS = ["position", "sparePartNumber", "type", "quantity"];

/**
 * Mandatory fields per action, with the claim spare-part row fields for Validate when the
 * UI config's claim "validate" action lists none. A non-empty config list wins.
 */
export const withClaimValidateMandatoryFields = (
  mandatoryFields: Record<string, ActionMandatoryFields> | null,
): Record<string, ActionMandatoryFields> => {
  const configured = mandatoryFields?.[CLAIM_VALIDATE_ACTION];
  if (configured?.fieldList?.length) return mandatoryFields ?? {};
  return {
    ...mandatoryFields,
    [CLAIM_VALIDATE_ACTION]: { ...configured, fieldList: CLAIM_VALIDATE_MANDATORY_FIELDS },
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
