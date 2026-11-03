import { describe, it, expect } from "vitest";
import {
  getPriceFieldEditability,
  getUserUnitPriceEditability,
  hasUnitPriceLimit,
  isProtectedPosition,
  isSummaryControlledRow,
  isUnitPriceEnteredByUser,
} from "./materialPriceEditability";

describe("isProtectedPosition", () => {
  it.each(["LA", "FR", "PC"])("returns true for protected position %s", (position) => {
    expect(isProtectedPosition(position)).toBe(true);
  });

  it.each(["PN", "SP", "AC"])("returns false for material position %s", (position) => {
    expect(isProtectedPosition(position)).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isProtectedPosition("la")).toBe(true);
    expect(isProtectedPosition("pn")).toBe(false);
  });

  it("returns false for empty/undefined", () => {
    expect(isProtectedPosition("")).toBe(false);
    expect(isProtectedPosition(undefined as unknown as string)).toBe(false);
  });
});

describe("getPriceFieldEditability", () => {
  describe("protected positions (LA / FR / PC)", () => {
    it.each(["LA", "FR", "PC"])(
      "CHARGEABLE on %s: discount + totalAmount editable in GROSS_PRICE",
      (position) => {
        const result = getPriceFieldEditability(position, "CHARGEABLE", "GROSS_PRICE");
        expect(result).toEqual({ discount: true, totalAmount: true, netAmount: false });
      },
    );

    it.each(["LA", "FR", "PC"])(
      "CHARGEABLE on %s: discount + netAmount editable in NET_PRICE",
      (position) => {
        const result = getPriceFieldEditability(position, "CHARGEABLE", "NET_PRICE");
        expect(result).toEqual({ discount: true, totalAmount: false, netAmount: true });
      },
    );

    it.each(["LA", "FR", "PC"])("COMMERCIAL_GOODWILL on %s: nothing editable", (position) => {
      const result = getPriceFieldEditability(position, "COMMERCIAL_GOODWILL", "GROSS_PRICE");
      expect(result).toEqual({ discount: false, totalAmount: false, netAmount: false });
    });

    it.each(["WARRANTY", "SERVICE_OFFERING", "SPECIAL_CONTRACT", ""])(
      "%s on a protected position: nothing editable",
      (jobType) => {
        const result = getPriceFieldEditability("LA", jobType, "GROSS_PRICE");
        expect(result).toEqual({ discount: false, totalAmount: false, netAmount: false });
      },
    );
  });

  describe("material positions (PN / SP / AC)", () => {
    it.each(["PN", "SP", "AC"])("COMMERCIAL_GOODWILL on %s: nothing editable", (position) => {
      const result = getPriceFieldEditability(position, "COMMERCIAL_GOODWILL", "GROSS_PRICE");
      expect(result).toEqual({ discount: false, totalAmount: false, netAmount: false });
    });

    // The key rule this module exists to make explicit and testable: CHARGEABLE material
    // rows are NOT row-editable, regardless of mode — the summary panel owns the discount
    // for these and propagates it down via the backend recalculation.
    it.each(["PN", "SP", "AC"])(
      "CHARGEABLE on %s: nothing row-editable in GROSS_PRICE (summary-controlled instead)",
      (position) => {
        const result = getPriceFieldEditability(position, "CHARGEABLE", "GROSS_PRICE");
        expect(result).toEqual({ discount: false, totalAmount: false, netAmount: false });
      },
    );

    it.each(["PN", "SP", "AC"])(
      "CHARGEABLE on %s: nothing row-editable in NET_PRICE (summary-controlled instead)",
      (position) => {
        const result = getPriceFieldEditability(position, "CHARGEABLE", "NET_PRICE");
        expect(result).toEqual({ discount: false, totalAmount: false, netAmount: false });
      },
    );

    it.each(["WARRANTY", "SERVICE_OFFERING", "SPECIAL_CONTRACT", ""])(
      "%s on a material position: nothing editable",
      (jobType) => {
        const result = getPriceFieldEditability("SP", jobType, "GROSS_PRICE");
        expect(result).toEqual({ discount: false, totalAmount: false, netAmount: false });
      },
    );
  });

  it("is case-insensitive on jobType", () => {
    const result = getPriceFieldEditability("LA", "chargeable", "GROSS_PRICE");
    expect(result.discount).toBe(true);
  });

  it("treats an unknown position as a material (non-protected) position", () => {
    const result = getPriceFieldEditability("ZZ", "CHARGEABLE", "GROSS_PRICE");
    expect(result).toEqual({ discount: false, totalAmount: false, netAmount: false });
  });
});

