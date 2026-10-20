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

/**
 * The form mapper keeps the old value when the API sends null. For a material's id and prices
 * null is the server's answer (new line after a part number change, price not available), so it
 * becomes "" here. Otherwise the row keeps the previous part's id and prices, shows them, and
 * validate-and-save sends that stale line id again.
 */
export const clearNullMaterialValues = (job: JobOverviewItem): JobOverviewItem => {
  const materials = job.diagnostic?.materials;
  if (!job.diagnostic || !Array.isArray(materials)) return job;

  const clearedMaterials = materials.map((material) => {
    if (!material) return material;
    const price = (material.price ?? {}) as Record<string, unknown>;
    const clearedPrice: Record<string, unknown> = { ...price };
    MATERIAL_PRICE_KEYS.forEach((key) => {
      clearedPrice[key] = price[key] ?? "";
    });
    return { ...material, id: material.id ?? "", price: clearedPrice };
  });

  return {
    ...job,
    diagnostic: { ...job.diagnostic, materials: clearedMaterials } as JobDiagnostic,
  };
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
