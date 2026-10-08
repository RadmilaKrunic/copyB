# Example: AccessoryArea Component

Source: `src/modules/JobManagement/CreateJob/AssetData/AccessoryArea/AccessoryArea.tsx`

This shows how to implement dynamic row management with add/remove functionality in a custom area.

## Component Structure

```typescript
interface AccessoryAreaProps {
  readonly area: Area;
  readonly readOnly?: boolean;
}

interface Accessory {
  assetIndex: string;
  accessoriesIndex: string;
  fields: Field[];
}

const AccessoryArea = ({ area, readOnly = false }: AccessoryAreaProps) => {
  const { assetsAccessories, setAssetsAccessories } = useContext(CreateJobContext);
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  
  // Extract indices from area name: "assetData#0_accessory#1" → assetIndex="0", accessoriesIndex="1"
  const splitName = area.name?.split("_") || [];
  const assetIndex = splitName[0]?.replace("assetData#", "") || "0";
  const accessoriesIndex = splitName[1]?.replace("accessory#", "") || "0";
  
  // ...
};
```

## Add Accessory Logic

```typescript
const addAccessory = () => {
  const accessories = assetsAccessories.filter(a => a.assetIndex === assetIndex);
  
  // Limit to 5 accessories per asset
  if (accessories.length === 5) return;
  
  // Duplicate field metadata with updated index
  const newAccessory = duplicateAccessory(accessories.length);
  
  // Initialize default values for new accessory fields
  newAccessory.fields.forEach((field) => {
    if (field.defaultValue !== undefined && field.defaultValue !== null) {
      void setFieldValue(field.name, field.defaultValue);
    }
  });
  
  setAssetsAccessories([...assetsAccessories, newAccessory]);
};

const duplicateAccessory = (index: number): Accessory => {
  const templateAccessory = assetsAccessories.find(a => a.assetIndex === assetIndex);
  
  if (!templateAccessory) {
    return { assetIndex, accessoriesIndex: `${index}`, fields: [] };
  }
  
  // Clone fields with updated field names
  const newFields = templateAccessory.fields.map(field => {
    const newField = { ...field };
    newField.name = newField.name.replace(
      `accessory#${templateAccessory.accessoriesIndex}`,
      `accessory#${index}`,
    );
    return newField;
  });
  
  return {
    assetIndex,
    accessoriesIndex: `${index}`,
    fields: newFields,
  };
};
```

## Remove Accessory Logic

```typescript
const removeAccessory = (indexToRemove: number) => {
  const accessories = assetsAccessories.filter(a => a.assetIndex === assetIndex);
  
  // Delete field values from Formik
  const accessoryToDelete = accessories.find((_, i) => i === indexToRemove);
  accessoryToDelete?.fields.forEach((field) => {
    delete values[field.name];
  });
  
  // Re-index remaining accessories (shift indices down)
  const updatedAccessories = accessories
    .filter((_, i) => i !== indexToRemove)
    .map((a) => {
      if (Number(a.accessoriesIndex) > indexToRemove) {
        const newIndex = Number(a.accessoriesIndex) - 1;
        
        // Update field names and move values
        a.fields.forEach((field) => {
          const oldValue = values[field.name];
          delete values[field.name];
          field.name = field.name.replace(
            `accessory#${a.accessoriesIndex}`,
            `accessory#${newIndex}`,
          );
          values[field.name] = oldValue;
        });
        
        a.accessoriesIndex = `${newIndex}`;
      }
      return a;
    });
  
  setAssetsAccessories([
    ...assetsAccessories.filter(a => a.assetIndex !== assetIndex),
    ...updatedAccessories,
  ]);
  
  // If no accessories left, uncheck "has accessories" checkbox
  if (updatedAccessories.length === 0) {
    void setFieldValue(`assetData#${assetIndex}_accessories_accessories`, false);
  }
};
```

## Rendering

```typescript
return (
  <div className="accessory-area">
    {accessories.map((acc, index) => (
      <div key={index} className="accessory-row">
        <div className="accessory-fields">
          {acc.fields.map(field => (
            <GenericField key={field.name} field={field} />
          ))}
        </div>
        {!readOnly && (
          <Button
            variant="ghost"
            onClick={() => removeAccessory(index)}
            aria-label={t("removeAccessory")}
          >
            <Icon name="delete" />
          </Button>
        )}
      </div>
    ))}
    {!readOnly && accessories.length < 5 && (
      <Button
        variant="secondary"
        onClick={addAccessory}
        aria-label={t("addAccessory")}
      >
        <Icon name="add" /> {t("addAccessory")}
      </Button>
    )}
  </div>
);
```

## Cleanup on Unmount

```typescript
useEffect(() => {
  if (hasMounted.current) {
    return () => {
      // Cleanup: remove all accessory field values from Formik
      const newFormValues = { ...values };
      assetsAccessories.forEach((acc) => {
        acc.fields.forEach((field) => {
          delete newFormValues[field.name];
        });
      });
      newFormValues[`assetData#${assetIndex}_accessories_accessories`] = false;
      void setValues(newFormValues);
      setAssetsAccessories([]);
    };
  } else {
    hasMounted.current = true;
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

**Key points:**
- **Context-based state** — `assetsAccessories` array stored in `CreateJobContext`
- **Dynamic field naming** — `assetData#0_accessory#1_name` pattern for multi-asset support
- **Add logic** — clone field metadata, update indices, initialize default values
- **Remove logic** — delete field values, re-index remaining accessories
- **Cleanup on unmount** — remove all accessory fields from Formik to prevent orphaned data
- **Limit enforcement** — max 5 accessories per asset
