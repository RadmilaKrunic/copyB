import { describe, it, expect } from "vitest";
import {
  getPriceFieldEditability,
  getRangedTotalAmountEditability,
  hasPriceLimit,
  isProtectedPosition,
  isSummaryControlledRow,
  isTotalAmountInRange,
  isTotalEntryPosition,
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

    it("COMMERCIAL_GOODWILL on LA: nothing editable", () => {
      const result = getPriceFieldEditability("LA", "COMMERCIAL_GOODWILL", "GROSS_PRICE");
      expect(result).toEqual({ discount: false, totalAmount: false, netAmount: false });
    });

    it.each(["WARRANTY", "SERVICE_OFFERING", "SPECIAL_CONTRACT", ""])(
      "%s on LA: nothing editable",
      (jobType) => {
        const result = getPriceFieldEditability("LA", jobType, "GROSS_PRICE");
        expect(result).toEqual({ discount: false, totalAmount: false, netAmount: false });
      },
    );

    it.each([
      ["FR", "COMMERCIAL_GOODWILL", "GROSS_PRICE"],
      ["FR", "WARRANTY", "NET_PRICE"],
      ["PC", "SERVICE_OFFERING", "GROSS_PRICE"],
      ["PC", "", "NET_PRICE"],
    ] as const)(
      "%s %s (%s): only totalAmount editable, whatever the discount base",
      (position, jobType, base) => {
        const result = getPriceFieldEditability(position, jobType, base);
        expect(result).toEqual({ discount: false, totalAmount: true, netAmount: false });
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

describe("isTotalEntryPosition", () => {
  it.each(["FR", "PC", "fr"])("returns true for %s", (position) => {
    expect(isTotalEntryPosition(position)).toBe(true);
  });

  it.each(["LA", "SP", "PN", "AC", ""])("returns false for %s", (position) => {
    expect(isTotalEntryPosition(position)).toBe(false);
  });
});

describe("total amount range helpers", () => {
  it("treats different limits and 0 / 0 as a ranged total amount", () => {
    expect(isTotalAmountInRange({ lowestLimit: 0, highestLimit: 500 })).toBe(true);
    expect(isTotalAmountInRange({ lowestLimit: 0, highestLimit: 0 })).toBe(true);
    expect(isTotalAmountInRange({ lowestLimit: 467.96, highestLimit: 467.96 })).toBe(false);
    expect(isTotalAmountInRange(undefined)).toBe(false);
  });

  it("checks limits only when they differ", () => {
    expect(hasPriceLimit({ lowestLimit: 0, highestLimit: 500 })).toBe(true);
    expect(hasPriceLimit({ lowestLimit: 0, highestLimit: 0 })).toBe(false);
    expect(hasPriceLimit(undefined)).toBe(false);
  });
});

describe("getRangedTotalAmountEditability", () => {
  const chargeableGross = { discount: true, totalAmount: true, netAmount: false };
  const chargeableNet = { discount: true, totalAmount: false, netAmount: true };
  const otherType = { discount: false, totalAmount: true, netAmount: false };

  it("locks every price field before the row is saved", () => {
    expect(getRangedTotalAmountEditability(false, false, chargeableGross)).toEqual({
      discount: false,
      totalAmount: false,
      netAmount: false,
    });
  });

  it("enables only the totalAmount until it is validated", () => {
    expect(getRangedTotalAmountEditability(true, false, chargeableNet)).toEqual({
      discount: false,
      totalAmount: true,
      netAmount: false,
    });
  });

  it("adds the row's usual fields once the total amount is validated", () => {
    expect(getRangedTotalAmountEditability(true, true, chargeableGross)).toEqual(chargeableGross);
    expect(getRangedTotalAmountEditability(true, true, chargeableNet)).toEqual({
      discount: true,
      totalAmount: true,
      netAmount: true,
    });
    expect(getRangedTotalAmountEditability(true, true, otherType)).toEqual(otherType);
  });
});
