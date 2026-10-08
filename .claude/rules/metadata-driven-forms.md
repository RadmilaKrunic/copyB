---
paths:
  - "src/components/generics/**"
---

# Metadata-Driven Forms — BASS-Next

## Core Pattern: Three-Level Hierarchy

**Section → Area → Field**

Forms are defined as JSON metadata and rendered dynamically by generic components:

```
GenericForm (formGroup, sections)
  ↓
GenericSection (section name, areas)
  ↓
GenericArea (area name, fields)
  ↓
GenericField (field type, name, attributeMapping)
```

All generic components **consume Formik context via `useFormikContext()`** — never prop-drill form state.

## Field Types (13 supported)

From `src/components/generics/Field/GenericField.types.ts`:

- `text`, `email`, `tel` — mapped to `<TextField>`
- `price`, `number` — mapped to `<NumberInputFiled>`
- `button` — action trigger (no form value)
- `radiogroup` — mapped to `<RadioGroup>`
- `checkbox` — mapped to `<Checkbox>`
- `datepicker` — mapped to `<DatePicker>`
- `dropdown` — static or dynamic via `optionsEndpoint`
- `upload` — mapped to `<FileUpload>`
- `textarea` — mapped to `<TextArea>`
- `autocomplete` — mapped to `<AutoComplete>` with `autoFillFields` support

## Key Field Properties

From `src/components/generics/Field/GenericField.types.ts`:

```typescript
interface Field {
  name: string; // Formik field name
  type: string; // Rendering type (text, dropdown, autocomplete, etc.)
  attributeMapping?: string; // Dot-notation API path (e.g., "order.customer.firstName")
  subtype?: string; // Special behavior: diagnosticPosition, diagnosticPartNumber, diagnosticFaultCode
  autoFillFields?: string[]; // Sibling fields to auto-populate on autocomplete selection
  dependentFields?: Array<{
    // Conditional visibility dependencies
    fieldName: string;
    fieldValue: string; // "-" is wildcard (any non-empty value)
  }>;
  dependFieldCondition?: "AND" | "OR"; // How dependentFields are combined
  optionsEndpoint?: {
    // Dynamic dropdown options from API
    url: string;
    method: string;
    queryParams?: Record<string, string>;
  };
  hiddenForStatuses?: string[]; // Job statuses where field is hidden
  permissions?: string[]; // Checked by useHasPermission(); empty array = always visible
  requiredDependentFields?: {
    // Conditional required validation
    byValueOr?: Array<{ fieldName: string; fieldValue: unknown }>;
    byValueAnd?: Array<{ fieldName: string; fieldValue: unknown }>;
  };
  onValueChange?: string; // Callback name from actionCallbacks map
  sameDataFieldAs?: string; // Mirror value to another field
  fieldMapping?: {
    // Used by UIConfiguration system
    originalName: string;
  };
}
```

## GenericField Rendering Logic

Real example from `src/components/generics/Field/GenericField.tsx`:

```typescript
import { TextField, TextArea, Checkbox, Button } from "@bosch/react-frok";
import { useFormikContext } from "formik";
import AutoComplete from "components/ui/AutoComplete/AutoComplete";
import DatePicker from "components/ui/DatePicker/DatePicker";
import NumberInputFiled from "components/ui/NumberInputField/NumberInputFiled";
import DynamicDropdown from "components/ui/DynamicDropdown/DynamicDropdown";
import RadioGroup from "components/ui/RadioGroup/RadioGroup";
import FileUpload from "components/ui/FileUpload/FileUpload";

const GenericField = ({ field }: { field: Field }) => {
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();

  // Conditional visibility check
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
      return <TextField name={field.name} type={field.type} />;

    case "price":
    case "number":
      return <NumberInputFiled name={field.name} />;

    case "textarea":
      return <TextArea name={field.name} />;

    case "checkbox":
      return <Checkbox name={field.name} />;

    case "radiogroup":
      return <RadioGroup name={field.name} options={field.options} />;

    case "datepicker":
      return <DatePicker name={field.name} />;

    case "dropdown":
      if (field.optionsEndpoint) {
        return <DynamicDropdown name={field.name} optionsEndpoint={field.optionsEndpoint} />;
      }
      return <Dropdown name={field.name} options={field.options} />;

    case "autocomplete":
      return (
        <AutoComplete
          name={field.name}
          autoFillFields={field.autoFillFields}
          onSelect={(option) => handleAutoCompleteSelect(option, field, setFieldValue)}
        />
      );

    case "upload":
      return <FileUpload name={field.name} />;

    case "button":
      return <Button onClick={() => handleButtonClick(field)}>{field.label}</Button>;

    default:
      return null;
  }
};
```

## Conditional Visibility Pattern

Fields/Areas/Sections support **conditional visibility** via `dependentFields`:

```typescript
{
  name: "repairCost",
  type: "price",
  dependentFields: [
    { fieldName: "repairType", fieldValue: "paid" }  // Show only if repairType === "paid"
  ],
  dependFieldCondition: "AND"
}
```

Wildcard value (`"-"`): any non-empty value satisfies the dependency:

```typescript
{
  name: "notes",
  type: "textarea",
  dependentFields: [
    { fieldName: "status", fieldValue: "-" }  // Show if status has ANY non-empty value
  ]
}
```

## Custom Areas

`CustomAreasMapper.tsx` routes by area name for non-standard rendering:

| Area name               | Component         | Notes                                                         |
| ----------------------- | ----------------- | ------------------------------------------------------------- |
| `accessory`             | `AccessoryArea`   | Editable accessory rows in create mode; disabled in view mode |
| `documentList`          | `DocumentTabArea` | File upload + document list with modal preview                |
| `notesList`             | `NotesList`       | Notes thread display/input                                    |
| `diagnosticsSpareParts` | `SparePartsArea`  | Dynamic spare-part rows                                       |
| `diagnosticsSummary`    | `SummaryArea`     | Aggregated price totals                                       |

Returns `null` for unrecognized names → default `GenericArea` rendering applies.

## UIConfiguration Loading

**Production**: Forms fetched from `/v1/countries/{countryCode}/ui-configuration` and cached in React Query under `["UIConfiguration", countryCode]`.

**Development**: Static forms exported from `src/components/generics/Form/GenericForm.data.ts`:

1. `createJobForm` — used by `CreateJob` and `edit-order/:orderId`
2. `jobOverview` — used by `JobOverview` (`/job-overview/:jobId`)

## GenericFormContext

Shared state between modules and nested generic components:

```typescript
interface GenericFormContextType {
  actionCallbacks: Record<string, (...args: unknown[]) => unknown>;
  allFields: Field[];
  autocompleteValidation?: RefObject<Record<string, boolean>>;
  sparePartnotBelongsToTool?: RefObject<Record<string, boolean>>;
  radioSourceCallbacks?: Record<string, () => unknown[]>;
}
```

Consumed via:

```typescript
const { actionCallbacks, allFields } = useContext(GenericFormContext);
```

## Critical Rules

- **All generic components consume Formik context** — `useFormikContext()`, never prop-drill
- **Permission check via `useHasPermission(field.permissions || [])`** — empty array = always visible
- **Conditional visibility via `isFieldVisible(field, values, dependFieldCondition)`**
- **AutoComplete auto-fills sibling fields** — use `autoFillFields` array
- **Dynamic dropdowns load via `optionsEndpoint`** — not static options
- **`attributeMapping` is the source of truth** for API serialization via `mapValuesToAPI()`
