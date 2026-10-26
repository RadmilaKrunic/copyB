import {
  DefaultParameterRequest,
  DefaultParameterResponse,
  DefaultParameterSource,
  DefaultQuantities,
} from "./prices.types";

const toText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

const toNonNegativeNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const toPositiveNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

/**
 * Builds the default-parameter request, or null while a required value is still missing
 * (e.g. no fault code selected yet), so no request is sent that the backend rejects.
 * Required: countryCode, ascId, jobId, actionType, jobType, faultCode, faultCodeLabourQuantity,
 * and exchangeReason when actionType is not REPAIR (it is sent only then).
 */
export const buildDefaultParameterRequest = (
  source: DefaultParameterSource,
): DefaultParameterRequest | null => {
  const countryCode = toText(source.countryCode);
  const jobId = toText(source.jobId);
  const actionType = toText(source.actionType);
  const jobType = toText(source.jobType);
  const ascId = toText(source.ascId);
  const faultCode = toText(source.faultCode);
  const faultCodeLabourQuantity = toNonNegativeNumber(source.faultCodeLabourQuantity);
  if (
    !countryCode ||
    !jobId ||
    !actionType ||
    !jobType ||
    !ascId ||
    !faultCode ||
    faultCodeLabourQuantity === undefined
  )
    return null;

  const request: DefaultParameterRequest = {
    countryCode,
    ascId,
    jobId,
    actionType,
    jobType,
    faultCode,
    faultCodeLabourQuantity,
  };
  const priceLevel = toText(source.priceLevel);
  if (priceLevel) request.priceLevel = priceLevel;

  if (actionType !== "REPAIR") {
    const exchangeReason = toText(source.exchangeReason);
    if (!exchangeReason) return null;
    request.exchangeReason = exchangeReason;
  }
  return request;
};

/**
 * Quantity per position from the response: serviceUnits when the backend sends it
 * (labour, e.g. LA), otherwise value. Entries without a usable number are skipped.
 */
export const toDefaultQuantities = (
  response: DefaultParameterResponse | null | undefined,
): DefaultQuantities => {
  const quantities: DefaultQuantities = {};
  for (const entry of response?.byPosition ?? []) {
    if (!entry?.position) continue;
    const quantity = toPositiveNumber(entry.serviceUnits) ?? toPositiveNumber(entry.value);
    if (quantity !== undefined) quantities[entry.position.toUpperCase()] = quantity;
  }
  return quantities;
};
