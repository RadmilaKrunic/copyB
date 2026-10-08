# Example: AutoComplete Field with Auto-Fill

Source: `src/components/generics/Field/GenericField.tsx` (line ~400)

This shows how the `autocomplete` field type implements auto-fill functionality in BASS-Next.

## Field Metadata

```typescript
{
  name: "partNumber",
  label: "Part Number",
  type: "autocomplete",
  autoFillFields: ["partName", "unitPrice", "dealerPrice"],
  optionsEndpoint: {
    url: "/v1/spare-parts",
    method: "GET",
    queryParams: [],
  },
  attributeMapping: "diagnosticData.spareParts[].partNumber",
  isRequired: true,
}
```

## Rendering Logic

```typescript
case "autocomplete":
  return (
    <span className={`${fullWidth} generic-field-autocomplete ${className || ""}`} {...restProps}>
      {isInfoIcon && infoText && <InfoIconWithTooltip text={infoText} />}
      <AutoComplete
        disabled={effectiveIsDisabled}
        label={displayLabel}
        field={field}
        onSelect={(option: AutoCompleteOption) => {
          handleAutoCompleteSelect(option, field, setFieldValue).catch((error: unknown) => {
            console.error("AutoComplete onSelect error:", error);
          });
        }}
        onReset={(option: AutoCompleteOption) => {
          handleResetAutoCompleteFields(option, field, setFieldValue).catch((error: unknown) => {
            console.error("AutoComplete onReset error:", error);
          });
        }}
        autocompleteValidation={autocompleteValidation}
        sparePartnotnotnotnotnotnotBelongsToTool={sparePartBelongsToTool}
      />
      {sparePartBelongsToTool && (
        <StatusIndicator
          sparePartBelongsToTool={sparePartBelongsToTool}
          name={field.name}
          compatibilityMessage={getSparePartCompatibilityMessage(
            sparePartBelongsToTool,
            field.name,
            t,
          )}
        />
      )}
      <FieldError name={field.name} />
    </span>
  );
```

## Auto-Fill Handler

From `src/components/ui/AutoComplete/AutoComplete.helper.ts`:

```typescript
export const handleAutoCompleteSelect = async (
  option: AutoCompleteOption,
  field: Field,
  setFieldValue: (field: string, value: unknown) => Promise<void>,
): Promise<void> => {
  // Set the selected value
  await setFieldValue(field.name, option.value);

  // Auto-fill sibling fields
  if (field.autoFillFields && option.autoFillData) {
    for (const siblingFieldName of field.autoFillFields) {
      const autoFillValue = option.autoFillData[siblingFieldName];
      if (autoFillValue != null) {
        await setFieldValue(siblingFieldName, autoFillValue);
      }
    }
  }
};
```

**Key points:**

- **`autoFillFields`**: array of sibling field names to auto-populate
- **`option.autoFillData`**: object containing values for each sibling field
- **Async flow**: `await setFieldValue()` for each field sequentially
- **Null safety**: only set values that exist in `autoFillData`

## Validation Integration

Autocomplete fields support **validation via `autocompleteValidation` ref**:

```typescript
const autocompleteValidation = useRef<Record<string, boolean>>({});

// In AutoComplete component:
if (autocompleteValidation?.current) {
  autocompleteValidation.current[field.name] = isValid;
}
```

This is used by `useFormValidation` hook to block submission if autocomplete selections are invalid.
