---
name: bass-diagnostics-material
description: >
  Add diagnostics spare part rows, manage position-based permissions, calculate prices, and handle discount logic.
  Use this skill when the user asks to work on spare parts, diagnostics materials, SparePartsRow, SummaryArea,
  price calculation, position permissions, or says 'add spare part', 'diagnostics material row'.
  Also triggers when working on useDiagnosticsManager, DiagnosticsContext, or price calculator.
---

# Diagnostics Material Management — BASS-Next

## Architecture

```
src/modules/JobManagement/JobOverview/
├── SparePartsArea/              ← Custom area: renders SparePartsRow components
│   └── SparePartsArea.tsx
├── SparePartsRow/               ← Row component for each material
│   ├── SparePartsRow.tsx
│   ├── SparePartsRow.shared.ts
│   ├── SparePartsRow.components.tsx
│   └── SparePartsRow.scss
├── SummaryArea/                 ← Custom area: aggregated totals
│   └── SummaryArea.tsx
└── DiagnosticsContext.tsx       ← Shared state for diagnostics tab

src/hooks/
└── useDiagnosticsManager.ts     ← State management + price calculations

src/utils/
└── priceCalculator.ts           ← Pure price calculation functions
```

## Quick Start

Diagnostics materials flow:

1. **SparePartsArea** renders rows from `diagnosticData.materials[]`
2. **SparePartsRow** handles per-row UI, permissions, price calculation
3. **useDiagnosticsManager** manages add/remove/update operations
4. **SummaryArea** aggregates totals from all rows
5. **CountryConfig** defines position limits and discount base

## Step-by-step

### 1. Position-Based Permissions

Each position code (SP, LA, FR, PN, PC) has distinct permissions:

```typescript
const POSITION_PERMISSIONS = {
  LA: {
    // Labour
    canView: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_LABOUR_ITEMS,
    canDelete: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_LABOUR_ITEMS,
    canEditUnits: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_LABOUR_UNITS,
    canEditUnitPrice: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_LABOUR_UNIT_PRICE,
    canEditDiscount: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_LABOUR,
    canEditTotal: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_ON_LABOUR,
  },
  SP: {
    // Spare Parts
    canView: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_SPARE_PARTS_ITEMS,
    canDelete: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS,
    canEditUnits: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_SPARE_PARTS_UNITS,
    canEditUnitPrice: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_SPARE_PARTS_UNIT_PRICE,
    canEditDiscount: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_SPARE_PARTS,
    canEditTotal: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_ON_SPARE_PARTS,
  },
  FR: {
    /* Freight */
  },
  PN: {
    /* Full Tools */
  },
  PC: {
    /* Packaging */
  },
} as const;
```

**Usage in SparePartsRow**:

```typescript
const position = values[positionField.name] as string;
const positionPerms = POSITION_PERMISSIONS[position as keyof typeof POSITION_PERMISSIONS];

const canEditUnits = useHasPermission([positionPerms.canEditUnits]);
const canEditDiscount = useHasPermission([positionPerms.canEditDiscount]);
const canDelete = useHasPermission([positionPerms.canDelete]);
```

### 2. Position Dropdown with Max Count

CountryConfig defines `allowedPositions` with max count per position:

```typescript
interface CountryConfig {
  diagnosticsConfiguration: {
    rules: Array<{
      allowedPositions: Array<{
        position: string; // "SP", "LA", "FR", etc.
        maxCount: number; // Max instances allowed
      }>;
      automaticRows: Array<{
        position: string;
        count: number; // Auto-generated on diagnostics start
      }>;
    }>;
  };
}
```

**Position dropdown logic**:

```typescript
function computePositionOption(
  opt: GenericOptionProps,
  positionCounts: Record<string, number>,
  allowedPositions: { position: string; maxCount: number }[],
  userPermissions: string[],
): GenericOptionProps {
  // Disable if user lacks permission
  const optPerms = POSITION_PERMISSIONS[opt.value as keyof typeof POSITION_PERMISSIONS];
  if (optPerms && !userPermissions.includes(optPerms.canDelete)) {
    return { ...opt, disabled: true };
  }

  // Disable if max count reached
  const config = allowedPositions.find((p) => p.position === opt.value);
  if (!config) return opt;
  const usedElsewhere = positionCounts[opt.value as string] ?? 0;
  return { ...opt, disabled: usedElsewhere >= config.maxCount };
}
```

