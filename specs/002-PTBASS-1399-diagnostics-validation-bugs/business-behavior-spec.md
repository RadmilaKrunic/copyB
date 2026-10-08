# Feature: Diagnostics Spare Parts Validation — Core Business Behavior

A service centre user manages spare parts rows in the diagnostics tab, assigns types and prices,
and clicks Validate to confirm pricing with the system. All price fields and row inputs must be
locked while validation is in progress, and all calculated values must remain stable and correct
after validation completes — across both NET_PRICE and GROSS_PRICE discount modes.

## Background

Given a job is open in the Job Overview on the diagnostics tab
And the country configuration specifies a discount mode (NET_PRICE or GROSS_PRICE)
And the user has permission to edit diagnostics

---

## Scenario: Validate button is always clickable exactly once per dirty state

Given the diagnostics tab has at least one spare parts row with a unit price entered
And no validation is currently in progress
When the user clicks the Validate button
Then the system submits the validation request immediately without requiring a second click

---

## Scenario: All diagnostic inputs are locked while validation is in progress

Given the diagnostics tab has one or more spare parts rows
When the user clicks the Validate button
Then all spare parts row inputs become read-only until the validation response is received
And the Validate button itself is disabled
And no field in any spare parts row can be edited while validation is pending

---

## Scenario: Row inputs are unlocked after successful validation

Given the user clicked the Validate button
And the validation request completed successfully
Then all spare parts row inputs become editable again
And the Validate button returns to its normal enabled state

---

## Scenario: Row inputs are unlocked after validation fails

Given the user clicked the Validate button
And the validation request returned an error
Then all spare parts row inputs become editable again
And an error message is shown at the top of the page

---

## Scenario: Discount stays correct after validating a COMMERCIAL_GOODWILL row once

Given a spare parts row has type COMMERCIAL_GOODWILL
And the user has set a specific discount percentage
When the user clicks Validate and validation succeeds
Then the discount on that row remains exactly the value that was set before validation
And the net amount reflects the validated price without reverting to the original unit price

---

## Scenario: Discount remains stable after repeated validations of a COMMERCIAL_GOODWILL row

Given a spare parts row has type COMMERCIAL_GOODWILL
And the user has validated the row at least twice
When the user clicks Validate a third time and validation succeeds
Then the discount percentage is the same value it held after the first validation
And the net amount does not drift toward the original un-discounted price

---

## Scenario: Discount does not spontaneously reach 100% after validation

Given a spare parts row has a unit price greater than zero
And the row has tax applied
When the user clicks Validate and validation succeeds
Then the discount percentage is between 0 and 99 inclusive
And the net amount is greater than zero

---

## Scenario: Switching row type from COMMERCIAL_GOODWILL to CHARGEABLE clears the discount

Given a spare parts row has type COMMERCIAL_GOODWILL
And a non-zero discount is currently applied
When the user changes the row type to CHARGEABLE
Then the discount percentage resets to zero
And the hidden discount fields used for API submission are also reset to zero
And the net amount equals the suggested net price

---

## Scenario: Switching row type from CHARGEABLE to COMMERCIAL_GOODWILL clears any prior CHARGEABLE discount

Given a spare parts row has type CHARGEABLE
And a non-zero discount was applied
When the user changes the row type to COMMERCIAL_GOODWILL
Then the discount percentage resets to zero
And the hidden discount amount field is also reset to zero

---

## Scenario: Summary shows a total net amount after successful validation

Given the diagnostics tab contains one or more validated spare parts rows
And all rows have a positive unit price
When the user views the summary area
Then the total net amount field displays a value greater than zero
And the total net amount is the sum of the net amounts of all individual rows

---

## Scenario: Tax value is preserved for all rows when spare parts are added one by one with validation after each

Given the diagnostics tab is empty
When the user adds the first spare part row with a unit price and validates
And the user adds a second spare part row with a unit price and validates
And the user adds a third spare part row with a unit price and validates
Then the tax value on the first row still matches the tax returned for that row after its validation
And the tax value on the second row still matches the tax returned for that row after its validation
And the tax value on the third row reflects the tax returned after the most recent validation

---

## Scenario: Entered price value is preserved exactly after validation in NET_PRICE mode

Given the country discount mode is NET_PRICE
And the user enters a specific net amount for a spare parts row (for example 2500)
When the user clicks Validate and validation succeeds
Then the net amount on the row equals the value the user entered (2500)
And the value does not change by a rounding artifact (for example it does not become 2499.91)

---

## Scenario: Entered price value is preserved exactly after validation in GROSS_PRICE mode

Given the country discount mode is GROSS_PRICE
And the user enters a specific total amount for a spare parts row
When the user clicks Validate and validation succeeds
Then the total amount on the row equals the value the user entered
And no rounding artifact alters the displayed value

---

## Scenario: No visible price flicker occurs when validation completes

Given the user has filled in a spare parts row with a unit price
When the user clicks Validate and validation succeeds
Then each price field in the row transitions smoothly from its pre-validation value to its post-validation value
And no field briefly displays an intermediate incorrect value during the transition

---

## Scenario: isPriceSetManually flag is respected when the API returns a price after validation

Given a spare parts row where the user has manually overridden the net amount
And the isPriceSetManually flag is set for that row
When the user clicks Validate and validation succeeds
And the API returns a suggested price for that row
Then the row keeps the manually set net amount
And the discount reflects the difference between the suggested net price and the manually set net amount
