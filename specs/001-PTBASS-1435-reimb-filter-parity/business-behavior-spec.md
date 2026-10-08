# Feature: Reimbursement date-range filter parity across ASC List and Reimbursement List tabs

Both tabs under /reimbursement expose an identical date-range filtering contract.
When UIConfiguration provides a reimbursementFilters form, a date picker is displayed defaulting
to the current month range. When UIConfiguration has no reimbursementFilters form, the date picker
is hidden, the "Last Month" chip is selected by default, and API calls default to the last-month range.

## Background

Given I am an authenticated Bosch user with the REIMBURSEMENT.CAN_VIEW permission
And I navigate to the /reimbursement page

---

## Scenario: ASC List tab defaults the date picker to the current month on first visit when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And no date range has been stored in the session for this tab
When the tab finishes loading
Then the date picker shows a range from the first day of the current month to today
And the service-center list is loaded from the server using that date range

## Scenario: Reimbursement List tab defaults the date picker to the current month on first visit when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And no date range has been stored in the session for this tab
When the tab finishes loading
Then the date picker shows a range from the first day of the current month to today
And the reimbursements list is loaded from the server using that date range

## Scenario: ASC List tab calls the API immediately on mount with the default date range when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And no date range has been stored in the session for this tab
When the tab mounts
Then exactly one request is sent to the service-center list endpoint carrying the first day of the current month as fromDate and today as endDate
And no additional requests are issued during the same render cycle

## Scenario: Reimbursement List tab calls the API immediately on mount with the default date range when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And no date range has been stored in the session for this tab
When the tab mounts
Then exactly one request is sent to the reimbursements endpoint carrying the first day of the current month as fromDate and today as endDate
And no additional requests are issued during the same render cycle

## Scenario: "Last Month" chip sets the date picker to the previous month on the ASC List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And the date picker currently shows the current-month default range
When I click the "Last Month" chip
Then the chip becomes selected
And the date picker updates to show first day → last day of the previous calendar month
And a request is sent to the service-center list endpoint using that previous-month range

## Scenario: "Last Month" chip sets the date picker to the previous month on the Reimbursement List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And the date picker currently shows the current-month default range
When I click the "Last Month" chip
Then the chip becomes selected
And the date picker updates to show first day → last day of the previous calendar month
And a request is sent to the reimbursements endpoint using that previous-month range

## Scenario: Deselecting the "Last Month" chip reverts to the current-month default on the ASC List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And the "Last Month" chip is selected
When I click the "Last Month" chip again
Then the chip becomes deselected
And the date picker reverts to the first day of the current month through today
And a request is sent to the service-center list endpoint using the reverted range

## Scenario: Deselecting the "Last Month" chip reverts to the current-month default on the Reimbursement List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And the "Last Month" chip is selected
When I click the "Last Month" chip again
Then the chip becomes deselected
And the date picker reverts to the first day of the current month through today
And a request is sent to the reimbursements endpoint using the reverted range

## Scenario: Manually picking a new date range on the ASC List tab triggers a server fetch when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And the date picker shows the current-month default range
When I select a custom start date and end date using the date picker
Then the date picker reflects the chosen range
And a request is sent to the service-center list endpoint with the chosen fromDate and endDate
And the "Last Month" chip is deselected

## Scenario: Manually picking a new date range on the Reimbursement List tab triggers a server fetch when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And the date picker shows the current-month default range
When I select a custom start date and end date using the date picker
Then the date picker reflects the chosen range
And a request is sent to the reimbursements endpoint with the chosen fromDate and endDate
And the "Last Month" chip is deselected

## Scenario: Manually selecting the last-month range in the picker synchronises the chip on the ASC List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And the "Last Month" chip is not selected
When I manually set the date picker to the first day → last day of the previous calendar month
Then the "Last Month" chip becomes selected
And a request is sent to the service-center list endpoint using that range

## Scenario: Manually selecting the last-month range in the picker synchronises the chip on the Reimbursement List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And the "Last Month" chip is not selected
When I manually set the date picker to the first day → last day of the previous calendar month
Then the "Last Month" chip becomes selected
And a request is sent to the reimbursements endpoint using that range

## Scenario: Clearing the date picker on the ASC List tab reverts to the default range when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And the date picker shows a previously chosen date range
When I clear the date picker
Then the date picker resets to the first day of the current month through today
And a request is sent to the service-center list endpoint using that default range

## Scenario: Clearing the date picker on the Reimbursement List tab reverts to the default range when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And the date picker shows a previously chosen date range
When I clear the date picker
Then the date picker resets to the first day of the current month through today
And a request is sent to the reimbursements endpoint using that default range

## Scenario: Filter state persists when switching away from and back to the ASC List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And I have selected the "Last Month" chip
When I switch to the "Reimbursement List" tab and then back to "ASC List"
Then the "Last Month" chip remains selected
And the date picker still shows the previous-month range
And no redundant network request is triggered on the return visit if the date range has not changed

## Scenario: Filter state persists when switching away from and back to the Reimbursement List tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And I have selected a custom date range
When I switch to the "ASC List" tab and then back to "Reimbursement List"
Then the date picker still shows the custom range I selected
And no redundant network request is triggered on the return visit if the date range has not changed

