import Section from "components/generics/Section/GenericSection.types";
import Field, { WarrantyInfoPayload } from "components/generics/Field/GenericField.types";
import { WarrantyCheckRequest, WarrantyCheckResponse } from "api/services/orders/orders.types";
import { type ValidateAndSaveResponse } from "api/services/jobs/action";
import { JobDiagnostic, JobOverviewItem } from "../JobList/JobList.types";
import {
  buildWarrantyCheckPayloadFromFieldNames,
  updateWarrantyFields,
} from "../CreateJob/CreateJob.warranty.utils";

export const buildJobOverviewWarrantyCheckPayload = (
  values: Record<string, unknown>,
  countryCode?: string,
): WarrantyCheckRequest | null => {
  return buildWarrantyCheckPayloadFromFieldNames(
    values,
    {
      brandFieldName: "brand",
      bareToolNumberFieldName: "baretoolNumber",
      serialNumberFieldName: "serialNumber",
      purchaseDateFieldName: "purchaseDate",
    },
    countryCode,
  );
};

export const updateJobOverviewWarrantyTabs = (
  tabs: Section[],
  response: WarrantyCheckResponse,
  warrantyInfoPayload: WarrantyInfoPayload | null,
): Section[] => {
  return tabs.map((tab) => {
    if (tab.name !== "assetData") return tab;

    return {
      ...tab,
      areas: tab.areas.map((area) => {
        if (area.name === "customerWish") {
          return {
            ...area,
            fields: updateWarrantyFields(area.fields, response, warrantyInfoPayload) ?? area.fields,
          };
        }

        if (area.name !== "warrantyDetails") {
          return area;
        }

        return {
          ...area,
          fields: updateWarrantyFields(area.fields, response, warrantyInfoPayload) ?? area.fields,
        };
      }),
    };
  });
};

export const extractDiagnosticFromValidateResponse = (
  data: ValidateAndSaveResponse,
  jobId?: string,
): JobDiagnostic | undefined => {
  if ((data as any).diagnostic) return (data as any).diagnostic;

  const hasTopLevelDiagnosticData =
    Array.isArray((data as any).materials) ||
    Array.isArray((data as any).archivedMaterials) ||
    !!(data as any).priceSummary ||
    !!(data as any).priceSummaryDetailed ||
    typeof (data as any).actionType === "string" ||
    typeof (data as any).jobType === "string";

  if (!hasTopLevelDiagnosticData || !jobId) return undefined;
  const responce = { ...(data as any), jobId } as JobDiagnostic;
  return responce;
};

const MATERIAL_PRICE_KEYS = [
  "unitPrice",
  "suggestedNetPrice",
  "netAmount",
  "tax",
  "taxAmount",
  "grossAmount",
  "discount",
  "discountAmount",
  "totalAmount",
] as const;

const SUMMARY_PRICE_KEYS = [
  "suggestedNetPrice",
  "netAmount",
  "taxAmount",
  "grossAmount",
  "discount",
  "discountAmount",
  "totalAmount",
] as const;

const zeroPrices = (keys: readonly string[], price: Record<string, unknown> = {}) => {
  const zeroed: Record<string, unknown> = { ...price };
  keys.forEach((key) => {
    zeroed[key] = price[key] ?? 0;
  });
  return zeroed;
};

/**
 * The form mapper keeps the old value when the API sends null. A null material id means a new
 * line (part number changed) and becomes "". Null prices (price not available, failed
 * validation) become 0, and a null priceSummaryDetailed zeroes the summary total. Otherwise the
 * rows and summary keep the previous part's values and validate-and-save sends them again.
 */
export const clearNullMaterialValues = (job: JobOverviewItem): JobOverviewItem => {
  const diagnostic = job.diagnostic;
  const materials = diagnostic?.materials;
  if (!diagnostic || !Array.isArray(materials)) return job;

  const clearedMaterials = materials.map((material) => {
    if (!material) return material;
    const price = (material.price ?? {}) as Record<string, unknown>;
    return { ...material, id: material.id ?? "", price: zeroPrices(MATERIAL_PRICE_KEYS, price) };
  });

  const cleared = { ...diagnostic, materials: clearedMaterials } as JobDiagnostic;
  if (diagnostic.priceSummaryDetailed === null) {
    (cleared as unknown as Record<string, unknown>).priceSummaryDetailed = {
      total: zeroPrices(SUMMARY_PRICE_KEYS),
      byJobType: [],
    };
  }
  return { ...job, diagnostic: cleared };
};

