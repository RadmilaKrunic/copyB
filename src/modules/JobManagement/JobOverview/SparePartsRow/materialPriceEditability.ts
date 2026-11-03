import type { discountBase } from "api/services/countryConfiguration/countryConfiguration";

/**
 * Positions with backend-driven / protected pricing rules: Labour, Freight, Protected-config.
 * These are auto-created rows per the matched diagnostic rule, distinct from user-added
 * material positions (PN spare-tool, SP spare-part, AC accessory).
 */
const PROTECTED_POSITIONS = new Set(["LA", "FR", "PC"]);

export const isProtectedPosition = (position: string): boolean =>
  PROTECTED_POSITIONS.has((position ?? "").toUpperCase());

export interface PriceFieldEditability {
  /** The discount field (visible one depends on mode — `discount` in GROSS, `discountNet` in NET). */
  discount: boolean;
  /** The totalAmount field — only ever editable in GROSS_PRICE mode. */
  totalAmount: boolean;
  /** The netAmount field — only ever editable in NET_PRICE mode. */
  netAmount: boolean;
}

const NOT_EDITABLE: PriceFieldEditability = {
  discount: false,
  totalAmount: false,
  netAmount: false,
};

export function getPriceFieldEditability(
  position: string,
  jobType: string,
  discountBase: discountBase,
): PriceFieldEditability {
  const normalizedJobType = (jobType ?? "").toUpperCase();
  const isProtected = isProtectedPosition(position);

  const isEditableJobType = normalizedJobType === "CHARGEABLE" && isProtected;

  if (!isEditableJobType) return NOT_EDITABLE;

  return {
    discount: true,
    totalAmount: discountBase !== "NET_PRICE",
    netAmount: discountBase === "NET_PRICE",
  };
}

/**
 * True when this row's discount is controlled from the summary panel rather than
 * editable on the row itself — i.e. a material-position row with jobType CHARGEABLE.
 * Used to decide whether to show a "controlled by summary" affordance / disabled state
 * with a different visual treatment than "not editable for this jobType at all".
 */
export function isSummaryControlledRow(position: string, jobType: string): boolean {
  const normalizedJobType = (jobType ?? "").toUpperCase();
  return !isProtectedPosition(position) && normalizedJobType === "CHARGEABLE";
}

/** Allowed unit price of a protected row, from the default-parameter API. */
export interface UnitPriceLimits {
  lowestLimit: number;
  highestLimit: number;
}

/**
 * True when the row's unit price is entered by the user instead of being a fixed default.
 * Different limits are a range; 0 / 0 (chargeable) means "no limit". Equal non-zero limits
 * are a fixed default price, so the row keeps the usual price behaviour.
 */
export const isUnitPriceEnteredByUser = (limits: UnitPriceLimits | undefined): boolean => {
  if (!limits) return false;
  return limits.lowestLimit !== limits.highestLimit || limits.highestLimit === 0;
};

/** True when the limits must be checked (different limits; 0 / 0 has no limit). */
export const hasUnitPriceLimit = (limits: UnitPriceLimits | undefined): limits is UnitPriceLimits =>
  !!limits && limits.lowestLimit !== limits.highestLimit;

export interface UserUnitPriceEditability {
  unitPrice: boolean;
  prices: PriceFieldEditability;
}

/**
 * Price fields of a row whose unit price the user enters (FR / PC with a price range).
 * They unlock in steps:
 * 1. Row not saved yet (no materialId): every price field disabled.
 * 2. Saved, no validated unit price yet: only the unit price is editable.
 * 3. Unit price validated (saved non-zero): unit price stays editable, and the discount and the
 *    total (totalAmount in GROSS_PRICE, netAmount in NET_PRICE) are editable too.
 */
export function getUserUnitPriceEditability(
  hasMaterialId: boolean,
  hasValidatedUnitPrice: boolean,
  discountBase: discountBase,
): UserUnitPriceEditability {
  if (!hasMaterialId) return { unitPrice: false, prices: NOT_EDITABLE };
  if (!hasValidatedUnitPrice) return { unitPrice: true, prices: NOT_EDITABLE };
  return {
    unitPrice: true,
    prices: {
      discount: true,
      totalAmount: discountBase !== "NET_PRICE",
      netAmount: discountBase === "NET_PRICE",
    },
  };
}
