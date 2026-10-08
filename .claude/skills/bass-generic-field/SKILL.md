---
name: bass-generic-field
description: >
  Add a new field type to GenericField or extend field properties in the metadata-driven form system.
  Use this skill whenever the user asks to create a new field type, add field rendering logic,
  extend field properties, implement a custom field, or says 'add a field to GenericField'.
  Also triggers when working on field metadata, field types, or GenericField.tsx rendering logic.
---

# Add/Extend GenericField — BASS-Next

## Architecture

```
src/components/generics/Field/
├── GenericField.tsx              ← Rendering logic (type switch, UI mapping)
├── GenericField.types.ts         ← Field interface definition
├── GenericField.utils.ts         ← Helper functions (validation, visibility, etc.)
└── useFieldVisibilityReset.ts    ← Hook for dependent field reset
```

Referenced by:
- `GenericArea` renders arrays of `GenericField`
- `GenericSection` contains `GenericArea` components
- `GenericForm` orchestrates sections

## Quick Start

For a new field type (e.g., `multiselect`):

1. Extend `Field` interface in `GenericField.types.ts` with new properties
2. Add rendering case in `GenericField.tsx` type switch
3. Map to a Bosch FROK component or custom UI wrapper

## Step-by-step

### 1. Extend Field Interface

File: `src/components/generics/Field/GenericField.types.ts`

Add new properties to the `Field` interface:

```typescript
interface Field {
  name: string;                               // Formik field name (required)
  label: string;                              // Display label (required)
  type: string;                               // Rendering type (required)
  
  // Existing properties (keep all):
  attributeMapping?: string;                  // Dot-notation API path (e.g., "order.customer.firstName")
  subtype?: string;                           // Special behavior flag (diagnosticPosition, etc.)
  autoFillFields?: string[];                  // Sibling fields to auto-populate on autocomplete
  dependentFields?: DependentField[];         // Conditional visibility dependencies
  dependFieldCondition?: string | null;       // "AND" | "OR" for dependentFields
  optionsEndpoint?: OptionsEndpointProps;     // Dynamic dropdown options from API
  permissions?: string[];                     // Permission check via useHasPermission()
  requiredDependentFields?: RequiredDependentField;  // Conditional required validation
  onValueChange?: string;                     // Callback name from actionCallbacks
  sameDataFieldAs?: string;                   // Mirror value to another field
  
  // Add your new properties here:
  multiSelect?: boolean;                      // Example: enable multi-select in dropdown
  maxFilesAllowed?: number;                   // Example: file upload limit
  // ...
}
```

Key properties:
- **`name`**: Formik field name — must be unique per form
- **`type`**: Determines which component renders (text, dropdown, autocomplete, etc.)
- **`attributeMapping`**: Source of truth for API serialization via `mapValuesToAPI()`
- **`dependentFields`**: Conditional visibility — field shows only if dependencies met
- **`autoFillFields`**: Array of sibling field names to auto-populate (autocomplete only)

### 2. Add Rendering Logic

File: `src/components/generics/Field/GenericField.tsx`

Add your new type to the switch statement:

```typescript
import { TextField, Checkbox, Button, TextArea } from "@bosch/react-frok";
import { useFormikContext } from "formik";
import AutoComplete from "components/ui/AutoComplete/AutoComplete";
import DatePicker from "components/ui/DatePicker/DatePicker";
import NumberInputFiled from "components/ui/NumberInputField/NumberInputFiled";
import DynamicDropdown from "components/ui/DynamicDropdown/DynamicDropdown";
import RadioGroup from "components/ui/RadioGroup/RadioGroup";
import FileUpload from "components/ui/FileUpload/FileUpload";

const GenericField = ({ field }: { field: Field }) => {
  const { values, setFieldValue, errors, touched } = useFormikContext<Record<string, unknown>>();

  // Conditional visibility
  const isVisible = isFieldVisible(field, values, field.dependFieldCondition);
  if (!isVisible) return null;

  // Permission check
  const hasPermission = useHasPermission(field.permissions || []);
  if (!hasPermission) return null;

  // Type-based rendering
  switch (field.type) {
    case "text":
    case "email":
    case "tel":
      return (
        <TextField
          name={field.name}
          type={field.type}
          label={field.label}
          disabled={field.isDisabled}
          required={resolveIsRequired(field, values)}
        />
      );

    case "multiselect":  // ← NEW CASE
      return (
        <DynamicDropdown
          name={field.name}
          label={field.label}
          optionsEndpoint={field.optionsEndpoint}
          multiSelect={field.multiSelect || false}
        />
      );

    // ... other cases
    default:
      return null;
  }
};
```

### 3. Use Existing UI Components

Map to **Bosch FROK components** or **custom UI wrappers**:

| Field Type | Component | Import |
|------------|-----------|--------|
| `text`, `email`, `tel` | `<TextField>` | `@bosch/react-frok` |
| `price`, `number` | `<NumberInputFiled>` | `components/ui/NumberInputField` |
| `textarea` | `<TextArea>` | `@bosch/react-frok` |
| `checkbox` | `<Checkbox>` | `@bosch/react-frok` |
| `radiogroup` | `<RadioGroup>` | `components/ui/RadioGroup` |
| `datepicker` | `<DatePicker>` | `components/ui/DatePicker` |
| `dropdown` | `<DynamicDropdown>` | `components/ui/DynamicDropdown` |
| `autocomplete` | `<AutoComplete>` | `components/ui/AutoComplete` |
| `upload` | `<FileUpload>` | `components/ui/FileUpload` |
| `button` | `<Button>` | `@bosch/react-frok` |

