# Feature: Diagnostics Spare Parts Validation — Error Handling and Race Conditions

Edge cases, concurrency problems, and error paths in the validation flow for diagnostics spare
parts. All scenarios apply to both NET_PRICE and GROSS_PRICE discount modes unless stated.

## Background

Given a job is open in the Job Overview on the diagnostics tab
And the country configuration specifies a discount mode (NET_PRICE or GROSS_PRICE)
And the user has permission to edit diagnostics

---

## Scenario: Changing row type while validation is in progress does not corrupt row values

Given the user clicked the Validate button and the validation request is still in flight
When the user attempts to change the type field of a spare parts row
Then the type field is not editable because all row inputs are locked during validation
And when the validation response arrives the row values match the validated response
And no stale pre-change values are written back into the row after validation completes

---

## Scenario: Changing row price while validation is in progress does not corrupt row values

Given the user clicked the Validate button and the validation request is still in flight
When the user attempts to change a price field on a spare parts row
Then the price field is not editable because all row inputs are locked during validation
And when the validation response arrives the row values reflect the server-validated prices
And no intermediate user-typed value overwrites the validated result

---

## Scenario: Validate button remains disabled until the in-flight validation response arrives

Given the user clicked the Validate button and the validation request is in flight
When the user looks at the Validate button
Then the button is disabled
And the button remains disabled until the response is received and processed

---

## Scenario: Price calculation does not trigger during API-driven reinitialization after validation

Given validation has just completed successfully
And the system is reinitializing the form with the validated prices from the API response
When the form fields are updated with the fresh values from the server
Then the price recalculation hook does not interpret these field changes as user input
And markRowDirty is not called during the reinitialization
And the validated status is not reset to unvalidated

---

## Scenario: Validation succeeds after server error on the previous attempt

Given the user clicked Validate and received a server error
And the error message was shown at the top of the page
When the user corrects the issue and clicks Validate again
Then the second validation request is submitted successfully
And the row values are updated with the server response
And the error message is no longer shown

---

## Scenario: Summary total net amount is non-zero even when a row has zero tax

Given the diagnostics tab contains at least one spare parts row with a unit price greater than zero
And at least one row has a zero tax rate
When the user views the summary area
Then the total net amount in the summary is the correct sum of all row net amounts
And a zero tax rate on one row does not cause the total net amount to be zero

---

## Scenario: Archived deletions pending count is reset after successful validation

Given the user has deleted a spare parts row (moving it to the archived section)
And no validation has been clicked since the deletion
When the user clicks Validate and validation succeeds
Then the pending archived deletions counter is reset to zero
And the Validate button reflects only current row changes rather than the already-processed deletion

---

## Scenario: Validate button is enabled after user deletes a spare parts row

Given all spare parts rows were validated before the deletion
And the prices were marked as validated
When the user deletes a spare parts row
Then the Validate button becomes enabled
And the validated prices are hidden until the user validates again

---

## Scenario: Row restored from archive requires revalidation

Given a spare parts row was previously archived (deleted)
When the user restores the row from the archived section
Then the restored row is marked as unvalidated
And the Validate button becomes enabled
And the summary totals are updated to include the restored row's values

---

## Scenario: Adding a new spare parts row while other rows are already validated requires revalidation

Given all existing spare parts rows have been successfully validated
When the user adds a new spare parts row
Then the validated status of the entire diagnostics tab is reset
And the Validate button becomes enabled
And the summary area does not show validated totals until the user validates again

---

## Scenario: Validation error response shows the relevant error keys and does not mark rows as validated

Given the user clicked the Validate button
And the server returns an error response with error message keys
When the error response is processed
Then an error message containing the relevant key identifiers is shown at the top of the page
And the spare parts rows are not marked as validated
And the Validate button remains enabled so the user can correct and retry

---

## Scenario: API order simulation failure shows a generic error when no specific keys are present

Given the user clicked the Validate button
And the server returns an error response with no identifiable error message keys
When the error response is processed
Then a generic order simulation failure message is shown at the top of the page
And the user can immediately click Validate again to retry
