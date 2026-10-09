---
name: price-calculation
description: "Price chain the backend recalculate / validate values satisfy (no client calculator)."
---

# Price Calculation Reference

Backend recalculate / validate responses are authoritative. The client has no price calculator (`utils/priceCalculator.ts` was removed); use this chain only to check server values.

## Modes (`discountBase`)

- `GROSS_PRICE`: `suggestedNet = net = qty*unitPrice` -> `tax = net*tax%` -> `gross = net + tax` -> `discount = gross*disc%` -> `total = gross - discount`.
- `NET_PRICE`: `suggestedNet = qty*unitPrice` -> `discount = suggestedNet*disc%` -> `net = suggestedNet - discount` -> `tax = net*tax%` -> `gross = total = net + tax`.

## Rules

- Clamp: negative inputs -> 0; `taxPercent` 0..100; back-calculated negative discount -> 0 and amount reset to base.
- GROSS: edited `total` > `gross` -> clamped to `gross`. NET: edited `net` > `suggestedNet` -> clamped.
- Summary discount: GROSS `(grossSum - totalSum)/grossSum*100`; NET `(suggestedSum - netSum)/suggestedSum*100`; base <= 0 -> 0.
- Stale row: `qty*unitPrice` (2 decimals) `!== suggestedNetPrice` with qty & unitPrice > 0 -> the fix is a backend recalculation, not a stored local value.
