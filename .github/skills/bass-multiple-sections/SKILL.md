---
name: bass-multiple-sections
description: "isMultiple section/area duplication: multi-asset CreateJob, accessories, delete + re-index, API compaction."
---

# Multiple Sections

## Pieces

- `components/generics/utils.ts`: `setDuplicatedSection(section, index)`, `setDuplicatedArea(area, index)`, `mapFieldToFieldMapping`, `mapValuesToAPI`.
- `modules/JobManagement/CreateJob/CreateJob.tsx`: `addNewMultipleSection(prefix, values)`, `deleteSection(index, setFieldValue?)`.
- `hooks/useAccessoriesManager.tsx` + `CreateJob/AssetData/AccessoryArea`.
- Diagnostics/claim rows are repeated areas too (`<prefix>#<i>_<field>`); their lifecycle lives in the managers (see `bass-diagnostics`, `bass-claims`).

## Rules

- Add: `structuredClone` the first (index 0) section of the prefix -> `setDuplicatedSection(clone, maxIndex + 1)`. Never clone the last mutated section.
- New fields -> `mapFieldToFieldMapping` -> default values merged into `initialFormValues` -> appended to `allFields`.
- Accessories for new asset: `<prefix>#<i>_accessory#0`; fall back to renaming `#0_accessory#` fields. Register in `assetsAccessories`.
- Delete: remove section, re-index remaining `isMultiple` sections of the prefix to 0..n-1, shift form values accordingly.
- Before submit, compact arrays (no holes) then `mapValuesToAPI`.
- `setInitalSectionsAreasFields` mutates in place; deep clone fixtures in tests.