### 3. Price Calculation Flow (server-driven)

> Final pricing comes from the backend. `JobOverview` calls `usePostRecalculatePrices` onBlur and `usePostValidateAndSave` on save; both return `priceSummaryDetailed`/`diagnostic`, normalized via `extractDiagnosticFromValidateResponse` and written to `queryClient.setQueryData(["diagnostic", jobId], ...)`. The snippet below from `src/hooks/useDiagnosticsManager.ts` remains for client-side preview/stale-detection only — never treat its output as the persisted value:

```typescript
import {
  calculateNetAmount,
  calculateGrossAmount,
  calculateLineTotal,
} from "utils/priceCalculator";

export const useDiagnosticsManager = (jobId: string) => {
  const queryClient = useQueryClient();
  const countryConfig = queryClient.getQueryData<CountryConfig>([
    "countryConfiguration",
    countryCode,
  ]);
  const discountBase = countryConfig?.diagnosticsConfiguration.rules[0].discountBase;

  // When discount changes → recalculate net
  const handleDiscountChange = (rowIndex: number, newDiscount: number) => {
    const row = materials[rowIndex];
    const { quantity, unitPrice, dealerPrice } = row;

    // Discount base depends on country
    const basePrice = discountBase === "DEALER_PRICE" ? dealerPrice : unitPrice;
    const grossAmount = quantity * basePrice;
    const netAmount = calculateNetAmount(grossAmount, newDiscount);

    updateRow(rowIndex, {
      discount: newDiscount,
      netAmount,
      grossAmount,
    });
  };

  // When net amount changes → recalculate discount
  const handleNetAmountChange = (rowIndex: number, newNet: number) => {
    const row = materials[rowIndex];
    const { quantity, unitPrice, dealerPrice } = row;

    const basePrice = discountBase === "DEALER_PRICE" ? dealerPrice : unitPrice;
    const grossAmount = quantity * basePrice;
    const calculatedDiscount = grossAmount > 0 ? ((grossAmount - newNet) / grossAmount) * 100 : 0;

    updateRow(rowIndex, {
      netAmount: newNet,
      discount: calculatedDiscount,
    });
  };

  return { handleDiscountChange, handleNetAmountChange, materials };
};
```

### 4. Action Type Logic

Material types affect discount behavior:

```typescript
const EXCHANGE_ACTION_TYPES = new Set([
  "NEW_TOOL_EXCHANGE",
  "SPARE_PARTS_EXCHANGE",
  "ACCESSORIES_EXCHANGE",
]);
const EDITABLE_WITH_CONDITION_TYPES = new Set(["CHARGEABLE"]);
const EDITABLE_TYPES = new Set(["COMMERCIAL_GOODWILL"]);
const RESET_TO_ZERO_SOURCE_TYPES = new Set(["WARRANTY", "COMMERCIAL_GOODWILL", "SERVICE_OFFERING"]);
const SUMMARY_DISCOUNT_TARGET_TYPES = new Set(["CHARGEABLE"]);

// When type changes to WARRANTY/SERVICE_OFFERING → discount resets to 0
if (RESET_TO_ZERO_SOURCE_TYPES.has(newType)) {
  void setFieldValue(discountFieldName, 0);
}

// Summary area only sums discount from CHARGEABLE types
const chargeableMaterials = materials.filter((m) => SUMMARY_DISCOUNT_TARGET_TYPES.has(m.type));
const totalDiscount = calculateWeightedDiscount(chargeableMaterials);
```

### 5. Status-Based Row Behavior

```typescript
const STATUSES_BLOCKING_DELETION = new Set([
  "IN_REPAIR",
  "REPAIR_DONE",
  "DELIVERED",
  "COMPLETED",
  "READY_FOR_REPAIR",
  "CUSTOMER_APPROVAL_PENDING",
]);

const STATUSES_DISABLING_ROW = new Set([
  "RETURN_UNASSEMBLY",
  "RETURN_ASSEMBLY",
  "CUSTOMER_APPROVAL_PENDING",
]);

// Delete button disabled if status blocks deletion
const canDelete = !STATUSES_BLOCKING_DELETION.has(jobStatus);

// Entire row disabled if status disables editing
const isRowDisabled = STATUSES_DISABLING_ROW.has(jobStatus);
```

