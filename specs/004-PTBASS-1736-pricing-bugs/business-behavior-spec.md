# Feature: Diagnostics spare parts pricing behavior

Technicians must be able to edit spare part prices and quantities in the diagnostics tab without
encountering unresponsive inputs or having their manually-entered values unexpectedly overwritten
by automatic recalculations.

## Background
  Given the user is viewing JobOverview diagnostics tab
  And spare part rows are present in the diagnostics spare parts area
  And price calculation mode is configured for the current country

## Scenario: User-entered price values remain intact after validation
  Given a technician has entered a custom net amount in a spare part row
  And the row has not been validated yet
  When the technician validates the diagnostics prices
  And the validation API returns updated prices
  Then the user's manually-entered net amount is preserved
  And the row does not revert to the API-calculated price

## Scenario: User-entered discount values remain intact after validation
  Given a technician has edited the discount field in a spare part row
  And the row has not been validated yet
  When the technician validates the diagnostics prices
  And the validation API returns updated prices
  Then the user's manually-entered discount is preserved
  And the row does not revert to the API-calculated discount

## Scenario: User-entered total amount remains intact after validation
  Given a technician has edited the total amount field in a spare part row
  And the row has not been validated yet
  When the technician validates the diagnostics prices
  And the validation API returns updated prices
  Then the user's manually-entered total amount is preserved
  And the row does not revert to the API-calculated total

## Scenario: Three-digit price entry registers all digits
  Given a technician focuses a price field in a spare part row
  When the technician types "350" without pausing
  Then the field displays "350"
  And the field does not display "3" or "35"
  And all three keystrokes are captured

## Scenario: Rapid sequential price edits do not lose digits
  Given a technician has edited the unit price field
  And the price calculator is recomputing dependent fields
  When the technician immediately edits the discount field before recalculation completes
  Then both the unit price and discount changes are preserved
  And no digits are lost from either field

## Scenario: Part number change clears stale prices for validated row
  Given a spare part row has been validated with part number "1234567890"
  And the row displays validated prices for the original part number
  When the technician changes the part number to "0987654321"
  Then the old item with part number "1234567890" is archived
  And the new item with part number "0987654321" has no pre-filled prices
  And the row status changes to pending

## Scenario: Part number autocomplete populates fields without manual typing
  Given a spare part row has an empty part number field
  When the technician types "123" in the part number autocomplete
  And the autocomplete dropdown displays matching options
  And the technician selects "1234567890 - Test Part" from the dropdown
  Then the part number field is populated with "1234567890"
  And the description field is auto-filled with "Test Part"
  And no manual typing is required to accept the autocomplete suggestion

## Scenario: Manual part number entry followed by autocomplete selection works
  Given a spare part row has an empty part number field
  When the technician types "456" manually
  And pauses
  And then opens the autocomplete dropdown
  And selects a matching part from the dropdown
  Then the part number field is populated with the selected part number
  And the description field is auto-filled
  And the autocomplete interaction completes successfully

## Scenario: Archived material preserves original prices
  Given a spare part row has been validated with part number "1234567890"
  And the row has validated prices
  When the technician changes the part number to a different value
  Then the archivedMaterials collection contains the original material
  And the archived material retains the original part number "1234567890"
  And the archived material retains the original validated prices

## Scenario: New item after part number change starts with empty prices
  Given a validated spare part row with part number "1234567890"
  And the row has unit price 100 and net amount 90
  When the technician changes the part number to "0987654321"
  Then the materials collection contains a new item with part number "0987654321"
  And the new item has unit price 0
  And the new item has net amount 0
  And the new item has total amount 0

## Scenario: Discount synchronization across price calculation modes
  Given the discount base is "GROSS_PRICE"
  And a spare part row displays a discount field for gross mode
  When the technician enters a discount value of 10
  Then the hidden discount field is updated to 10
  And the sibling net mode discount field is updated to 10
  And all discount representations remain in sync

## Scenario: Discount reset when leaving chargeable type
  Given a spare part row has type "CHARGEABLE"
  And the row has a discount of 15
  And another chargeable row exists with discount 15
  When the technician changes the row type to "WARRANTY"
  Then the row discount is reset to 0
  And the discount amount is reset to 0
  And the warranty row displays 0% discount

## Scenario: Discount preserved when entering chargeable type from other chargeable row
  Given a spare part row has type "WARRANTY"
  And another row exists with type "CHARGEABLE" and discount 20
  When the technician changes the first row type to "CHARGEABLE"
  Then the row discount is set to 20
  And the discount is copied from the existing chargeable row

## Scenario: Discount reset when last chargeable row changes to non-chargeable
  Given a spare part row has type "CHARGEABLE" with discount 25
  And no other rows have type "CHARGEABLE"
  When the technician changes the row type to "COMMERCIAL_GOODWILL"
  Then the row discount is reset to 0
  And no chargeable discount source remains

## Scenario: Validation request reflects archived and new materials correctly
  Given a validated spare part row with part number "AAA" and materialId "m1"
  When the technician changes the part number to "BBB"
  And triggers validation
  Then the validation request payload contains the new item with part number "BBB"
  And the validation request payload does not include materialId "m1" in the active materials
  And the archivedMaterials section of the payload includes the item with part number "AAA"

## Scenario: Prevent duplicate validation when part number unchanged
  Given a validated spare part row with part number "1234567890"
  And the last validated part number is "1234567890"
  When the technician triggers validation
  Then the validation request skips this row
  And no redundant API call is made for the unchanged row

## Scenario: Allow validation after part number change in validated row
  Given a validated spare part row with part number "1234567890"
  When the technician changes the part number to "0987654321"
  And triggers validation
  Then the validation request includes the new part number "0987654321"
  And validation proceeds for the row
