---
paths:
  - "src/utils/priceCalculator.ts"
  - "src/hooks/useDiagnosticsManager.ts"
---

# Price Calculator — BASS-Next

## Purpose

> **Backend is authoritative.** Final price calculation (recalculate + validate/save) happens server-side via `usePostRecalculatePrices` and `usePostValidateAndSave` (`api/services/jobs/hooks.ts`); responses include `priceSummaryDetailed` / `diagnostic` and are written to `queryClient.setQueryData(["diagnostic", jobId], ...)` through `extractDiagnosticFromValidateResponse`. The functions below are local helpers for client-side previews and stale-price detection only — never persist their output over a value returned by the backend.

Located in:

- **`src/utils/priceCalculator.ts`** — pure functions for preview calculation
- **`src/hooks/useDiagnosticsManager.ts`** — React hook consuming priceCalculator for UI previews/stale detection

## Key Calculations

From `src/utils/priceCalculator.ts`:

### Gross → Net (discount applied)

```typescript
export const calculateNetAmount = (gross: number, discount: number): number => {
  return gross - (gross * discount) / 100;
};
```

### Net → Gross (reverse discount)

```typescript
export const calculateGrossAmount = (net: number, discount: number): number => {
  return discount === 100 ? 0 : net / (1 - discount / 100);
};
```

### Line Item Total

```typescript
export const calculateLineTotal = (
  quantity: number,
  unitPrice: number,
  discount: number,
): number => {
  const gross = quantity * unitPrice;
  return calculateNetAmount(gross, discount);
};
```

## CountryConfig Rules

From `.github/skills/bass-country-config/SKILL.md` — discount base varies by country:

```typescript
interface CountryConfig {
  diagnosticsConfiguration: {
    rules: Array<{
      discountBase: "DEALER_PRICE" | "RETAIL_PRICE"; // Which price to discount from
      allowedPositions: string[]; // Position codes (e.g., ["001", "002"])
    }>;
  };
}
```

**Germany (`DE`)**: `discountBase: "DEALER_PRICE"` — discount applied to dealer price
**Other countries**: `discountBase: "RETAIL_PRICE"` — discount applied to retail price

## useDiagnosticsManager Hook

Manages diagnostics spare parts state and price calculations:

```typescript
import {
  calculateNetAmount,
  calculateGrossAmount,
  calculateLineTotal,
} from "utils/priceCalculator";
import { useQueryClient } from "@tanstack/react-query";

export const useDiagnosticsManager = (jobId: string) => {
  const queryClient = useQueryClient();
  const countryConfig = queryClient.getQueryData<CountryConfig>([
    "countryConfiguration",
    countryCode,
  ]);

  const handleDiscountChange = (rowIndex: number, newDiscount: number) => {
    const row = rows[rowIndex];
    const { quantity, unitPrice } = row;
    const netAmount = calculateLineTotal(quantity, unitPrice, newDiscount);

    updateRow(rowIndex, {
      discount: newDiscount,
      netAmount,
      grossAmount: quantity * unitPrice,
    });
  };

  const handleNetAmountChange = (rowIndex: number, newNet: number) => {
    const row = rows[rowIndex];
    const { quantity, unitPrice, discount } = row;
    const grossAmount = quantity * unitPrice;
    const calculatedDiscount = ((grossAmount - newNet) / grossAmount) * 100;

    updateRow(rowIndex, {
      netAmount: newNet,
      discount: calculatedDiscount,
    });
  };

  return { handleDiscountChange, handleNetAmountChange, rows };
};
```

## Summary Area Aggregation

`SummaryArea` component (custom area) aggregates totals from all spare part rows:

```typescript
const totalGross = rows.reduce((sum, row) => sum + row.grossAmount, 0);
const totalNet = rows.reduce((sum, row) => sum + row.netAmount, 0);
const totalDiscount = totalGross > 0 ? ((totalGross - totalNet) / totalGross) * 100 : 0;
```

## Critical Rules

- **Backend values win** — on `postRecalculatePrices`/`postValidateAndSave` success, render the returned `priceSummaryDetailed`/`diagnostic` values; do not overwrite them with local `priceCalculator` output.
- **Always use `priceCalculator` functions for local/preview math** — never inline discount math
- **Discount base depends on country** — check `countryConfig.diagnosticsConfiguration.rules[].discountBase`
- **Net/Gross are derived** — never store both independently, calculate one from the other
- **Precision**: `.toFixed(2)` for display, store as `number` in state
- **Discount is percentage** — 0-100, not 0-1
- **Stale detection, not recomputation** — if `roundToTwo(qty*unitPrice) != suggestedNetPrice`, trigger a recalculate API call rather than locally overwriting the price
