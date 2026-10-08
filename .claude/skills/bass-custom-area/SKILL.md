---
name: bass-custom-area
description: >
  Create custom area components for non-standard form rendering in the metadata-driven form system.
  Use this skill when the user asks to create a custom area, implement special area rendering,
  add a custom area component, or says 'add custom area', 'create area component'.
  Also triggers when working on CustomAreasMapper, AccessoryArea, DocumentTabArea, SparePartsArea, or SummaryArea.
---

# Create Custom Area Component — BASS-Next

## Architecture

Custom areas bypass the default `GenericArea` rendering for specialized UI:

```
src/components/generics/Area/
├── GenericArea.tsx              ← Default area renderer
├── CustomAreasMapper.tsx        ← Routes by area name to custom components

src/modules/JobManagement/CreateJob/AssetData/
├── AccessoryArea/               ← Custom area: editable accessory rows
│   ├── AccessoryArea.tsx
│   └── AccessoryArea.scss

src/modules/JobManagement/JobOverview/
├── SparePartsArea/              ← Custom area: diagnostics spare parts
├── SummaryArea/                 ← Custom area: price totals aggregation
└── DocumentTabArea/             ← Custom area: file upload + document list
```

## Quick Start

To create a new custom area (e.g., `notesTimeline`):

1. Create component in `src/modules/[YourModule]/[YourArea]/`
2. Add routing in `CustomAreasMapper.tsx`
3. Export area metadata in form configuration with custom area name

## Step-by-step

### 1. Create Custom Area Component

File: `src/modules/JobManagement/JobOverview/NotesTimelineArea/NotesTimelineArea.tsx`

```typescript
import { useTranslation } from "react-i18next";
import { useFormikContext } from "formik";
import Area from "components/generics/Area/GenericArea.types";
import "./NotesTimelineArea.scss";

interface NotesTimelineAreaProps {
  readonly area: Area;
  readonly readOnly?: boolean;
}

const NotesTimelineArea = ({ area, readOnly = false }: NotesTimelineAreaProps) => {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();

  // Custom rendering logic here
  return (
    <div className="notes-timeline-area">
      <h3>{t(area.label || area.name)}</h3>
      {/* Your custom UI */}
    </div>
  );
};

export default NotesTimelineArea;
```

### 2. Add Routing in CustomAreasMapper

File: `src/components/generics/Area/CustomAreasMapper.tsx`

```typescript
import Area from "./GenericArea.types";
import AccessoryArea from "modules/JobManagement/CreateJob/AssetData/AccessoryArea/AccessoryArea";
import DocumentTabArea from "modules/JobManagement/JobOverview/DocumentsTab/DocumentTabArea";
import NotesList from "modules/JobManagement/JobOverview/NotesList/NotesList";
import SparePartsArea from "modules/JobManagement/JobOverview/SparePartsArea/SparePartsArea";
import SummaryArea from "modules/JobManagement/JobOverview/SummaryArea/SummaryArea";
import NotesTimelineArea from "modules/JobManagement/JobOverview/NotesTimelineArea/NotesTimelineArea";  // ← NEW

interface CustomAreasMapperProps {
  area: Area;
  readOnly?: boolean;
}

const CustomAreasMapper = ({ area, readOnly }: CustomAreasMapperProps) => {
  const areaName = area.name.includes("#") 
    ? area.name.split("#")[1].split("_")[0]
    : area.name;

  switch (areaName) {
    case "accessory":
      return <AccessoryArea area={area} readOnly={readOnly} />;
    case "documentList":
      return <DocumentTabArea area={area} />;
    case "notesList":
      return <NotesList area={area} />;
    case "diagnosticsSpareParts":
      return <SparePartsArea area={area} readOnly={readOnly} />;
    case "diagnosticsSummary":
      return <SummaryArea area={area} />;
    case "notesTimeline":  // ← NEW
      return <NotesTimelineArea area={area} readOnly={readOnly} />;
    default:
      return null;  // Falls back to GenericArea rendering
  }
};

export default CustomAreasMapper;
```

### 3. Add Area to Form Metadata

File: `src/components/generics/Form/GenericForm.data.ts`

```typescript
export const jobOverview: GenericForm = {
  name: "jobOverview",
  formGroup: "jobManagement",
  position: 2,
  sections: [
    {
      name: "notes",
      label: "Notes",
      areas: [
        {
          name: "notesTimeline",  // ← Matches CustomAreasMapper case
          label: "Notes Timeline",
          fields: [],  // Custom area handles its own rendering
        },
      ],
    },
  ],
  actions: null,
};
```

## Real Example: AccessoryArea

