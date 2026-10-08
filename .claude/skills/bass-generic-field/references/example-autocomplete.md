# Example: Spare Part Number Autocomplete

Source: `src/components/generics/Field/GenericField.tsx` (`commitSparePart`, autocomplete branch) and `src/components/ui/AutoComplete/AutoComplete.tsx`. Read those by symbol; this file is a map, not a copy.

## Metadata

```json
{
  "name": "sparePartNumber",
  "type": "autocomplete",
  "subtype": "diagnosticPartNumber",
  "autoFillFields": ["description", "unitPrice"],
  "onBlur": "onRecalculatePrices"
}
```

## Sequence

1. `onChange` (typing): sets the value only and marks the part unresolved in `sparePartNotBelongsToTool` (except `SPARE_PARTS_EXCHANGE`). No field action.
2. Empty value: `handleResetAutoCompleteFields` clears the row. No field action until a part is committed.
3. Commit = option click (option buttons keep input focus on mousedown, so no blur fires first) or blur (exact normalized part-number match preferred, else first suggestion; no match -> `sparePartNumberNotFound`).
4. `onSelect(option, { isUnchanged })` -> `commitSparePart`:
   - `handleAutoCompleteSelect(option, field, setFieldValue, allFields)` fills `autoFillFields`.
   - `validateForm()`.
   - `getSparePartCompatibilityMessage(...)` non-empty -> touch field, stop.
   - `isUnchanged` (same part via `isSamePartNumber`) -> stop.
   - `waitForFormCommit()` -> `invokeFieldAction(onValueChange)` -> `invokeFieldAction(onBlur)`.
5. `onRecalculatePrices` (JobOverview) skips rows without a saved `materialId`.

## Validation

- `autocompleteValidation` ref (page-owned `useRef`, passed through `GenericFormContext`) marks not-found values; `formValidation.tsx` turns `false` into `bareToolNumberNotFound` / `toolModelNameNotFound` / `sparePartNumberNotFound`.

## Tests

`GenericField.test.tsx` (spare part commit, unchanged part, not-belongs), `AutoComplete.test.tsx` (blur match, mousedown focus).