/**
 * False when the server returned `priceSummaryDetailed: null` (failed validation, nothing
 * validated yet): the summary stays hidden until a validation succeeds.
 */
export const hasPriceSummary = (diagnostic?: JobDiagnostic): boolean =>
  (diagnostic as { priceSummaryDetailed?: unknown } | undefined)?.priceSummaryDetailed !== null;

const hasNonZeroPrice = (price: unknown): boolean => {
  if (!price || typeof price !== "object") return false;
  const p = price as Record<string, unknown>;
  return ["unitPrice", "netAmount", "grossAmount", "totalAmount"].some(
    (key) => Number(p[key]) !== 0 && Number.isFinite(Number(p[key])),
  );
};

/**
 * True when the latest server response has a material with a price. Read from the response,
 * not from the manager's materials[]: that list syncs from the API only once, so after a failed
 * first validation (null prices) it would keep zeros and hide the summary for good.
 * Undefined when the response has no materials (caller falls back to its own rows).
 */
export const hasServerMaterialPrices = (diagnostic?: JobDiagnostic): boolean | undefined => {
  const materials = diagnostic?.materials;
  if (!Array.isArray(materials) || materials.length === 0) return undefined;
  return materials.some((m) => hasNonZeroPrice(m?.price));
};

/** Root of the diagnostic payload in `mapValuesToAPI` output; recalculation sends only this part. */
const DIAGNOSTIC_PAYLOAD_ROOT = "diagnostic";

/**
 * Keeps the validation errors of every field that goes into the recalculate payload
 * (`attributeMapping` under `diagnostic.`): all spare-part rows plus diagnostic header fields.
 */
export const getRecalculationPayloadErrors = (
  allFields: Field[],
  formErrors: Record<string, string>,
): Record<string, string> => {
  const payloadErrors: Record<string, string> = {};
  allFields.forEach((f) => {
    if (f.fieldMapping?.parentMap?.[0] === DIAGNOSTIC_PAYLOAD_ROOT && formErrors[f.name]) {
      payloadErrors[f.name] = formErrors[f.name];
    }
  });
  return payloadErrors;
};

/** Recalculation skips empty values only; `0` is a valid quantity, price or discount. */
export const isRecalculationValueEmpty = (value: unknown): boolean =>
  value === null || value === undefined || value === "";

/** Change types sent by the price summary row (lineId ""); see `onRecalculatePrices` typeMap. */
const SUMMARY_CHANGE_TYPES = new Set(["summaryNetAmount", "summaryTotalAmount", "summaryDiscount"]);

const isSummaryChange = (change: Record<string, unknown>): boolean => {
  const type = typeof change.type === "string" ? change.type : "";
  return SUMMARY_CHANGE_TYPES.has(type) || type.endsWith("Material");
};

/** Row changes collide on line + field; all summary changes share one slot (discount vs amount). */
const getRecalculationChangeKey = (change: Record<string, unknown>): string => {
  if (isSummaryChange(change)) return "summary";
  const lineId = typeof change.lineId === "string" ? change.lineId : "";
  const type = typeof change.type === "string" ? change.type : "";
  return `${lineId}|${type}`;
};

/**
 * Adds recalculation changes to the list sent with validate-and-save. A change replaces any
 * earlier one with the same key, so only the last edit of a row field, and only the last
 * summary edit (discount or amount), is sent.
 */
export const mergeRecalculationChanges = (
  previous: Record<string, unknown>[],
  next: Record<string, unknown>[],
): Record<string, unknown>[] =>
  next.reduce<Record<string, unknown>[]>((acc, change) => {
    const key = getRecalculationChangeKey(change);
    return [...acc.filter((c) => getRecalculationChangeKey(c) !== key), change];
  }, previous);