## Scenario: ASC List tab uses the UIConfiguration reimbursementFilters form when available

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
When the tab loads
Then the date picker is rendered using the field definition from the reimbursementFilters form
And the date picker still defaults to the current-month range

## Scenario: Reimbursement List tab uses a standalone DatePicker when UIConfiguration reimbursementFilters form is available

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
When the tab loads
Then the date picker is rendered as a standalone DatePicker component
And the date picker still defaults to the current-month range

## Scenario: ASC List tab hides the date picker when UIConfiguration has no reimbursementFilters form

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
When the tab loads
Then the date picker is not rendered
And the "Last Month" chip is visible

## Scenario: Reimbursement List tab hides the date picker when UIConfiguration has no reimbursementFilters form

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
When the tab loads
Then the date picker is not rendered
And the "Last Month" chip is visible

## Scenario: ASC List tab defaults to "Last Month" chip selected and last month range when UIConfiguration has no reimbursementFilters form

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And no chip state has been stored in the session for this tab
When the tab mounts
Then the "Last Month" chip is selected by default
And a request is sent to the service-center list endpoint carrying the first day of the previous month as fromDate and the last day of the previous month as endDate

## Scenario: Reimbursement List tab defaults to "Last Month" chip selected and last month range when UIConfiguration has no reimbursementFilters form

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And no chip state has been stored in the session for this tab
When the tab mounts
Then the "Last Month" chip is selected by default
And a request is sent to the reimbursements endpoint carrying the first day of the previous month as fromDate and the last day of the previous month as endDate

## Scenario: Deselecting the "Last Month" chip fetches all data with no date params on the ASC List tab when UIConfiguration has no reimbursementFilters form

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And the "Last Month" chip is selected
When I click the "Last Month" chip to deselect it
Then the chip becomes deselected
And a request is sent to the service-center list endpoint with no fromDate or endDate query parameters

## Scenario: Deselecting the "Last Month" chip fetches all data with no date params on the Reimbursement List tab when UIConfiguration has no reimbursementFilters form

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And the "Last Month" chip is selected
When I click the "Last Month" chip to deselect it
Then the chip becomes deselected
And a request is sent to the reimbursements endpoint with no fromDate or endDate query parameters

## Scenario: Re-selecting the "Last Month" chip fetches last month data on the ASC List tab when UIConfiguration has no reimbursementFilters form

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And the "Last Month" chip is deselected
When I click the "Last Month" chip to select it
Then the chip becomes selected
And a request is sent to the service-center list endpoint carrying the first day of the previous month as fromDate and the last day of the previous month as endDate

## Scenario: Re-selecting the "Last Month" chip fetches last month data on the Reimbursement List tab when UIConfiguration has no reimbursementFilters form

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And the "Last Month" chip is deselected
When I click the "Last Month" chip to select it
Then the chip becomes selected
And a request is sent to the reimbursements endpoint carrying the first day of the previous month as fromDate and the last day of the previous month as endDate

## Scenario: Filter state persists when switching away from and back to the ASC List tab when UIConfiguration has no reimbursementFilters form

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And the "Last Month" chip is selected
When I switch to the "Reimbursement List" tab and then back to "ASC List"
Then the "Last Month" chip remains selected
And no redundant network request is triggered on the return visit if the chip state has not changed

## Scenario: Filter state persists when switching away from and back to the Reimbursement List tab when UIConfiguration has no reimbursementFilters form

Given the UIConfiguration API has not returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And the "Last Month" chip is deselected
When I switch to the "ASC List" tab and then back to "Reimbursement List"
Then the "Last Month" chip remains deselected
And no redundant network request is triggered on the return visit if the chip state has not changed

## Scenario: Partial date entry (start date only) does not trigger an API call on either tab when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "ASC List" tab is selected
And the date picker currently shows the current-month default range
When I enter only a start date in the date picker without selecting an end date
Then no new request is sent to the service-center list endpoint until both start and end dates are selected

## Scenario: Partial date entry (start date only) on the Reimbursement List tab does not trigger an API call when UIConfiguration has reimbursementFilters

Given the UIConfiguration API has returned a form named "reimbursementFilters" for my country
And the "Reimbursement List" tab is selected
And the date picker currently shows the current-month default range
When I enter only a start date in the date picker without selecting an end date
Then no new request is sent to the reimbursements endpoint until both start and end dates are selected

## Scenario: Date range filtering for reimbursements is performed server-side, not client-side

Given the "Reimbursement List" tab is selected
When the list renders
Then the reimbursements displayed are those returned by the server for the current date range (or all data if no date params)
And the application does not additionally filter the returned reimbursements by date on the client

## Scenario: Service-center list search field narrows results within the current date-filtered set

Given the "ASC List" tab is selected
And service centers have been loaded for the current date range
When I type a search term in the search field
Then only service centers whose name, customer code, city, or other visible attributes match the search term are shown
And the date range filter remains unchanged

## Scenario: Reimbursement list search field narrows results within the current date-filtered set

Given the "Reimbursement List" tab is selected
And reimbursements have been loaded for the current date range
When I type a search term in the search field
Then only reimbursements whose reimbursementId, ascName, status, or period match the search term are shown
And the date range filter remains unchanged
