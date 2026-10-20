import Section from "components/generics/Section/GenericSection.types";
import Field, { WarrantyInfoPayload } from "components/generics/Field/GenericField.types";
import { WarrantyCheckRequest, WarrantyCheckResponse } from "api/services/orders/orders.types";
import { type ValidateAndSaveResponse } from "api/services/jobs/action";
import { JobDiagnostic } from "../JobList/JobList.types";
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
