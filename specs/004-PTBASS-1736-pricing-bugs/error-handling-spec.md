# Feature: Diagnostics spare parts error handling

The system must gracefully handle edge cases during price calculation, part number changes, and
validation to prevent data loss and maintain form consistency.

## Background
  Given the user is viewing JobOverview diagnostics tab
  And spare part rows are present

## Scenario: Part number autocomplete failure does not block manual entry
  Given the autocomplete API is unavailable
  When the technician types a part number manually
  And presses Tab to move to the next field
  Then the manually-typed part number is accepted
  And the row remains editable
  And no error modal blocks the user

## Scenario: Validation API failure preserves user-entered data
  Given a technician has edited prices in multiple spare part rows
  When the technician triggers validation
  And the validation API returns a 500 error
  Then the user's manually-entered prices remain intact
  And the arePricesValidated flag remains false
  And an error message is displayed to the user

## Scenario: Validation API timeout preserves user-entered data
  Given a technician has edited prices in multiple spare part rows
  When the technician triggers validation
  And the validation API request times out
  Then the user's manually-entered prices remain intact
  And the arePricesValidated flag remains false
  And an error message notifies the user of the timeout

## Scenario: Archived material API error does not prevent part number change
  Given a validated spare part row with part number "AAA"
  When the technician changes the part number to "BBB"
  And the archivedMaterials sync to the backend fails
  Then the old material is archived in the local state
  And the new material is created with the new part number
  And the user is not blocked from proceeding

## Scenario: Missing tax value defaults to zero instead of causing calculation error
  Given the API returns a material with no tax field
  When the material is loaded into the form
  Then the tax field is set to 0
  And price calculations proceed without error
  And the tax amount is calculated as 0

## Scenario: Missing discount value defaults to zero instead of causing calculation error
  Given the API returns a material with no discount field
  When the material is loaded into the form
  Then the discount field is set to 0
  And the discount amount is calculated as 0
  And price calculations proceed without error

## Scenario: Corrupted suggestedNetPrice does not crash price calculator
  Given the API returns a material with suggestedNetPrice as null
  When the price calculation logic runs
  Then suggestedNetPrice is treated as 0
  And the calculation proceeds without throwing an error
  And fresh suggestedNetPrice is computed from quantity × unitPrice

## Scenario: Missing materialId does not prevent validation
  Given a spare part row has no materialId (new row added by user)
  When the technician enters part number and quantity
  And triggers validation
  Then the validation request includes the row
  And the backend assigns a new materialId
  And the row is updated with the returned materialId

## Scenario: Duplicate part number in multiple rows does not block validation
  Given two spare part rows have the same part number "1234567890"
  And both rows have type "SP"
  When the technician triggers validation
  Then both rows are included in the validation request
  And the backend processes both rows independently
  And both rows receive updated prices

## Scenario: Part number change during in-flight validation does not corrupt state
  Given the technician has triggered validation
  And the validation API request is in flight
  When the technician changes the part number of a row before the response arrives
  Then the row is marked as dirty when the response arrives
  And the row is excluded from the price-validated state
  And arePricesValidated is set to false

## Scenario: Rapid part number changes preserve the final value
  Given a spare part row has part number "AAA"
  When the technician changes the part number to "BBB"
  And immediately changes it again to "CCC" before state updates
  Then the final part number is "CCC"
  And only one archived material "AAA" is created
  And the new material has part number "CCC"

## Scenario: Empty part number does not trigger autocomplete error
  Given a spare part row has an empty part number field
  When the technician focuses the field and then blurs without typing
  Then no autocomplete API call is triggered
  And no error is logged
  And the field remains empty

## Scenario: Non-numeric input in price field is rejected
  Given a technician focuses the unit price field
  When the technician types "ABC"
  Then the field rejects the alphabetic characters
  And the field value remains empty or at the previous numeric value

## Scenario: Infinity or NaN in price calculation is prevented
  Given a technician enters a unit price of 100
  And the discount is 100%
  When the price calculator computes the gross amount
  Then the calculation does not produce Infinity or NaN
  And the gross amount is set to 0

## Scenario: Division by zero in reverse discount calculation is prevented
  Given the discount is 100%
  When the calculator attempts to compute gross from net
  Then no division by zero occurs
  And the gross amount is set to 0

## Scenario: Formik reinitialization during active editing preserves unsaved changes
  Given a technician is typing in the unit price field
  And the form is reinitializing due to an API sync
  When the reinitialization completes
  Then the user's in-progress edit is not overwritten
  And the field retains the user's partial input

## Scenario: isResyncingRef flag prevents dirty-marking during API reload
  Given the validation API has returned updated prices
  And the isResyncingRef flag is true
  When Formik reinitializes with the new prices
  Then the markRowDirty callback is not invoked
  And arePricesValidated remains true
  And the user sees the validated prices

## Scenario: isValidating flag prevents dirty-marking during validation
  Given validation is in progress
  And the isValidating flag is true
  When a row's price fields update due to validation logic
  Then the markRowDirty callback is not invoked
  And the row is not incorrectly marked as dirty
