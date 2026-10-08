# Example: SparePartsRow Component

Source: `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.tsx`

This shows how a single spare part row is rendered with position-based permissions and price calculations.

## Component Props

```typescript
interface SparePartsRowProps {
  fields: Field[]; // Array of fields for this row (position, partNumber, quantity, etc.)
  onDeleteRow?: () => void; // Callback to remove this row
  isDisabled?: boolean; // Status-based disable flag
}
```

## Position-Based Field Permissions

Each field is enabled/disabled based on user permissions and position code:

```typescript
const SparePartsRow = ({ fields, onDeleteRow, isDisabled }: SparePartsRowProps) => {
  const { values } = useFormikContext<Record<string, unknown>>();
  const { allFields, sparePartnotBelongsToTool } = useContext(GenericFormContext);
  const { allowedPositions, discountBase, jobStatus } = useDiagnosticsContext();

  // Find position field value
  const positionField = fields.find(f => f.subtype === "diagnosticPosition");
  const position = values[positionField?.name || ""] as string;

  // Get permissions for this position
  const positionPerms = POSITION_PERMISSIONS[position as keyof typeof POSITION_PERMISSIONS];

  // Permission checks
  const canEditUnits = useHasPermission([positionPerms?.canEditUnits || ""]);
  const canEditUnitPrice = useHasPermission([positionPerms?.canEditUnitPrice || ""]);
  const canEditDiscount = useHasPermission([positionPerms?.canEditDiscount || ""]);
  const canEditTotal = useHasPermission([positionPerms?.canEditTotal || ""]);
  const canDelete = useHasPermission([positionPerms?.canDelete || ""]);

  // Apply permissions to fields
  const quantityField = fields.find(f => f.name.includes("quantity"));
  if (quantityField) {
    quantityField.isDisabled = !canEditUnits || isDisabled;
  }

  const discountField = fields.find(f => f.name.includes("discount"));
  if (discountField) {
    discountField.isDisabled = !canEditDiscount || isDisabled;
  }

  return (
    <div className="spare-parts-row">
      {fields.map(field => (
        <GenericField key={field.name} field={field} />
      ))}
      {canDelete && !isDisabled && (
        <button onClick={onDeleteRow}>
          <Icon name="delete" />
        </button>
      )}
    </div>
  );
};
```

## Position Dropdown with Max Count

```typescript
// Count existing positions
const positionCounts: Record<string, number> = {};
allFields
  .filter((f) => f.subtype === "diagnosticPosition" && f.name !== thisFieldName)
  .forEach((f) => {
    const val = values[f.name] as string;
    if (val) positionCounts[val] = (positionCounts[val] ?? 0) + 1;
  });

// Update position dropdown options
const positionField = fields.find((f) => f.subtype === "diagnosticPosition");
if (positionField?.options) {
  positionField.options = positionField.options.map((opt) => {
    const config = allowedPositions.find((p) => p.position === opt.value);
    if (!config) return opt;

    const usedCount = positionCounts[opt.value as string] ?? 0;
    const isMaxReached = usedCount >= config.maxCount;

    // Also check permission
    const optPerms = POSITION_PERMISSIONS[opt.value as keyof typeof POSITION_PERMISSIONS];
    const lackPermission = optPerms && !userPermissions.includes(optPerms.canDelete);

    return {
      ...opt,
      disabled: isMaxReached || lackPermission,
    };
  });
}
```

## Price Calculation on Change

```typescript
// When discount changes
const handleDiscountChange = (newDiscount: number) => {
  const quantity = Number(values[quantityFieldName]) || 0;
  const unitPrice = Number(values[unitPriceFieldName]) || 0;
  const dealerPrice = Number(values[dealerPriceFieldName]) || 0;

  // Discount base from country config
  const basePrice = discountBase === "DEALER_PRICE" ? dealerPrice : unitPrice;
  const grossAmount = quantity * basePrice;
  const netAmount = calculateNetAmount(grossAmount, newDiscount);

  void setFieldValue(netAmountFieldName, netAmount);
  void setFieldValue(discountFieldName, newDiscount);
};

// When net amount changes (user edits total field)
const handleNetAmountChange = (newNet: number) => {
  const quantity = Number(values[quantityFieldName]) || 0;
  const unitPrice = Number(values[unitPriceFieldName]) || 0;
  const dealerPrice = Number(values[dealerPriceFieldName]) || 0;

  const basePrice = discountBase === "DEALER_PRICE" ? dealerPrice : unitPrice;
  const grossAmount = quantity * basePrice;
  const calculatedDiscount = grossAmount > 0 ? ((grossAmount - newNet) / grossAmount) * 100 : 0;

  void setFieldValue(discountFieldName, calculatedDiscount);
  void setFieldValue(netAmountFieldName, newNet);
};
```

**Key points:**

- **Position determines permissions** — LA, SP, FR, PN, PC each have distinct canEdit\* flags
- **Max count from CountryConfig** — position dropdown options disabled when limit reached
- **Discount base varies by country** — DE uses DEALER_PRICE, others use RETAIL_PRICE
- **Bidirectional calculation** — discount ↔ netAmount, always derive one from the other
- **Type-based reset** — WARRANTY/SERVICE_OFFERING types force discount to 0
