/** Body of POST /v1/job/prices/default-parameter. */
export interface DefaultParameterRequest {
  priceLevel?: string;
  countryCode: string;
  ascId: string;
  jobId: string;
  actionType: string;
  jobType: string;
  faultCode: string;
  faultCodeLabourQuantity: number;
  /** Required by the backend when actionType is not REPAIR; omitted for REPAIR. */
  exchangeReason?: string;
}

/** Allowed unit price of a position (FR, PC). Equal limits = fixed default price. */
export interface UnitPriceRange {
  lowestLimit: number | null;
  highestLimit: number | null;
}

export interface DefaultParameterByPosition {
  position: string;
  value: number | null;
  serviceUnits: number | null;
  unitPriceRange?: UnitPriceRange | null;
}

export interface DefaultParameterResponse {
  byPosition: DefaultParameterByPosition[];
}

/** Default quantity per position (e.g. { LA: 5, FR: 1 }). */
export type DefaultQuantities = Partial<Record<string, number>>;

/** Unit price range per position with both limits set (e.g. { FR: { lowestLimit: 0, highestLimit: 500 } }). */
export type DefaultUnitPriceRanges = Partial<Record<string, ResolvedUnitPriceRange>>;

export interface ResolvedUnitPriceRange {
  lowestLimit: number;
  highestLimit: number;
}

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
