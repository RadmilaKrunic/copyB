---
name: bass-uiconfig-system
description: "UIConfiguration lifecycle, field metadata, fieldMapping, API mapping, GenericFormContext and field actions."
---

# UIConfiguration System

## Lifecycle

- App level (`App.tsx`): `["user"]` -> `["countryConfiguration", cc]` -> `["UIConfiguration", cc]`, all `staleTime: Infinity`.
- Resource pages: `useResourceUIConfiguration(resourceCountryCode)` (`hooks/useUIConfiguration.ts`) — uses resource country, else user country; never fall back to another country on error. Multi-country: `useAvailableUIConfigurations(user)`.
- Response `{ forms: GenericForm[] }`. Static forms in `GenericForm.data.ts` are dev reference only.
- Init: `useFormInitialization(form)` -> `setInitalSectionsAreasFields` -> flatten -> `mapFieldToFieldMapping` -> `getInitialFieldValues` + `getMandatoryFields`.

## Field Metadata (`Field/GenericField.types.ts`)

| Key                                     | Meaning                                                                                      |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `type`                                  | text, email, tel, price, number, button, radiogroup, checkbox, datepicker, dropdown, upload, textarea, autocomplete |
| `attributeMapping`                      | API dot path for `mapValuesToAPI` (`diagnostic.materials#.partNumber`)                       |
| `subtype`                               | Behavior flag: `diagnosticPosition`, `diagnosticPartNumber`, `diagnosticFaultCode`, `diagnostic*` price subtypes, `diagnosticSummary*Material` |
| `onValueChange` / `onBlur`              | Action name looked up in `GenericFormContext.actionCallbacks` (e.g. `onRecalculatePrices`)   |
| `autoFillFields`                        | Siblings filled from selected autocomplete option                                            |
| `sameDataFieldAs`                       | Copy value to target when source hides                                                       |
| `dependentFields` + `dependFieldCondition` | Visibility; `fieldValue: "-"` = any non-empty; AND / OR                                   |
| `requiredDependentFields`               | Conditional required (`byValueOr`, `byValueAnd`, `allEmpty`, messages)                       |
| `optionsEndpoint`                       | `{ url, method, queryParams }`; params resolved from form values                             |
| `hiddenForStatuses`, `permissions`, `isTab`, `isSubArea`, `isMultiple` | Visibility / layout                                             |
| `fieldMapping`                          | Computed: `{ originalName, map, parentMap, prefixes, nameStartsWith }`; not in config        |

## Rules

- Build `fieldMapping` before using fields; compare by `fieldMapping.originalName`, row siblings by `fieldMapping.nameStartsWith`.
- API <-> form: `convertAPIDataToFormValues` / `mapValuesToAPI` only.
- Custom areas: `Area/CustomAreasMapper.tsx` (`getCustomArea`) matches by `area.name.includes(...)`, first match wins, so specific names go first: accessory, claimDocumentList, documentList, claimNotesList, notesList, claimArchivedSpareParts, claimSpareParts, diagnosticsSpareParts, claimDiagnosticsSummary, diagnosticsSummary, archivedSpareParts, AscReimbursementArea. Unknown name -> default `GenericArea`.
- Actions: `GenericAction` metadata `{ onAction, mode, dependency: { showAction, enableAction }, mandatoryFields }`; enable callbacks (`enableValidate`, `arePricesValidated`, ...) also come from `actionCallbacks`.