describe("isSummaryControlledRow", () => {
  it.each(["PN", "SP", "AC"])("returns true for CHARGEABLE on material position %s", (position) => {
    expect(isSummaryControlledRow(position, "CHARGEABLE")).toBe(true);
  });

  it.each(["PN", "SP", "AC"])(
    "returns false for COMMERCIAL_GOODWILL on material position %s",
    (position) => {
      expect(isSummaryControlledRow(position, "COMMERCIAL_GOODWILL")).toBe(false);
    },
  );

  it.each(["LA", "FR", "PC"])(
    "returns false for CHARGEABLE on protected position %s (row itself is editable there)",
    (position) => {
      expect(isSummaryControlledRow(position, "CHARGEABLE")).toBe(false);
    },
  );
});

describe("unit price range helpers", () => {
  it("treats different limits and 0 / 0 as a user-entered unit price", () => {
    expect(isUnitPriceEnteredByUser({ lowestLimit: 0, highestLimit: 500 })).toBe(true);
    expect(isUnitPriceEnteredByUser({ lowestLimit: 0, highestLimit: 0 })).toBe(true);
    expect(isUnitPriceEnteredByUser({ lowestLimit: 467.96, highestLimit: 467.96 })).toBe(false);
    expect(isUnitPriceEnteredByUser(undefined)).toBe(false);
  });

  it("checks limits only when they differ", () => {
    expect(hasUnitPriceLimit({ lowestLimit: 0, highestLimit: 500 })).toBe(true);
    expect(hasUnitPriceLimit({ lowestLimit: 0, highestLimit: 0 })).toBe(false);
    expect(hasUnitPriceLimit(undefined)).toBe(false);
  });
});

describe("getUserUnitPriceEditability", () => {
  const chargeable = getPriceFieldEditability("FR", "CHARGEABLE", "GROSS_PRICE");
  const warranty = getPriceFieldEditability("FR", "WARRANTY", "GROSS_PRICE");

  it("locks every price field before the row is saved", () => {
    expect(getUserUnitPriceEditability(false, false, chargeable, "GROSS_PRICE")).toEqual({
      unitPrice: false,
      prices: { discount: false, totalAmount: false, netAmount: false },
    });
  });

  it("enables only the unit price until it is validated", () => {
    expect(getUserUnitPriceEditability(true, false, chargeable, "GROSS_PRICE")).toEqual({
      unitPrice: true,
      prices: { discount: false, totalAmount: false, netAmount: false },
    });
  });

  it("enables the total of the pricing mode once the unit price is validated", () => {
    expect(getUserUnitPriceEditability(true, true, warranty, "GROSS_PRICE")).toEqual({
      unitPrice: true,
      prices: { discount: false, totalAmount: true, netAmount: false },
    });
    expect(getUserUnitPriceEditability(true, true, warranty, "NET_PRICE")).toEqual({
      unitPrice: true,
      prices: { discount: false, totalAmount: false, netAmount: true },
    });
  });

  it("keeps the usual discount rule once the unit price is validated", () => {
    expect(getUserUnitPriceEditability(true, true, chargeable, "GROSS_PRICE").prices.discount).toBe(
      true,
    );
  });
});
