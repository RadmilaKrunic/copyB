---
name: bass-form-validation
description: "Validation pipeline: useFormValidation, useActionWithValidation, mandatory/dependent fields, autocomplete not-found errors."
---

# Form Validation

## Pieces

- `components/generics/Form/useFormValidation.ts` -> `{ validate, validateByAction, startValidation, stopValidation, validationState, setCurrentAction }`. Inputs: `allFields`, `mandatoryFieldsMap`, `autocompleteValidationRef?`, `sparePartNotBelongsToToolRef?`.
- `components/generics/Form/formValidation.tsx` -> `useValidator`, `getVisibleFieldsWithErrors`.
- `hooks/useActionWithValidation.ts` -> standard action gate used by JobOverview, ClaimOverview, ClientOverview, ASC & Employee pages.
- `utils/scrollToError.ts` -> `scrollToFirstError`.

## Pipeline (`handleActionWithValidation(actionName, values, helpers, onSuccess)`)

1. `setCurrentAction(actionName)` + `startValidation(actionName)`.
2. `validateByAction(actionName, values)` (mandatory list = `mandatoryFieldsMap[action].fieldList`).
3. `getVisibleFieldsWithErrors(allFields, errors, values)` — hidden fields never block.
4. Visible errors -> `setErrors`, `setTouched`, `scrollToFirstError`, stop.
5. Else `stopValidation()` -> `onSuccess()` (mutation).

New action pages use `useActionWithValidation`; do not hand-roll the pipeline.

## Rules

- Mandatory & `requiredDependentFields` resolve through `fieldMapping.originalName` (indexed names differ per row/section).
- `resolveIsRequired(field, values)`: `byValueAnd` all match OR `byValueOr` any match; none configured -> `field.isRequired`.
- Autocomplete not-found: bare tool / tool model / spare part number fields with `autocompleteValidationRef[name] === false` -> `bareToolNumberNotFound` / `toolModelNameNotFound` / `sparePartNumberNotFound`. Error survives re-validation until a part resolves.
- Spare part not-belongs-to-tool: `sparePartNotBelongsToToolRef`; typing marks unresolved (except `SPARE_PARTS_EXCHANGE`).
- Keep `autocompleteValidationRef` a stable `useRef` owned by the page; pass via `GenericFormContext.autocompleteValidation`.
- Serial number check on blur (`onBlurActions` -> `getSerialNumberErrorKey`).