### 6. AutoComplete for Spare Parts

Fields with `subtype: "diagnosticPartNumber"` trigger autocomplete:

```typescript
{
  name: "diagnosticData#0_partNumber",
  label: "Part Number",
  type: "autocomplete",
  subtype: "diagnosticPartNumber",
  autoFillFields: [
    "diagnosticData#0_partName",
    "diagnosticData#0_unitPrice",
    "diagnosticData#0_dealerPrice",
  ],
  optionsEndpoint: {
    url: "/v1/spare-parts",
    method: "GET",
    queryParams: [{ key: "toolModel", value: "toolModelFieldValue" }],
  },
}
```

On selection, `handleAutoCompleteSelect` auto-fills:

- `partName` ← option.label
- `unitPrice` ← option.unitPrice (retail price)
- `dealerPrice` ← option.dealerPrice (net dealer price)

### 7. SummaryArea Aggregation

From `src/modules/JobManagement/JobOverview/SummaryArea/SummaryArea.tsx`:

```typescript
const SummaryArea = ({ area }: { area: Area }) => {
  const { values } = useFormikContext<Record<string, unknown>>();
  const { discountBase } = useDiagnosticsContext();

  // Extract all material rows
  const materials = extractMaterialsFromValues(values);

  // Filter by type for discount calculation
  const chargeableMaterials = materials.filter(m =>
    SUMMARY_DISCOUNT_TARGET_TYPES.has(m.type)
  );

  // Aggregate totals
  const totalGross = materials.reduce((sum, m) => {
    const basePrice = discountBase === "DEALER_PRICE" ? m.dealerPrice : m.unitPrice;
    return sum + (m.quantity * basePrice);
  }, 0);

  const totalNet = materials.reduce((sum, m) => sum + m.netAmount, 0);

  const totalDiscount = totalGross > 0
    ? ((totalGross - totalNet) / totalGross) * 100
    : 0;

  return (
    <div className="summary-area">
      <div>Total Gross: {totalGross.toFixed(2)}</div>
      <div>Total Discount: {totalDiscount.toFixed(2)}%</div>
      <div>Total Net: {totalNet.toFixed(2)}</div>
    </div>
  );
};
```

## DiagnosticsContext

Shared state for the diagnostics tab:

```typescript
interface DiagnosticsContextType {
  arePricesValidated: boolean;
  markRowDirty: (rowIndex: number) => void;
  allowedPositions: Array<{ position: string; maxCount: number }>;
  automaticRows: Array<{ position: string; count: number }>;
  discountBase: "DEALER_PRICE" | "RETAIL_PRICE";
  jobStatus: string;
  canArchiveOnDelete: boolean;
  // resyncMaterialsFromAPI: () => Promise<void>;
}

const DiagnosticsContext = createContext<DiagnosticsContextType | null>(null);

export const useDiagnosticsContext = () => {
  const context = useContext(DiagnosticsContext);
  if (!context) throw new Error("useDiagnosticsContext must be used within DiagnosticsProvider");
  return context;
};
```

## Critical Rules

- **Backend is authoritative for pricing** — `postRecalculatePrices`/`postValidateAndSave` responses (`priceSummaryDetailed`/`diagnostic`) are rendered as-is; `priceCalculator` output is preview/stale-detection only
- **Discount base from CountryConfig** — `"DEALER_PRICE"` for Germany, `"RETAIL_PRICE"` for others
- **Position permissions** — check `POSITION_PERMISSIONS[position].canEdit*` before enabling fields
- **Max count enforcement** — disable position dropdown options when `usedCount >= maxCount`
- **Type-based discount reset** — WARRANTY/SERVICE_OFFERING types reset discount to 0
- **Summary only sums CHARGEABLE** — exclude WARRANTY/COMMERCIAL_GOODWILL from discount aggregation
- **Status-based blocking** — respect `STATUSES_BLOCKING_DELETION` and `STATUSES_DISABLING_ROW`
- **Always use priceCalculator functions for local/preview math** — never inline discount math
- **AutoComplete auto-fills sibling fields** — `autoFillFields` array for partName, unitPrice, dealerPrice