Custom UI wrappers in `src/components/ui/` handle Formik integration.

### 4. Add Field-Specific Logic (Optional)

If your field type needs custom behavior, add helpers to `GenericField.utils.ts`:

```typescript
export const resolveIsRequired = (field: Field, values: Record<string, unknown>): boolean => {
  if (field.isRequired) return true;
  
  // Conditional required via requiredDependentFields
  const { byValueOr, byValueAnd } = field.requiredDependentFields || {};
  
  if (byValueOr?.length) {
    return byValueOr.some(dep => values[dep.fieldName] === dep.fieldValue);
  }
  
  if (byValueAnd?.length) {
    return byValueAnd.every(dep => values[dep.fieldName] === dep.fieldValue);
  }
  
  return false;
};

export const isFieldVisible = (
  field: Field,
  values: Record<string, unknown>,
  condition: string | null,
): boolean => {
  if (!field.dependentFields?.length) return true;
  
  const deps = field.dependentFields.map(dep => {
    const value = values[dep.fieldName];
    const target = dep.fieldValue;
    
    // Wildcard: "-" means any non-empty value
    if (target === "-") return value != null && value !== "";
    return value === target;
  });
  
  return condition === "OR" ? deps.some(Boolean) : deps.every(Boolean);
};
```

### 5. Add Metadata to Form Configuration

Static forms in `src/components/generics/Form/GenericForm.data.ts`:

```typescript
export const createJobForm: GenericForm = {
  name: "createJob",
  formGroup: "jobManagement",
  position: 1,
  sections: [
    {
      name: "assetData",
      areas: [
        {
          name: "toolInfo",
          fields: [
            {
              name: "manufacturer",
              label: "Manufacturer",
              type: "multiselect",  // ← NEW TYPE
              multiSelect: true,
              optionsEndpoint: {
                url: "/v1/manufacturers",
                method: "GET",
                queryParams: [],
              },
              attributeMapping: "order.tool.manufacturer",
              isRequired: true,
            },
          ],
        },
      ],
    },
  ],
  actions: null,
};
```

## Conditional Visibility Example

Show a field only when another field has a specific value:

```typescript
{
  name: "repairCost",
  label: "Repair Cost",
  type: "price",
  dependentFields: [
    { fieldName: "repairType", fieldValue: "paid" }
  ],
  dependFieldCondition: "AND",
  attributeMapping: "diagnosticData.repairCost",
}
```

Wildcard visibility (show if any non-empty value):

```typescript
{
  name: "notes",
  label: "Notes",
  type: "textarea",
  dependentFields: [
    { fieldName: "status", fieldValue: "-" }  // "-" = any non-empty value
  ],
}
```

## AutoComplete with Auto-Fill

Real example: spare part number in `data/data<CC>.json` (`diagnosticsSpareParts` area):

```json
{
  "name": "sparePartNumber",
  "type": "autocomplete",
  "subtype": "diagnosticPartNumber",
  "autoFillFields": ["description", "unitPrice"],
  "onBlur": "onRecalculatePrices"
}
```

- Selecting an option runs `handleAutoCompleteSelect(option, field, setFieldValue, allFields)` (`AutoComplete.helper.ts`), which fills `autoFillFields` siblings.
- Spare part numbers use a commit sequence (select or blur -> fill row -> `validateForm` -> not-belongs-to-tool check -> skip if same normalized part -> run `onValueChange` then `onBlur` once). Typing or clearing runs no action. See `references/example-autocomplete.md`.
- Other autocompletes (bare tool, tool model, customer) set value + autofill on select and validate via `autocompleteValidation`.

## Testing

Example test from `src/api/services/jobs/hooks.test.ts`:

```typescript
import { render, screen } from "@testing-library/react";
import { Formik } from "formik";
import GenericField from "./GenericField";

describe("GenericField", () => {
  it("renders multiselect dropdown", () => {
    const field = {
      name: "tags",
      label: "Tags",
      type: "multiselect",
      multiSelect: true,
      optionsEndpoint: {
        url: "/v1/tags",
        method: "GET",
        queryParams: [],
      },
    };

    render(
      <Formik initialValues={{ tags: [] }} onSubmit={vi.fn()}>
        <GenericField field={field} />
      </Formik>
    );

    expect(screen.getByLabelText("Tags")).toBeInTheDocument();
  });

  it("hides field when visibility condition not met", () => {
    const field = {
      name: "optional",
      label: "Optional Field",
      type: "text",
      dependentFields: [{ fieldName: "enabled", fieldValue: "true" }],
    };

    render(
      <Formik initialValues={{ enabled: "false", optional: "" }} onSubmit={vi.fn()}>
        <GenericField field={field} />
      </Formik>
    );

    expect(screen.queryByLabelText("Optional Field")).not.toBeInTheDocument();
  });
});
```

## Critical Rules

- **All generic components consume Formik context** — `useFormikContext()`, never prop-drill
- **Permission check via `useHasPermission(field.permissions || [])`** — empty array = always visible
- **Conditional visibility via `isFieldVisible(field, allFields, values)`**
- **`attributeMapping` is the source of truth** for API serialization via `mapValuesToAPI()`
- **Never use `any`** — type field values as `FieldValueType` or `unknown` with guards
- **Return `null` for invisible/unauthorized fields** — don't render hidden markup
