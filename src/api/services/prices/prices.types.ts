/** Body of POST /v1/job/prices/default-parameter. */
export interface DefaultParameterRequest {
  priceLevel?: string;
  countryCode: string;
  ascId?: string;
  jobId: string;
  actionType: string;
  jobType: string;
  faultCode?: string;
  faultCodeLabourQuantity?: number;
  /** Required by the backend when actionType is not REPAIR; omitted for REPAIR. */
  exchangeReason?: string;
}

export interface DefaultParameterByPosition {
  position: string;
  value: number | null;
  serviceUnits: number | null;
}

export interface DefaultParameterResponse {
  byPosition: DefaultParameterByPosition[];
}

/** Default quantity per position (e.g. { LA: 5, FR: 1 }). */
export type DefaultQuantities = Partial<Record<string, number>>;

/** Job or claim values the default-parameter request is built from. */
export interface DefaultParameterSource {
  priceLevel?: unknown;
  countryCode?: unknown;
  ascId?: unknown;
  jobId?: unknown;
  actionType?: unknown;
  jobType?: unknown;
  faultCode?: unknown;
  faultCodeLabourQuantity?: unknown;
  exchangeReason?: unknown;
}

/**
 * Resolves the backend default quantities for the current form values.
 * Resolves null when the request cannot be built or the call fails, so callers
 * fall back to the country-config quantity.
 */
export type ResolveDefaultQuantities = (
  formValues: Record<string, unknown>,
) => Promise<DefaultQuantities | null>;
