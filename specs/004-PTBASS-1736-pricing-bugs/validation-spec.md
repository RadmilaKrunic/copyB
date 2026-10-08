# Feature: Diagnostics spare parts validation rules

Price field inputs must correctly accept and preserve user-entered values, and the system must
prevent invalid state transitions during validation and price calculation.

## Background
  Given the user is viewing JobOverview diagnostics tab
  And spare part rows are present

## Scenario: Price field accepts empty string without triggering recalculation
  Given a technician focuses the unit price field showing "100"
  When the technician selects all text and presses backspace
  Then the field displays an empty string
  And no price recalculation is triggered
  And the field is ready for new input

## Scenario: Price field accepts partial numeric entry without recalculation
  Given a technician focuses an empty discount field
  When the technician types "1" and pauses
  Then the field displays "1"
  And no recalculation is triggered until the user completes the entry

## Scenario: Recalculation skipped when resyncing from API
  Given diagnostics data is being resynced from the API after validation
  And the isResyncingRef flag is true
  When price field values are updated by Formik reinitialization
  Then no price recalculation is triggered
  And the onUserEdit callback is not invoked
  And arePricesValidated flag remains true

## Scenario: Recalculation triggers only after user completes input
  Given a technician has typed "35" in the unit price field
  When the technician presses Tab to move to the next field
  Then price recalculation triggers
  And dependent fields are updated

## Scenario: Negative price values are clamped to zero
  Given a technician focuses the unit price field
  When the technician enters "-50"
  Then the field value is clamped to 0
  And dependent fields are recalculated with 0 as the unit price

## Scenario: Total amount cannot exceed gross amount in gross mode
  Given discount base is "GROSS_PRICE"
  And a spare part row has gross amount 200
  When the technician enters a total amount of 250
  Then the total amount is clamped to 200
  And the system prevents total from exceeding gross

## Scenario: Net amount cannot exceed suggested net price in net mode
  Given discount base is "NET_PRICE"
  And a spare part row has suggested net price 150
  When the technician enters a net amount of 180
  Then the net amount is clamped to 150
  And the system prevents net from exceeding suggested net

## Scenario: Concurrent price field edits preserve all changes
  Given a technician is editing the quantity field
  And a recalculation is in progress
  When the technician edits the discount field before the first recalculation completes
  Then both field changes are queued and processed sequentially
  And no changes are lost

## Scenario: Recalculation lock prevents overlapping calculations
  Given the isCalculatingRef flag is true
  And a price recalculation is in progress
  When a second field change event fires
  Then the second recalculation is deferred
  And the system waits for the first calculation to complete before starting the second

## Scenario: SuggestedNetPrice recomputed on quantity or unitPrice change
  Given a spare part row has quantity 2 and unit price 50
  And the API returned a stale suggestedNetPrice of 80
  When the technician changes quantity to 3
  Then suggestedNetPrice is recomputed as 150 (3 × 50)
  And the stale API value is overwritten

## Scenario: SuggestedNetPrice recomputed on unitPrice change
  Given a spare part row has quantity 4 and unit price 25
  And the API returned a stale suggestedNetPrice of 90
  When the technician changes unit price to 30
  Then suggestedNetPrice is recomputed as 120 (4 × 30)
  And the fresh calculation replaces the stale value

## Scenario: Stale prices trigger recalculation on initial load
  Given the API returns a material with quantity 5, unit price 20, and suggestedNetPrice 80
  And roundToTwo(5 × 20) does not equal roundToTwo(80)
  When the material is loaded into the form
  Then an initial recalculation is triggered
  And suggestedNetPrice is corrected to 100
  And gross and total amounts are recalculated

## Scenario: Missing prices trigger recalculation on initial load
  Given the API returns a material with unit price 50 and tax 10
  And gross amount and total amount are 0
  When the material is loaded into the form
  Then an initial recalculation is triggered
  And gross amount and total amount are computed from unit price and tax

## Scenario: Manual price flag prevents recalculation overwrite
  Given a spare part row has isPriceSetManually flag true
  And the row has net amount 120 and total amount 140
  When the backend updates unit price and tax
  And the recalculation logic runs
  Then the manually-set net amount 120 is preserved
  And the manually-set total amount 140 is preserved

## Scenario: Validation blocked while validation API is in flight
  Given the technician has triggered validation
  And the validation API request is pending
  When the technician clicks the validate button again
  Then the second validation request is blocked
  And the system waits for the first request to complete

## Scenario: Row status changes to pending after part number edit
  Given a validated spare part row has status "APPROVED"
  And the row has part number "AAA"
  When the technician changes the part number to "BBB"
  Then the row status changes to "PENDING"
  And the isValidated flag changes to false

## Scenario: Discount amount hidden field is cleared on type change
  Given a spare part row has type "CHARGEABLE" with discount 15 and discount amount 30
  When the technician changes the type to "WARRANTY"
  Then the discount field is reset to 0
  And the discount amount hidden field is reset to 0
  And no stale discount amount is sent to the API

## Scenario: Empty field coercion preserves previous value in calculation context
  Given a technician clears the unit price field
  And the raw field value is an empty string
  When the change detection logic runs
  Then the previous unit price value is preserved in prevValuesRef
  And no recalculation is triggered
  And the field remains ready for new input