From `src/modules/JobManagement/CreateJob/AssetData/AccessoryArea/AccessoryArea.tsx`:

**Purpose**: Manage dynamic accessory rows (up to 5) per asset, with add/remove buttons.

**Key features:**
- **Context-based state**: `CreateJobContext` holds `assetsAccessories` array
- **Dynamic field names**: `assetData#0_accessory#1_name` pattern for multi-asset support
- **Add/Remove logic**: duplicates field metadata with updated indices
- **Cleanup on unmount**: removes all accessory fields from Formik values

```typescript
const AccessoryArea = ({ area, readOnly = false }: AccessoryAreaProps) => {
  const { assetsAccessories, setAssetsAccessories } = useContext(CreateJobContext);
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  
  const addAccessory = () => {
    const accessories = assetsAccessories.filter(a => a.assetIndex === assetsIndex);
    if (accessories.length === 5) return;  // Limit to 5
    
    const newAccessory = duplicateAccessory(accessories.length);
    
    // Initialize default values for new accessory fields
    newAccessory.fields.forEach((field) => {
      if (field.defaultValue !== undefined && field.defaultValue !== null) {
        void setFieldValue(field.name, field.defaultValue);
      }
    });
    
    setAssetsAccessories([...assetsAccessories, newAccessory]);
  };
  
  const removeAccessory = (indexToRemove: number) => {
    // Remove field values from Formik
    const accessoryToDelete = accessories.find((_, i) => i === indexToRemove);
    accessoryToDelete?.fields.forEach((field) => {
      delete values[field.name];
    });
    
    // Re-index remaining accessories
    const updatedAccessories = accessories
      .filter((_, i) => i !== indexToRemove)
      .map((a) => {
        if (Number(a.accessoriesIndex) > indexToRemove) {
          const newIndex = Number(a.accessoriesIndex) - 1;
          a.fields.forEach((field) => {
            const oldValue = values[field.name];
            delete values[field.name];
            field.name = field.name.replace(`accessory#${a.accessoriesIndex}`, `accessory#${newIndex}`);
            values[field.name] = oldValue;
          });
          a.accessoriesIndex = `${newIndex}`;
        }
        return a;
      });
    
    setAssetsAccessories(updatedAccessories);
  };
  
  return (
    <div className="accessory-area">
      {accessories.map((acc, index) => (
        <div key={index} className="accessory-row">
          {acc.fields.map(field => (
            <GenericField key={field.name} field={field} />
          ))}
          {!readOnly && (
            <Button onClick={() => removeAccessory(index)}>Remove</Button>
          )}
        </div>
      ))}
      {!readOnly && accessories.length < 5 && (
        <Button onClick={addAccessory}>Add Accessory</Button>
      )}
    </div>
  );
};
```

## When to Use Custom Areas

| Scenario | Use Custom Area |
|----------|----------------|
| **Dynamic row management** | Yes — AccessoryArea, SparePartsArea |
| **Aggregated calculations** | Yes — SummaryArea totals |
| **File upload + preview** | Yes — DocumentTabArea |
| **Timeline/thread rendering** | Yes — NotesList |
| **Standard form fields** | No — use GenericArea |

## Custom Area Patterns

### Pattern 1: Dynamic Rows with Add/Remove

```typescript
const [rows, setRows] = useState<Row[]>([]);

const addRow = () => {
  const newRow = { id: rows.length, fields: [...] };
  setRows([...rows, newRow]);
};

const removeRow = (id: number) => {
  setRows(rows.filter(r => r.id !== id));
};
```

### Pattern 2: Aggregated State from Formik Values

```typescript
const { values } = useFormikContext<Record<string, unknown>>();

const total = useMemo(() => {
  return spareParts.reduce((sum, part) => {
    const qty = Number(values[`part_${part.id}_quantity`]) || 0;
    const price = Number(values[`part_${part.id}_unitPrice`]) || 0;
    return sum + (qty * price);
  }, 0);
}, [values, spareParts]);
```

### Pattern 3: Context-Driven State

```typescript
const MyCustomArea = ({ area }: CustomAreaProps) => {
  const { sharedState, setSharedState } = useContext(MyModuleContext);
  
  // Use context for state shared between custom areas
  return <div>{/* render using sharedState */}</div>;
};
```

## Critical Rules

- **Return `null` in CustomAreasMapper for unknown area names** — falls back to GenericArea
- **Always consume Formik context via `useFormikContext()`** — never prop-drill
- **Clean up Formik values on unmount** — delete fields when removing dynamic rows
- **Use `GenericField` for rendering fields** — don't reinvent field rendering
- **Respect `readOnly` prop** — disable add/remove buttons in view mode
