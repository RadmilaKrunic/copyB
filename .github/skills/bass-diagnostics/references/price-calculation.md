---
name: price-calculation
description: "Reference for src/utils/priceCalculator.ts (client display math; backend is authoritative)."
---

# Price Calculation Reference

Backend recalculate / validate responses are authoritative. Use these helpers for display and tests; never inline formulas.

## Modes (`discountBase`)

- `GROSS_PRICE`: `suggestedNet = net = qty*unitPrice` -> `tax = net*tax%` -> `gross = net + tax` -> `discount = gross*disc%` -> `total = gross - discount`.
- `NET_PRICE`: `suggestedNet = qty*unitPrice` -> `discount = suggestedNet*disc%` -> `net = suggestedNet - discount` -> `tax = net*tax%` -> `gross = total = net + tax`.

## API

- `roundToTwo(n)`
- `calculatePrices(inputs, changedField, changedValue, mode = "GROSS_PRICE")`; `changedField`: quantity | unitPrice | netAmount | suggestedNetPrice | taxPercent | grossAmount | discountPercent | totalAmount.
- `resetRowPrices(qty, unitPrice, taxPercent = 0, mode)` — zero discount.
- `aggregateRowPrices(values, allFields, typeFilter?, mode, positionFilter?)` -> `{ suggestedNetPrice, netAmount, grossAmount, totalAmount, discount, taxAmount, discountAmount }` by `diagnostic*` subtypes.
- `SUMMARY_TYPE_FILTER`: totalSummary, warranty, specialContract, chargeable, commercialGoodwill, serviceOffering.
- `calculateSummaryTotalAmountDistribution(total, grossSum)`, `calculateSummaryNetAmountDistribution(net, suggestedSum)`, `calculateSummaryDiscountDistribution(disc%, suggestedSum, grossSum, mode)`.
- `distributeGrossToRows` / `distributeNetToRows` — `DISTRIBUTABLE_POSITIONS = SP, PN, AC`.

## Rules

- Clamp: negative inputs -> 0; `taxPercent` 0..100; back-calculated negative discount -> 0 and amount reset to base.
- GROSS: edited `total` > `gross` -> clamped to `gross`. NET: edited `net` > `suggestedNet` -> clamped.
- Summary discount: GROSS `(grossSum - totalSum)/grossSum*100`; NET `(suggestedSum - netSum)/suggestedSum*100`; base <= 0 -> 0.
- Stale row: `roundToTwo(qty*unitPrice) !== suggestedNetPrice` with qty & unitPrice > 0 -> flag only; the fix is a backend recalculation, not a stored local value.
