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
  /** The totalAmount field. */
  totalAmount: boolean;
  /** The netAmount field. */
  netAmount: boolean;
}

const NOT_EDITABLE: PriceFieldEditability = {
  discount: false,
  totalAmount: false,
  netAmount: false,
};

/** Positions whose unit price and quantity are never edited on the row; the user edits the total. */
const TOTAL_ENTRY_POSITIONS = new Set(["FR", "PC"]);

/** True for FR / PC rows: unit price and quantity are always disabled, the total is the input. */
export const isTotalEntryPosition = (position: string): boolean =>
  TOTAL_ENTRY_POSITIONS.has((position ?? "").toUpperCase());

/** CHARGEABLE: discount plus the total of the discount base (totalAmount GROSS, netAmount NET). */
const getChargeableEditability = (discountBase: discountBase): PriceFieldEditability => ({
  discount: true,
  totalAmount: discountBase !== "NET_PRICE",
  netAmount: discountBase === "NET_PRICE",
});

/** FR / PC rows of any other type: only the totalAmount, whatever the discount base. */
const TOTAL_AMOUNT_ONLY: PriceFieldEditability = {
  discount: false,
  totalAmount: true,
  netAmount: false,
};

/**
 * Row price fields the user may edit:
 * - CHARGEABLE LA / FR / PC: discount + totalAmount (GROSS_PRICE) or netAmount (NET_PRICE).
 * - FR / PC of any other type: totalAmount only, in both discount bases.
 * - Everything else: nothing.
 */
export function getPriceFieldEditability(
  position: string,
  jobType: string,
  discountBase: discountBase,
): PriceFieldEditability {
  if (!isProtectedPosition(position)) return NOT_EDITABLE;
  if ((jobType ?? "").toUpperCase() === "CHARGEABLE") return getChargeableEditability(discountBase);
  return isTotalEntryPosition(position) ? TOTAL_AMOUNT_ONLY : NOT_EDITABLE;
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

/** Allowed total amount of an FR / PC row, from the default-parameter API. */
export interface PriceLimits {
  lowestLimit: number;
  highestLimit: number;
}

/**
 * True when the row's total amount is entered by the user within a range instead of being a
 * fixed default. Different limits are a range; 0 / 0 means "no limit". Equal non-zero limits are
 * a fixed default price, so the row keeps the usual price behaviour.
 */
export const isTotalAmountInRange = (limits: PriceLimits | undefined): boolean => {
  if (!limits) return false;
  return limits.lowestLimit !== limits.highestLimit || limits.highestLimit === 0;
};

/** True when the limits must be checked (different limits; 0 / 0 has no limit). */
export const hasPriceLimit = (limits: PriceLimits | undefined): limits is PriceLimits =>
  !!limits && limits.lowestLimit !== limits.highestLimit;

/**
 * Price fields of an FR / PC row whose total amount the user enters within a range. They unlock
 * in steps:
 * 1. Row not saved yet (no materialId): every price field disabled.
 * 2. Saved, no validated total amount yet: only the totalAmount is editable.
 * 3. Total amount validated (saved non-zero): the totalAmount stays editable, and the fields of
 *    the row's usual rules (`baseEditability`, e.g. the CHARGEABLE discount) unlock too.
 */
export function getRangedTotalAmountEditability(
  hasMaterialId: boolean,
  hasValidatedTotalAmount: boolean,
  baseEditability: PriceFieldEditability,
): PriceFieldEditability {
  if (!hasMaterialId) return NOT_EDITABLE;
  if (!hasValidatedTotalAmount) return TOTAL_AMOUNT_ONLY;
  return { ...baseEditability, totalAmount: true };
}
