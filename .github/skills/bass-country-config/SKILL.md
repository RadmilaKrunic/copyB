---
name: bass-country-config
description: "CountryConfig consumption: diagnostics rules, allowed positions, quantity sources, discountBase."
---

# Country Config

## Query Model

- Fetch: `getCountryConfig(cc)` -> `GET /v1/countries/{cc}/country-configuration` (`api/services/countryConfiguration`).
- Cache key `["countryConfiguration", countryCode]`, loaded at App level. Read synchronously: `queryClient.getQueryData<CountryConfig>(["countryConfiguration", user.countryCode])`, user from `["user"]`.

## Shape (`diagnosticsConfiguration`)

- `discountBase?: "GROSS_PRICE" | "NET_PRICE"` — managers default `NET_PRICE` when absent.
- `addSpecialMaterialsAllowed: boolean`.
- `rules[]: { actionType, jobType, rule: { automaticRows: string[], allowedPositions: AllowedPosition[] } }`.
- `AllowedPosition: { position, minCount, maxCount, unitPriceSource, quantity: { quantitySource: DEFAULT | FAULT_CODES | USER, defaultQuantity } }`.

## Rules

- Match rule by exact `actionType` + `jobType`. No match -> no positions, no automatic rows.
- `automaticRows` auto-created on rule match; automatic rows show no delete icon.
- `maxCount` gates add-row, position change (`applyPositionRules`) and `enableProductDetails` (SP).
- Quantity: `resolveQuantityForPosition` (`useDiagnosticsManager.ts`). `FAULT_CODES`: LA uses fault-code labour qty, else `faultCode` `"X:n"` suffix, else default.
- Fault code select updates LA quantity only when LA `quantitySource === FAULT_CODES` (`handleFaultCodeSelection`).
- Position permissions: job FR -> `CAN_VIEW_FREIGHT_ITEMS` / `CAN_INSERT_AND_DELETE_FREIGHT_ITEMS`; claim PN -> `CAN_VIEW_NET_DEALER_PRICE`.
- Protected positions `LA`, `FR`, `PC`; material positions `SP`, `PN`, `AC`.
- Other fields used: `currency`, `currencySymbol`, separators, `dateFormat`, `taxRates`, `localizationConfiguration`, `links`, `reimbursementConfig`, `reimbursementCreateOn`, `reimbursementPeriodType`.
